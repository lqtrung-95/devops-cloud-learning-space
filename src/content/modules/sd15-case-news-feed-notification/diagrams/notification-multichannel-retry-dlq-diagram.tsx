"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Channel = "push" | "email" | "sms";
type Scenario = "none" | Channel;

const source = { x: 8, y: 130, width: 110, height: 60, emoji: "📝", label: "Event (outbox)", sublabel: "like/comment/follow" };
const worker = { x: 152, y: 130, width: 132, height: 60, emoji: "⚙️", label: "Notification Worker", sublabel: "lọc preference + dedup key" };
const channelNodes: Record<Channel, { x: number; y: number; emoji: string; label: string }> = {
  push: { x: 328, y: 30, emoji: "📲", label: "Push adapter" },
  email: { x: 328, y: 128, emoji: "✉️", label: "Email adapter" },
  sms: { x: 328, y: 226, emoji: "💬", label: "SMS adapter" },
};
const dlq = { x: 540, y: 128, width: 172, height: 60, emoji: "☠️", label: "DLQ", sublabel: "kèm metadata lỗi, alert" };

const scenarioLabels: Record<Scenario, string> = { none: "Mọi kênh ổn", push: "Push provider lỗi", email: "Email provider lỗi", sms: "SMS provider lỗi" };

function stepsForScenario(scenario: Scenario): DiagramStep[] {
  const failing = scenario === "none" ? null : scenario;
  const failLabel = failing ? channelNodes[failing].label : "";
  return [
    { title: "Nhận & lọc preference", description: "Worker đọc event, tra bảng `user_preferences` xem user bật kênh nào — kênh bị tắt loại ngay, không dispatch." },
    { title: "Dispatch song song", description: "Gửi tới từng adapter còn lại. Mỗi lần gửi kèm `idempotency key = hash(event_id, user_id, channel)`, tra bảng dedup trước khi gửi — nối lại idempotent consumer ở SD07." },
    failing
      ? { title: "Kênh lỗi → retry #1", description: `${failLabel} gọi provider thất bại (timeout/5xx). Retry có backoff + jitter (nối SD11), các kênh khác đã báo thành công.` }
      : { title: "Cả 3 kênh gửi xong", description: "Không có provider nào lỗi ở kịch bản này — cả 3 kênh báo thành công ngay lần gửi đầu." },
    failing
      ? { title: "Retry #2, #3 vẫn lỗi", description: `${failLabel} thử tiếp tối đa 3 lần, mỗi lần backoff tăng dần + jitter để tránh dồn tải vào đúng lúc provider đang phục hồi.` }
      : { title: "Ghi log gửi thành công", description: "Dedup key được đánh dấu đã gửi cho cả 3 kênh — nếu event bị đọc lại (rebalance) sẽ bị bỏ qua, không gửi trùng." },
    failing
      ? { title: "Hết retry → DLQ", description: `Sau 3 lần, ${failLabel} bị đẩy sang DLQ kèm event gốc + lý do lỗi, rồi commit tiếp — các kênh khác không bị ảnh hưởng. Alert on-call; sửa provider xong thì replay DLQ.` }
      : { title: "Không cần DLQ", description: "Không có message nào rơi vào DLQ ở kịch bản này." },
  ];
}

function channelState(channel: Channel, step: number, scenario: Scenario): { tone: DiagramTone; label: string; active: boolean } {
  const isFailing = scenario === channel;
  if (step === 0) return { tone: "slate", label: "chờ dispatch", active: false };
  if (!isFailing) return { tone: "green", label: "✅ gửi xong", active: step === 1 };
  if (step === 1) return { tone: "amber", label: "🔁 đang gửi", active: true };
  if (step === 2) return { tone: "amber", label: "🔁 lỗi, retry #1", active: true };
  if (step === 3) return { tone: "amber", label: "🔁 retry #2/#3", active: true };
  return { tone: "rose", label: "☠️ hết retry → DLQ", active: true };
}

function Pills({ value, onChange }: { value: Scenario; onChange: (next: Scenario) => void }) {
  return (
    <div className="not-prose -mb-4 flex flex-wrap gap-2">
      {(Object.keys(scenarioLabels) as Scenario[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={clsx(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            value === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
          )}
        >
          {scenarioLabels[option]}
        </button>
      ))}
    </div>
  );
}

export function NotificationMultichannelRetryDlqDiagram() {
  const [scenario, setScenario] = useState<Scenario>("email");
  const steps = stepsForScenario(scenario);

  return (
    <div>
      <Pills value={scenario} onChange={setScenario} />
      <StepDiagram key={scenario} title="Dispatch đa kênh: preference, idempotency, retry & DLQ" viewBox="0 0 720 300" steps={steps}>
        {(step) => (
          <>
            <DiagramNode x={source.x} y={source.y} width={source.width} height={source.height} emoji={source.emoji} label={source.label} sublabel={source.sublabel} tone="slate" state={step === 0 ? "active" : "normal"} />
            <DiagramArrow from={[118, 160]} to={[150, 160]} tone="slate" dimmed={step < 0} />
            <DiagramNode x={worker.x} y={worker.y} width={worker.width} height={worker.height} emoji={worker.emoji} label={worker.label} sublabel={worker.sublabel} tone="blue" state={step <= 1 ? "active" : "normal"} />
            {(Object.keys(channelNodes) as Channel[]).map((channel) => {
              const node = channelNodes[channel];
              const info = channelState(channel, step, scenario);
              return (
                <g key={channel}>
                  <DiagramArrow from={[284, 160]} to={[326, node.y + 28]} tone={info.tone} dimmed={step < 1} />
                  <DiagramNode x={node.x} y={node.y} width={148} height={56} emoji={node.emoji} label={node.label} sublabel={info.label} tone={info.tone} state={info.active ? "active" : step === 0 ? "dimmed" : "normal"} />
                </g>
              );
            })}
            <DiagramArrow from={[476, channelNodes[scenario === "none" ? "email" : scenario].y + 28]} to={[538, 158]} tone="rose" dimmed={scenario === "none" || step < 4} />
            <DiagramNode x={dlq.x} y={dlq.y} width={dlq.width} height={dlq.height} emoji={dlq.emoji} label={dlq.label} sublabel={dlq.sublabel} tone="rose" state={scenario !== "none" && step === 4 ? "active" : "dimmed"} />
          </>
        )}
      </StepDiagram>
    </div>
  );
}
