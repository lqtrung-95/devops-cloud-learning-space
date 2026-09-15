"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "no-dlq" | "with-dlq";

interface Frame {
  /** Offset of the message the consumer is working on (index into messages). */
  current: number;
  consumer: string;
  consumerTone: DiagramTone;
  lag: string;
  dlq: string;
  toDlq?: boolean;
}

const messages = ["m1", "m2 ☠️", "m3", "m4"];

const scenarios: Record<Scenario, { button: string; steps: DiagramStep[]; frames: Frame[] }> = {
  "no-dlq": {
    button: "❌ Không có DLQ",
    steps: [
      { title: "m1 OK", description: "Consumer xử lý m1 thành công và commit offset → 1." },
      { title: "m2 lỗi", description: "m2 có payload hỏng (JSON sai schema). Handler `throw`, offset KHÔNG được commit." },
      { title: "Lặp vô hạn", description: "Client retry rồi consumer khởi động lại, đọc lại từ offset đã commit → lại gặp m2 → lại lỗi. Đây là poison message." },
      { title: "Kẹt partition", description: "m3, m4 (hoàn toàn hợp lệ) nằm chờ sau m2. Consumer lag tăng mãi, email của mọi khách trong partition này bị treo." },
    ],
    frames: [
      { current: 0, consumer: "xử lý m1 ✓", consumerTone: "green", lag: "lag 3", dlq: "không có" },
      { current: 1, consumer: "m2 → throw", consumerTone: "rose", lag: "lag 3", dlq: "không có" },
      { current: 1, consumer: "retry m2… lần 57", consumerTone: "rose", lag: "lag 3 → 900", dlq: "không có" },
      { current: 1, consumer: "vẫn kẹt ở m2", consumerTone: "rose", lag: "lag 12.000 🚨", dlq: "không có" },
    ],
  },
  "with-dlq": {
    button: "✅ Retry có giới hạn + DLQ",
    steps: [
      { title: "m1 OK", description: "Consumer xử lý m1 thành công và commit offset → 1." },
      { title: "Phân loại lỗi", description: "m2 lỗi. Lỗi tạm thời (timeout DB, 503) thì đáng retry; lỗi vĩnh viễn (sai schema) thì retry bao nhiêu lần cũng vậy." },
      { title: "Retry có hạn", description: "Retry tối đa 3 lần với exponential backoff + jitter (vd 200 ms, 400 ms, 800 ms). Vẫn lỗi → dừng thử." },
      { title: "Đẩy vào DLQ", description: "Gửi m2 sang topic `orders.dlq` kèm header: lỗi, partition + offset gốc, số lần thử. Sau khi DLQ ack mới commit offset của m2." },
      { title: "Chạy tiếp", description: "m3, m4 được xử lý bình thường, lag về 0. Một message xấu không còn làm kẹt cả partition." },
      { title: "Alert & replay", description: "Alert khi DLQ có message mới. Dev sửa bug/dữ liệu rồi replay từ `orders.dlq` về `orders` — consumer idempotent nên replay an toàn." },
    ],
    frames: [
      { current: 0, consumer: "xử lý m1 ✓", consumerTone: "green", lag: "lag 3", dlq: "trống" },
      { current: 1, consumer: "m2 lỗi: schema", consumerTone: "amber", lag: "lag 3", dlq: "trống" },
      { current: 1, consumer: "retry 3/3 ✗", consumerTone: "amber", lag: "lag 3", dlq: "trống" },
      { current: 1, consumer: "gửi DLQ → commit", consumerTone: "violet", lag: "lag 2", dlq: "m2 + headers", toDlq: true },
      { current: 4, consumer: "xử lý m3, m4 ✓", consumerTone: "green", lag: "lag 0", dlq: "m2 + headers" },
      { current: 4, consumer: "khoẻ", consumerTone: "green", lag: "lag 0", dlq: "🔔 alert · replay" },
    ],
  },
};

export function PoisonMessageDeadLetterQueueDiagram() {
  const [scenario, setScenario] = useState<Scenario>("with-dlq");
  const { steps, frames } = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarios) as Scenario[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarios[option].button}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Poison message: kẹt partition hay tách ra DLQ?" viewBox="0 0 720 300" steps={steps}>
        {(step) => {
          const frame = frames[step];
          return (
            <>
              <DiagramGroupBox x={10} y={20} width={340} height={120} label="topic orders · partition 0" tone="amber">
                {messages.map((message, index) => {
                  const isPoison = index === 1;
                  const handled = index < frame.current || (index === 1 && scenario === "with-dlq" && step >= 3);
                  return (
                    <DiagramNode
                      key={message}
                      x={25 + index * 80}
                      y={55}
                      width={70}
                      height={56}
                      label={message}
                      sublabel={handled ? "đã commit" : index === frame.current ? "đang xử lý" : "chờ"}
                      tone={isPoison ? "rose" : handled ? "green" : "amber"}
                      state={handled ? "dimmed" : index === frame.current ? "active" : "normal"}
                    />
                  );
                })}
              </DiagramGroupBox>

              <DiagramArrow from={[350, 83]} to={[436, 83]} tone={frame.consumerTone} animated />
              <DiagramNode x={440} y={45} width={160} height={80} label="Email consumer" sublabel={frame.consumer} emoji="📧" tone={frame.consumerTone} state="active" />
              <DiagramNode x={620} y={55} width={90} height={60} label="Lag" sublabel={frame.lag} tone={frame.lag.includes("🚨") ? "rose" : "slate"} />

              <DiagramNode
                x={440}
                y={200}
                width={270}
                height={70}
                label="orders.dlq"
                sublabel={frame.dlq}
                emoji="🗄️"
                tone={scenario === "with-dlq" ? "violet" : "slate"}
                state={scenario === "with-dlq" ? (frame.toDlq || step === 5 ? "active" : "normal") : "dimmed"}
                dashed={scenario === "no-dlq"}
              />
              <DiagramArrow from={[520, 128]} to={[520, 196]} tone="violet" dimmed={!frame.toDlq} label="publish + header" />
              {frame.toDlq && <MovingPacket key="to-dlq" path="M 520 128 L 520 200" durationSeconds={1.2} repeat={false} tone="rose" label="m2" />}

              {scenario === "no-dlq" && step >= 2 && (
                <DiagramArrow from={[500, 128]} to={[105, 118]} tone="rose" animated curve={-50} label="đọc lại m2 mãi" />
              )}
              {step === 5 && <DiagramArrow from={[436, 240]} to={[190, 144]} tone="green" curve={40} label="replay sau khi sửa" />}
              <DiagramLabel x={180} y={200} text={scenario === "no-dlq" ? "1 message hỏng chặn cả partition" : "DLQ = kệ hàng thất lạc"} tone={scenario === "no-dlq" ? "rose" : "violet"} bold />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
