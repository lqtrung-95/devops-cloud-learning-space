"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Model = "queue" | "pubsub" | "log";

interface ConsumerView {
  label: string;
  received: string;
  tone: DiagramTone;
  dimmed?: boolean;
}

interface ModelView {
  button: string;
  broker: string;
  slotSublabels: [string, string, string];
  slotsDimmed: boolean;
  consumers: [ConsumerView, ConsumerView, ConsumerView];
  facts: string;
  caption: string;
}

const models: Record<Model, ModelView> = {
  queue: {
    button: "📮 Queue",
    broker: "Queue (vd RabbitMQ, SQS)",
    slotSublabels: ["ack → xoá", "ack → xoá", "ack → xoá"],
    slotsDimmed: true,
    consumers: [
      { label: "Email #1", received: "nhận m1, m3", tone: "green" },
      { label: "Email #2", received: "nhận m2", tone: "green" },
      { label: "Analytics", received: "cần queue riêng", tone: "slate", dimmed: true },
    ],
    facts: "Mỗi message → đúng 1 consumer · ack xong là xoá · không đọc lại được",
    caption: "Queue = competing consumers: các worker tranh nhau lấy việc, rất hợp để chia tải. Muốn service khác cũng nhận event thì phải có queue riêng (hoặc exchange/fan-out phía trước).",
  },
  pubsub: {
    button: "📢 Pub/sub",
    broker: "Pub/sub (vd SNS, Redis Pub/Sub)",
    slotSublabels: ["phát cho mọi sub", "phát cho mọi sub", "phát cho mọi sub"],
    slotsDimmed: false,
    consumers: [
      { label: "Email #1", received: "nhận m1 m2 m3", tone: "green" },
      { label: "Email #2", received: "cũng m1 m2 m3 → trùng!", tone: "rose" },
      { label: "Analytics", received: "nhận m1 m2 m3", tone: "green" },
    ],
    facts: "Mỗi subscriber 1 bản · Redis Pub/Sub: offline là lỡ · SNS hay fan-out ra SQS",
    caption: "Pub/sub = fan-out: mỗi subscription nhận một bản. Tốt để nhiều service cùng nghe một event, nhưng scale 1 service thành nhiều instance cần cơ chế 'shared subscription' — tuỳ sản phẩm.",
  },
  log: {
    button: "📒 Log (Kafka)",
    broker: "Log (vd Kafka, Redpanda)",
    slotSublabels: ["offset 0 · giữ lại", "offset 1 · giữ lại", "offset 2 · giữ lại"],
    slotsDimmed: false,
    consumers: [
      { label: "Email #1", received: "group email-svc · P0, P2", tone: "green" },
      { label: "Email #2", received: "group email-svc · P1", tone: "green" },
      { label: "Analytics", received: "group analytics · tất cả", tone: "cyan" },
    ],
    facts: "Cùng group: chia partition như queue · khác group: như pub/sub · replay được",
    caption: "Log = sổ ghi nối đuôi: message không bị xoá khi đọc, mỗi consumer group tự nhớ offset. Cùng group thì chia việc; khác group thì mỗi group đọc đủ. Quay lại offset cũ để replay.",
  },
};

const order: Model[] = ["queue", "pubsub", "log"];
const consumerY = [15, 118, 221];

export function MessagingModelsComparisonDiagram() {
  const [model, setModel] = useState<Model>("queue");
  const view = models[model];

  return (
    <DiagramFrame
      title="Cùng 3 message m1, m2, m3 — ba mô hình phân phối khác nhau"
      viewBox="0 0 720 320"
      controls={
        <div className="flex flex-wrap gap-2">
          {order.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setModel(option)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                model === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
              )}
            >
              {models[option].button}
            </button>
          ))}
        </div>
      }
      caption={view.caption}
    >
      <DiagramNode x={10} y={112} width={130} height={76} label="Order API" sublabel="publish m1 m2 m3" emoji="🧾" tone="violet" />
      <DiagramArrow from={[142, 150]} to={[196, 150]} tone="violet" animated />

      <DiagramGroupBox x={200} y={40} width={290} height={220} label={view.broker} tone="amber">
        {view.slotSublabels.map((sublabel, index) => (
          <DiagramNode
            key={sublabel + index}
            x={220}
            y={72 + index * 60}
            width={250}
            height={48}
            label={`m${index + 1}`}
            sublabel={sublabel}
            tone="amber"
            state={view.slotsDimmed ? "dimmed" : "normal"}
            dashed={model === "pubsub"}
          />
        ))}
      </DiagramGroupBox>

      {view.consumers.map((consumer, index) => (
        <g key={consumer.label}>
          <DiagramArrow from={[492, 150]} to={[536, consumerY[index] + 36]} tone={consumer.tone} dimmed={consumer.dimmed} animated={!consumer.dimmed} />
          <DiagramNode
            x={540}
            y={consumerY[index]}
            width={170}
            height={72}
            label={consumer.label}
            sublabel={consumer.received}
            tone={consumer.tone}
            state={consumer.dimmed ? "dimmed" : "normal"}
          />
        </g>
      ))}

      <DiagramLabel x={360} y={306} text={view.facts} size={12} bold />
    </DiagramFrame>
  );
}
