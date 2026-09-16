"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Tier = "unit" | "integration" | "e2e";

interface TierInfo {
  label: string;
  proportion: string;
  width: number;
  y: number;
  tone: DiagramTone;
  emoji: string;
  example: string;
  speed: string;
  answers: string;
}

const tiers: Record<Tier, TierInfo> = {
  unit: {
    label: "Unit",
    proportion: "~70% số lượng test",
    width: 560,
    y: 186,
    tone: "green",
    emoji: "🧩",
    example: "calculateDueDate(createdAt, priority) — hàm thuần, không đụng DB/HTTP",
    speed: "mili-giây/test — hàng nghìn test chạy xong trong vài giây",
    answers: "Logic thuần, tách khỏi mọi hạ tầng, có đúng không?",
  },
  integration: {
    label: "Integration",
    proportion: "~25% số lượng test",
    width: 360,
    y: 98,
    tone: "blue",
    emoji: "🔗",
    example: "register → login → tạo project → tạo task, qua Fastify thật + Postgres test thật",
    speed: "vài chục–vài trăm mili-giây/test",
    answers: "Route, middleware quyền, và DB có phối hợp đúng với nhau không?",
  },
  e2e: {
    label: "E2E / black-box",
    proportion: "~5% số lượng test",
    width: 200,
    y: 10,
    tone: "rose",
    emoji: "🌐",
    example: "docker compose up cả stack, gọi HTTP thật từ ngoài container qua nginx",
    speed: "vài giây/test — dễ flaky vì phụ thuộc network/timing thật",
    answers: "Cả hệ thống đã lắp ráp và cấu hình đúng chưa, kể cả lúc triển khai?",
  },
};

const order: Tier[] = ["e2e", "integration", "unit"];

export function TestPyramidDiagram() {
  const [selected, setSelected] = useState<Tier>("integration");
  const info = tiers[selected];

  return (
    <DiagramFrame
      title="Kim tự tháp test của taskflow-api — bấm vào từng tầng"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg">{info.emoji}</span>
            <span className="font-semibold">{info.label}</span>
            <span className="text-stone-500">· {info.proportion}</span>
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-medium">Ví dụ ở taskflow-api: </span>
            <code className="rounded bg-stone-100 px-1 py-0.5 text-[13px] dark:bg-stone-800">{info.example}</code>
          </p>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-medium">Tốc độ: </span>
            {info.speed}
          </p>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-medium">Trả lời câu hỏi: </span>
            {info.answers}
          </p>
        </div>
      }
      caption="Càng lên cao, test càng giống thật nhưng càng chậm và mơ hồ khi đỏ. Đa số test nên nằm ở đáy và tầng giữa."
    >
      {order.map((tier) => {
        const node = tiers[tier];
        const x = (720 - node.width) / 2;
        return (
          <DiagramNode
            key={tier}
            x={x}
            y={node.y}
            width={node.width}
            height={78}
            label={`${node.emoji} ${node.label}`}
            sublabel={node.proportion}
            tone={node.tone}
            state={selected === tier ? "active" : "normal"}
            onClick={() => setSelected(tier)}
          />
        );
      })}
    </DiagramFrame>
  );
}
