"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "clean" | "critical";

const stages: { id: string; x: number; label: string; sublabel: string; emoji: string; tone: DiagramTone }[] = [
  { id: "build", x: 10, label: "Build", sublabel: "docker build", emoji: "🔨", tone: "blue" },
  { id: "tag", x: 152, label: "Tag", sublabel: "sha-3f9c2e1", emoji: "🏷️", tone: "violet" },
  { id: "scan", x: 294, label: "Trivy scan", sublabel: "CRITICAL?", emoji: "🔍", tone: "amber" },
  { id: "push", x: 436, label: "Push", sublabel: "ghcr.io / ECR", emoji: "📤", tone: "cyan" },
  { id: "deploy", x: 578, label: "Deploy", sublabel: "pull theo digest", emoji: "🚀", tone: "green" },
];

const scenarioSteps: Record<Scenario, { path: string[]; steps: DiagramStep[] }> = {
  clean: {
    path: ["build", "tag", "scan", "push", "deploy"],
    steps: [
      { title: "Build", description: "Build image từ commit `3f9c2e1`. Image nằm trên máy build, chưa ai khác dùng được." },
      { title: "Tag", description: "Dán nhãn: `ghcr.io/acme/api:sha-3f9c2e1` (không bao giờ đổi) và khi release thêm `:1.4.0`. Nhãn cho người đọc, digest cho máy." },
      { title: "Quét", description: "`trivy image --severity CRITICAL --exit-code 1` — máy soi hành lý. Không có CRITICAL → exit code 0, đi tiếp." },
      { title: "Push", description: "Đẩy lên registry. Registry trả về digest `sha256:9b1d…` — mã vạch duy nhất của đúng bộ layer này." },
      { title: "Deploy", description: "Server pull theo tag SHA (hoặc digest). Biết chính xác commit nào đang chạy; rollback = deploy lại SHA cũ." },
    ],
  },
  critical: {
    path: ["build", "tag", "scan"],
    steps: [
      { title: "Build", description: "Build image từ commit `a71e0d4`, base image cũ từ nửa năm trước." },
      { title: "Tag", description: "Dán nhãn `sha-a71e0d4` như bình thường." },
      { title: "Chặn lại 🚨", description: "Trivy phát hiện CVE mức CRITICAL trong openssl có bản vá → exit code 1 → pipeline dừng. Registry KHÔNG nhận image lỗi, production an toàn. Sửa: nâng base image, build lại." },
    ],
  },
};

export function ImageReleaseFlowDiagram() {
  const [scenario, setScenario] = useState<Scenario>("clean");
  const { path, steps } = scenarioSteps[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["clean", "critical"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "clean" ? "Image sạch" : "Image có CVE CRITICAL"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Từ docker build tới server: tag, quét, push" viewBox="0 0 720 280" steps={steps}>
        {(step) => {
          const blocked = scenario === "critical" && step === 2;
          return (
            <>
              {stages.map((stage, index) => {
                const position = path.indexOf(stage.id);
                const isBlockedStage = blocked && stage.id === "scan";
                const state = position === step ? "active" : position !== -1 && position < step ? "normal" : "dimmed";
                return (
                  <g key={stage.id}>
                    {index > 0 && <DiagramArrow from={[stages[index - 1].x + 126, 80]} to={[stage.x - 4, 80]} tone="slate" dimmed={position === -1 || position > step} animated={position === step} />}
                    <DiagramNode
                      x={stage.x}
                      y={36}
                      width={124}
                      height={88}
                      label={stage.label}
                      sublabel={isBlockedStage ? "❌ exit code 1" : stage.id === "tag" && scenario === "critical" ? "sha-a71e0d4" : stage.sublabel}
                      emoji={isBlockedStage ? "🚨" : stage.emoji}
                      tone={isBlockedStage ? "rose" : stage.tone}
                      state={state}
                    />
                  </g>
                );
              })}
              {step === 1 && (
                <>
                  <DiagramNode x={100} y={160} width={230} height={40} label="ghcr.io/acme/api:sha-…" tone="violet" rounded={8} />
                  <DiagramNode x={100} y={208} width={230} height={40} label=":1.4.0 (khi tạo release)" tone="violet" rounded={8} dashed />
                  <DiagramLabel x={350} y={186} text="Tag = nhãn dán, có thể gán lại" anchor="start" />
                  <DiagramLabel x={350} y={232} text=":latest = nhãn trôi nổi, tránh ở production" anchor="start" tone="rose" />
                </>
              )}
              {scenario === "clean" && step === 2 && <DiagramLabel x={356} y={170} text="0 CRITICAL · exit code 0 ✅" tone="green" bold size={14} />}
              {blocked && (
                <>
                  <DiagramNode x={230} y={158} width={260} height={62} label="CVE-20XX-XXXX · openssl" sublabel="CRITICAL · Fixed Version có sẵn" tone="rose" />
                  <DiagramLabel x={600} y={180} text="⛔ Không push, không deploy" tone="rose" bold />
                </>
              )}
              {scenario === "clean" && step === 3 && (
                <>
                  <MovingPacket key="push" path="M 420 80 L 500 80" durationSeconds={1.2} tone="cyan" repeat={false} />
                  <DiagramLabel x={498} y={170} text="digest: sha256:9b1d4c…e07a" tone="cyan" bold />
                  <DiagramLabel x={498} y={194} text="(mã vạch cố định của nội dung image)" />
                </>
              )}
              {scenario === "clean" && step === 4 && (
                <DiagramNode x={430} y={160} width={280} height={70} label="docker pull …/api:sha-3f9c2e1" sublabel="rollback: deploy lại sha trước đó" emoji="🖥️" tone="green" />
              )}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
