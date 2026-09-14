"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Stage = "code" | "pr" | "staging" | "production";

const stages: { key: Stage; label: string; emoji: string; tone: DiagramTone; relativeCost: number; detail: string }[] = [
  { key: "code", label: "Viết code (IDE)", emoji: "⌨️", tone: "green", relativeCost: 1, detail: "SAST plugin trong IDE gạch đỏ dòng code nguy hiểm ngay khi gõ. Sửa mất vài giây, không ai khác biết chuyện này từng xảy ra." },
  { key: "pr", label: "Pull Request / CI", emoji: "🔀", tone: "cyan", relativeCost: 6, detail: "Semgrep, Trivy, gitleaks chạy trong CI. Sửa cần thêm commit, review lại, nhưng vẫn chưa ảnh hưởng ai ngoài team." },
  { key: "staging", label: "Staging / QA", emoji: "🧪", tone: "amber", relativeCost: 30, detail: "Lỗi lọt qua PR, bị QA hoặc DAST (OWASP ZAP) phát hiện. Cần điều tra, có thể chặn cả release, tốn thời gian nhiều người." },
  { key: "production", label: "Production", emoji: "🔥", tone: "rose", relativeCost: 150, detail: "Lỗi tới tay khách hàng thật: rollback khẩn cấp, vá nóng, thông báo khách hàng, có thể phải báo cáo tuân thủ, mất uy tín thương hiệu." },
];

export function CostOfFixShiftLeftDiagram() {
  const [selected, setSelected] = useState<Stage>("production");
  const current = stages.find((stage) => stage.key === selected)!;
  const maxCost = stages[stages.length - 1].relativeCost;

  return (
    <DiagramFrame
      title="Cùng một lỗi bảo mật — chi phí sửa tăng theo giai đoạn phát hiện"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => (
              <button
                key={stage.key}
                type="button"
                onClick={() => setSelected(stage.key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  selected === stage.key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {stage.emoji} {stage.label}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-semibold">Chi phí tương đối: ~{current.relativeCost}×.</span> {current.detail}
          </p>
        </div>
      }
      caption="Số liệu minh hoạ tương đối (không phải số đo tuyệt đối) — ý tưởng cốt lõi từ nghiên cứu 'cost of fixing defects' (IBM Systems Sciences Institute) và thực hành shift-left security."
    >
      {stages.map((stage, index) => {
        const barHeight = (stage.relativeCost / maxCost) * 160;
        const x = 40 + index * 165;
        const active = stage.key === selected;
        return (
          <g key={stage.key} onClick={() => setSelected(stage.key)} className="cursor-pointer">
            <rect
              x={x}
              y={220 - barHeight}
              width={110}
              height={barHeight}
              rx={6}
              className={active ? diagramFillActive[stage.tone] : diagramFillNormal[stage.tone]}
            />
            <DiagramLabel x={x + 55} y={234} text={stage.label} size={11} bold={active} />
            <DiagramLabel x={x + 55} y={210 - barHeight} text={`${stage.relativeCost}×`} bold size={13} tone={active ? stage.tone : "slate"} />
          </g>
        );
      })}
      <DiagramArrow from={[20, 250]} to={[690, 250]} tone="slate" label="phát hiện càng muộn →" />
      <DiagramNode x={520} y={20} width={180} height={70} label="Shift-left" sublabel="quét càng sớm càng rẻ" emoji="⬅️" tone="green" />
    </DiagramFrame>
  );
}

const diagramFillActive: Record<DiagramTone, string> = {
  blue: "fill-blue-500 dark:fill-blue-400",
  green: "fill-emerald-500 dark:fill-emerald-400",
  amber: "fill-amber-500 dark:fill-amber-400",
  rose: "fill-rose-500 dark:fill-rose-400",
  violet: "fill-violet-500 dark:fill-violet-400",
  slate: "fill-stone-500 dark:fill-stone-400",
  cyan: "fill-cyan-500 dark:fill-cyan-400",
};
const diagramFillNormal: Record<DiagramTone, string> = {
  blue: "fill-blue-200 dark:fill-blue-900",
  green: "fill-emerald-200 dark:fill-emerald-900",
  amber: "fill-amber-200 dark:fill-amber-900",
  rose: "fill-rose-200 dark:fill-rose-900",
  violet: "fill-violet-200 dark:fill-violet-900",
  slate: "fill-stone-200 dark:fill-stone-800",
  cyan: "fill-cyan-200 dark:fill-cyan-900",
};
