"use client";

import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

interface Stage {
  key: string;
  label: string;
  emoji: string;
}

const STAGES: Stage[] = [
  { key: "lint", label: "pnpm lint", emoji: "🧹" },
  { key: "typecheck", label: "tsc --noEmit", emoji: "🔎" },
  { key: "test", label: "pnpm test", emoji: "🧪" },
  { key: "build", label: "docker build", emoji: "📦" },
];

/** Toggle failStage để xem pipeline dừng ở đúng bước nào và các bước sau bị skip ra sao. */
export function CiPipelineStagesDiagram() {
  const [failStage, setFailStage] = useState<string | "none">("none");
  const failIndex = STAGES.findIndex((s) => s.key === failStage);

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-stone-500">Giả lập lỗi ở bước:</span>
      {(["none", ...STAGES.map((s) => s.key)] as const).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setFailStage(key)}
          className={
            failStage === key
              ? "rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white"
              : "rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400"
          }
        >
          {key === "none" ? "✅ tất cả xanh" : key}
        </button>
      ))}
    </div>
  );

  return (
    <DiagramFrame title="Pipeline CI: lint → typecheck → test → build (mỗi PR)" viewBox="0 0 720 260" controls={controls}>
      <DiagramNode x={20} y={90} width={110} height={64} label="🔀 Pull Request" sublabel="on: pull_request" tone="violet" />

      {STAGES.map((stage, index) => {
        const x = 165 + index * 140;
        const isFailing = index === failIndex;
        const isSkipped = failIndex !== -1 && index > failIndex;

        return (
          <g key={stage.key}>
            <DiagramArrow from={[index === 0 ? 130 : x - 140 + 100, 122]} to={[x, 122]} tone={isSkipped ? "slate" : "blue"} dimmed={isSkipped} />
            <DiagramNode
              x={x}
              y={90}
              width={100}
              height={64}
              label={`${stage.emoji} ${stage.label}`}
              sublabel={isFailing ? "❌ đỏ — dừng ở đây" : isSkipped ? "⏭️ skipped" : "✅ xanh"}
              tone={isFailing ? "rose" : isSkipped ? "slate" : "green"}
              state={isFailing ? "active" : isSkipped ? "dimmed" : "normal"}
            />
          </g>
        );
      })}

      <DiagramLabel
        x={360}
        y={210}
        text={
          failIndex === -1
            ? "Tất cả 4 bước xanh — PR được phép merge"
            : `Dừng ngay ở "${STAGES[failIndex].label}" — các bước sau KHÔNG chạy, tiết kiệm thời gian CI`
        }
        size={13}
        bold
        tone={failIndex === -1 ? "green" : "rose"}
      />
    </DiagramFrame>
  );
}
