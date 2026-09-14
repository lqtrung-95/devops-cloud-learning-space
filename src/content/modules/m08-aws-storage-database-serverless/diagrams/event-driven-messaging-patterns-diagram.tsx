"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Mode = "sqs" | "sns" | "eventbridge";

interface Target {
  label: string;
  sublabel: string;
  receives: boolean;
}

const modes: Record<Mode, { button: string; broker: string; brokerSub: string; emoji: string; tone: DiagramTone; targets: Target[]; facts: string[] }> = {
  sqs: {
    button: "📬 SQS queue",
    broker: "SQS queue",
    brokerSub: "orders-queue",
    emoji: "📬",
    tone: "amber",
    targets: [
      { label: "worker-1", sublabel: "đang xử lý ✓", receives: true },
      { label: "worker-2", sublabel: "chờ message khác", receives: false },
      { label: "worker-3", sublabel: "chờ message khác", receives: false },
    ],
    facts: [
      "Hộp thư chờ: message nằm trong queue tới khi một worker poll và xoá nó",
      "Mỗi message chỉ do một worker xử lý (trong visibility timeout)",
      "Xử lý lỗi quá maxReceiveCount lần → chuyển sang dead-letter queue (DLQ)",
      "Standard: at-least-once, thứ tự best-effort · FIFO: giữ thứ tự theo message group",
    ],
  },
  sns: {
    button: "📢 SNS fan-out",
    broker: "SNS topic",
    brokerSub: "order-placed",
    emoji: "📢",
    tone: "rose",
    targets: [
      { label: "SQS email-queue", sublabel: "nhận bản sao ✓", receives: true },
      { label: "SQS analytics", sublabel: "nhận bản sao ✓", receives: true },
      { label: "Lambda audit-log", sublabel: "nhận bản sao ✓", receives: true },
    ],
    facts: [
      "Loa phát thanh: đẩy (push) mỗi message tới TẤT CẢ subscriber",
      "SNS không lưu message chờ ai lấy — subscriber cần bền thì đặt SQS phía sau",
      "Pattern SNS → nhiều SQS = fan-out: thêm consumer mới mà không sửa producer",
      "Có subscription filter policy để subscriber chỉ nhận message phù hợp",
    ],
  },
  eventbridge: {
    button: "🧭 EventBridge rules",
    broker: "Event bus",
    brokerSub: "rule theo nội dung",
    emoji: "🧭",
    tone: "cyan",
    targets: [
      { label: "Lambda send-invoice", sublabel: "rule: OrderPlaced ✓", receives: true },
      { label: "SQS fraud-check", sublabel: "rule: total ≥ 10tr ✗", receives: false },
      { label: "Step Functions ship", sublabel: "rule: OrderPlaced ✓", receives: true },
    ],
    facts: [
      "Tổng đài phân loại: rule so khớp nội dung event (source, detail-type, field trong detail)",
      "Event này có total = 5tr → rule fraud-check không khớp, không gửi",
      "Bus mặc định nhận sẵn event từ nhiều dịch vụ AWS; có cả event từ SaaS partner",
      "EventBridge Scheduler thay cron để gọi target theo lịch",
    ],
  },
};

const TARGET_YS = [24, 124, 224];

export function EventDrivenMessagingPatternsDiagram() {
  const [mode, setMode] = useState<Mode>("sqs");
  const config = modes[mode];

  return (
    <DiagramFrame
      title="Queue vs fan-out vs event routing — chọn một kiểu"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(modes) as Mode[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={
                  mode === key
                    ? "rounded-full bg-indigo-600 px-3 py-1.5 font-medium text-white"
                    : "rounded-full bg-stone-200 px-3 py-1.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }
              >
                {modes[key].button}
              </button>
            ))}
          </div>
          <ul className="list-disc space-y-0.5 pl-5 text-stone-700 dark:text-stone-300">
            {config.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      }
      caption="Cùng một sự kiện 'đơn hàng mới', ba cách giao: SQS giao cho một người xử lý, SNS phát cho tất cả, EventBridge chọn người nhận theo nội dung."
    >
      <DiagramNode x={20} y={110} width={150} height={80} label="Order API" sublabel="producer" emoji="🛒" tone="violet" />
      <DiagramNode x={275} y={105} width={170} height={90} label={config.broker} sublabel={config.brokerSub} emoji={config.emoji} tone={config.tone} state="active" />
      <DiagramArrow from={[172, 150]} to={[271, 150]} tone="violet" animated label="OrderPlaced" />
      <MovingPacket key={`in-${mode}`} path="M 172 150 L 271 150" durationSeconds={1.2} tone="violet" />

      {config.targets.map((target, index) => {
        const y = TARGET_YS[index];
        const targetCenterY = y + 26;
        const isPull = mode === "sqs";
        return (
          <g key={`${mode}-${target.label}`}>
            <DiagramNode
              x={530}
              y={y}
              width={175}
              height={52}
              label={target.label}
              sublabel={target.sublabel}
              tone={target.receives ? "green" : "slate"}
              state={target.receives ? "active" : "dimmed"}
            />
            {isPull ? (
              <DiagramArrow from={[526, targetCenterY]} to={[449, 150]} tone="slate" label={index === 0 ? "poll" : undefined} dimmed={!target.receives} />
            ) : (
              <DiagramArrow from={[449, 150]} to={[526, targetCenterY]} tone={target.receives ? "green" : "slate"} animated={target.receives} dimmed={!target.receives} />
            )}
            {target.receives && (
              <MovingPacket key={`out-${mode}-${index}`} path={`M 449 150 L 526 ${targetCenterY}`} durationSeconds={1.2} delaySeconds={0.6} tone="green" />
            )}
          </g>
        );
      })}
    </DiagramFrame>
  );
}
