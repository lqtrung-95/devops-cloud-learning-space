"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "healthy-v2" | "broken-v2";

const scenarios: Record<Scenario, { steps: DiagramStep[]; canaryWeights: number[]; errorRates: number[]; statuses: string[] }> = {
  "healthy-v2": {
    steps: [
      { title: "Bắt đầu canary", description: "Rollout đổi image sang v2. Bước đầu: 20% traffic vào v2, 80% vẫn vào v1 (bản ổn định). AnalysisTemplate bắt đầu đo error rate của v2." },
      { title: "Phân tích OK, tăng lên 50%", description: "Error rate v2 (0.4%) nằm dưới ngưỡng (2%). Sau `pause: 2m`, Rollout tự tăng weight lên 50%." },
      { title: "Vẫn ổn, tăng tiếp", description: "Error rate vẫn thấp ở 50%. Rollout tiếp tục theo kế hoạch các bước đã định nghĩa." },
      { title: "Hoàn tất 100%", description: "Toàn bộ traffic chuyển sang v2. ReplicaSet v1 bị scale về 0 (giữ lại để rollback nhanh nếu cần)." },
    ],
    canaryWeights: [20, 50, 80, 100],
    errorRates: [0.4, 0.5, 0.6, 0.5],
    statuses: ["Progressing (canary 20%)", "Progressing (canary 50%)", "Progressing (canary 80%)", "Healthy (100% v2)"],
  },
  "broken-v2": {
    steps: [
      { title: "Bắt đầu canary", description: "Rollout đổi sang v2 lỗi (bug production). 20% traffic vào v2 — đủ nhỏ để chỉ một phần người dùng bị ảnh hưởng." },
      { title: "AnalysisTemplate phát hiện lỗi", description: "Error rate v2 tăng vọt lên 14% — vượt xa ngưỡng 2% đã định nghĩa trong AnalysisTemplate." },
      { title: "Tự động Abort", description: "Rollout đánh dấu `Degraded`, DỪNG NGAY việc tăng traffic — không chờ người bấm nút." },
      { title: "Rollback về v1", description: "Traffic được đưa về 100% v1 (bản ổn định cũ). ReplicaSet v2 lỗi bị scale về 0. Chỉ khoảng 20% người dùng trong vài phút bị ảnh hưởng, không phải 100%." },
    ],
    canaryWeights: [20, 20, 20, 0],
    errorRates: [0.4, 14, 14, 0],
    statuses: ["Progressing (canary 20%)", "AnalysisRun: Failed", "Degraded — aborting", "Healthy (rollback to v1)"],
  },
};

export function ArgoRolloutsCanaryDiagram() {
  const [scenario, setScenario] = useState<Scenario>("broken-v2");
  const { steps, canaryWeights, errorRates, statuses } = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["healthy-v2", "broken-v2"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "healthy-v2" ? "Kịch bản: v2 khoẻ mạnh" : "Kịch bản: v2 có bug production"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Canary release với Argo Rollouts" viewBox="0 0 720 300" steps={steps}>
        {(step) => {
          const weight = canaryWeights[step];
          const errorRate = errorRates[step];
          const failing = errorRate > 2;
          return (
            <>
              <DiagramNode x={16} y={16} width={140} height={54} label="Service (stable)" sublabel={`${100 - weight}% traffic`} tone="blue" />
              <DiagramNode x={16} y={90} width={140} height={54} label="Service (canary)" sublabel={`${weight}% traffic`} tone={failing ? "rose" : "green"} state={weight > 0 ? "active" : "normal"} />

              <DiagramArrow from={[160, 43]} to={[220, 43]} tone="blue" animated />
              <DiagramArrow from={[160, 117]} to={[220, 117]} tone={failing ? "rose" : "green"} animated={weight > 0} dimmed={weight === 0} />

              <DiagramGroupBox x={224} y={10} width={210} height={150} label="ReplicaSets" tone="slate">
                <DiagramNode x={240} y={40} width={178} height={50} label="v1 (stable)" sublabel={`${100 - weight}% pod`} tone="blue" />
                <DiagramNode x={240} y={104} width={178} height={50} label="v2 (canary)" sublabel={`${weight}% pod`} tone={failing ? "rose" : "green"} state={weight > 0 && weight < 100 ? "active" : "normal"} dashed={failing} />
              </DiagramGroupBox>

              <DiagramNode x={460} y={40} width={230} height={80} label="AnalysisTemplate" sublabel={`error rate: ${errorRate}% (ngưỡng 2%)`} tone={failing ? "rose" : "green"} state="active" />
              <DiagramArrow from={[434, 90]} to={[456, 80]} tone={failing ? "rose" : "green"} animated />

              <DiagramNode x={460} y={140} width={230} height={54} label="Rollout status" sublabel={statuses[step]} tone={failing ? "rose" : step === steps.length - 1 ? "green" : "amber"} state="active" />

              {scenario === "broken-v2" && step >= 2 && <DiagramLabel x={575} y={220} text="🚨 Auto-abort: chỉ ~20% người dùng bị ảnh hưởng, không phải 100%" tone="rose" bold size={12} />}
              {scenario === "healthy-v2" && step === 3 && <DiagramLabel x={575} y={220} text="✅ Tăng dần từng bước, không ai bị gián đoạn" tone="green" bold size={12} />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
