"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Mode = "ci" | "delivery" | "deployment";
type StageKind = "auto" | "manual" | "none";

const stages = [
  { id: "commit", label: "Commit", emoji: "📝" },
  { id: "build", label: "Build", emoji: "🔨" },
  { id: "test", label: "Test", emoji: "🧪" },
  { id: "artifact", label: "Artifact", emoji: "📦" },
  { id: "staging", label: "Staging", emoji: "🧭" },
  { id: "gate", label: "Duyệt", emoji: "🚦" },
  { id: "prod", label: "Production", emoji: "🚀" },
] as const;

const modes: Record<Mode, { label: string; kinds: StageKind[]; stopAt: number; leadTime: string; summary: string }> = {
  ci: {
    label: "Continuous Integration",
    kinds: ["auto", "auto", "auto", "auto", "manual", "manual", "manual"],
    stopAt: 3,
    leadTime: "vài ngày – vài tuần",
    summary: "Mỗi commit được tự động build + test và gộp vào nhánh chính nhiều lần mỗi ngày. Nhưng đưa lên staging/production vẫn làm tay (SSH, copy file, chạy script) — chậm và dễ sai.",
  },
  delivery: {
    label: "Continuous Delivery",
    kinds: ["auto", "auto", "auto", "auto", "auto", "manual", "auto"],
    stopAt: 5,
    leadTime: "vài giờ – 1 ngày",
    summary: "Mọi thứ tự động tới staging; artifact LUÔN ở trạng thái sẵn sàng release. Lên production chỉ cần một người bấm nút duyệt — quyết định kinh doanh, không phải công sức kỹ thuật.",
  },
  deployment: {
    label: "Continuous Deployment",
    kinds: ["auto", "auto", "auto", "auto", "auto", "auto", "auto"],
    stopAt: 6,
    leadTime: "vài phút",
    summary: "Không có nút bấm: commit qua mọi kiểm tra tự động là lên production. Đòi hỏi test rất tốt, monitoring và rollback tự động, thường kèm canary/feature flag.",
  },
};

const NODE_WIDTH = 90;
const stageX = (index: number) => 10 + index * 101;

export function CicdAssemblyLineDiagram() {
  const [mode, setMode] = useState<Mode>("delivery");
  const current = modes[mode];
  const packetEnd = stageX(current.stopAt) + NODE_WIDTH / 2;

  return (
    <DiagramFrame
      title="Dây chuyền phần mềm: CI, Continuous Delivery hay Continuous Deployment?"
      viewBox="0 0 720 290"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(modes) as Mode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {modes[option].label}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">{current.summary}</p>
        </div>
      }
      caption="Xanh = máy tự làm, vàng = cần con người. Khác biệt giữa Delivery và Deployment chỉ nằm ở trạm 'Duyệt' trước production."
    >
      <DiagramGroupBox x={4} y={14} width={402} height={150} label="CI: tích hợp liên tục" tone="blue" />
      <DiagramGroupBox x={410} y={14} width={306} height={150} label="CD: đưa tới người dùng" tone="violet" />
      {stages.map((stage, index) => {
        const kind = current.kinds[index];
        return (
          <g key={stage.id}>
            {index > 0 && <DiagramArrow from={[stageX(index - 1) + NODE_WIDTH + 1, 100]} to={[stageX(index) - 2, 100]} tone={kind === "auto" ? "green" : "amber"} />}
            <DiagramNode
              x={stageX(index)}
              y={52}
              width={NODE_WIDTH}
              height={96}
              label={stage.label}
              sublabel={kind === "auto" ? "🤖 tự động" : "👆 làm tay"}
              emoji={stage.emoji}
              tone={kind === "auto" ? "green" : "amber"}
              state={index === 5 && mode !== "deployment" ? "active" : "normal"}
            />
          </g>
        );
      })}
      <MovingPacket key={mode} path={`M 55 100 L ${packetEnd} 100`} durationSeconds={1 + current.stopAt * 0.4} tone="blue" label="v1.4" />
      <DiagramNode x={10} y={190} width={330} height={80} label="⏱ Commit → production" sublabel={current.leadTime} tone={mode === "ci" ? "amber" : "green"} state="active" />
      <DiagramNode
        x={380}
        y={190}
        width={330}
        height={80}
        label="🙋 Ai quyết định lên production?"
        sublabel={mode === "ci" ? "Người deploy tay theo checklist" : mode === "delivery" ? "Người duyệt bấm nút (có ghi log)" : "Bộ test + monitoring tự động"}
        tone="violet"
      />
      <DiagramLabel x={360} y={178} text={mode === "deployment" ? "Không cần người ở giữa" : "Có con người ở giữa dây chuyền"} tone={mode === "deployment" ? "green" : "amber"} bold />
    </DiagramFrame>
  );
}
