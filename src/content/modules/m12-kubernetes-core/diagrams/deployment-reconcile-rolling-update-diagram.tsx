"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "self-heal" | "rolling-update";
type PodPhase = "running" | "starting" | "terminating";

interface PodView {
  name: string;
  version: "v1" | "v2";
  phase: PodPhase;
}

interface Frame {
  pods: PodView[];
  oldReplicas: number;
  newReplicas?: number;
}

const run = (name: string, version: "v1" | "v2" = "v1"): PodView => ({ name, version, phase: "running" });

const scenarios: Record<Scenario, { steps: DiagramStep[]; frames: Frame[] }> = {
  "self-heal": {
    steps: [
      { title: "Ổn định", description: "Deployment `web` khai báo `replicas: 3`. ReplicaSet đang giữ đúng 3 pod — thực tế khớp kế hoạch." },
      { title: "Pod bị xoá", description: "Bạn chạy `kubectl delete pod web-b` (hoặc node chứa nó chết). Thực tế chỉ còn 2 pod sẵn sàng." },
      { title: "Controller phát hiện", description: "ReplicaSet controller đang *watch* API server: mong muốn 3, thực tế 2 → tạo object Pod mới `web-d` (lúc đầu `Pending`)." },
      { title: "Tự lành", description: "Scheduler xếp node, kubelet chạy container. Lại đủ 3 pod. Không ai phải thức dậy lúc 3 giờ sáng." },
    ],
    frames: [
      { pods: [run("web-a"), run("web-b"), run("web-c")], oldReplicas: 3 },
      { pods: [run("web-a"), { name: "web-b", version: "v1", phase: "terminating" }, run("web-c")], oldReplicas: 3 },
      { pods: [run("web-a"), run("web-c"), { name: "web-d", version: "v1", phase: "starting" }], oldReplicas: 3 },
      { pods: [run("web-a"), run("web-c"), run("web-d")], oldReplicas: 3 },
    ],
  },
  "rolling-update": {
    steps: [
      { title: "Đổi image", description: "`kubectl set image deployment/web web=web:v2`. Chiến lược `RollingUpdate` với `maxSurge: 1`, `maxUnavailable: 0`." },
      { title: "Thêm 1 pod v2", description: "Deployment tạo ReplicaSet mới cho v2 và scale lên 1. Tạm thời có 4 pod (được phép vượt 1 nhờ maxSurge)." },
      { title: "v2 Ready → bớt v1", description: "Chỉ khi pod v2 qua readinessProbe, ReplicaSet cũ mới scale xuống 2. Luôn có ≥ 3 pod sẵn sàng." },
      { title: "Lặp lại", description: "Thêm pod v2 thứ hai, đợi Ready, bớt thêm một pod v1. Cuốn chiếu từng người một." },
      { title: "Hoàn tất", description: "ReplicaSet v2 = 3, ReplicaSet v1 = 0 nhưng KHÔNG bị xoá — nó là 'bản lưu' để `kubectl rollout undo` quay lại tức thì." },
    ],
    frames: [
      { pods: [run("web-a"), run("web-b"), run("web-c")], oldReplicas: 3 },
      { pods: [run("web-a"), run("web-b"), run("web-c"), { name: "web-x", version: "v2", phase: "starting" }], oldReplicas: 3, newReplicas: 1 },
      { pods: [{ name: "web-a", version: "v1", phase: "terminating" }, run("web-b"), run("web-c"), run("web-x", "v2")], oldReplicas: 2, newReplicas: 1 },
      { pods: [{ name: "web-b", version: "v1", phase: "terminating" }, run("web-c"), run("web-x", "v2"), run("web-y", "v2")], oldReplicas: 1, newReplicas: 2 },
      { pods: [run("web-x", "v2"), run("web-y", "v2"), run("web-z", "v2")], oldReplicas: 0, newReplicas: 3 },
    ],
  },
};

const phaseSublabel: Record<PodPhase, string> = { running: "Running", starting: "đang khởi động", terminating: "Terminating" };

export function DeploymentReconcileRollingUpdateDiagram() {
  const [scenario, setScenario] = useState<Scenario>("self-heal");
  const { steps, frames } = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["self-heal", "rolling-update"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "self-heal" ? "Kịch bản: xoá 1 pod" : "Kịch bản: rolling update v1 → v2"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Vòng lặp reconcile của Deployment" viewBox="0 0 720 320" steps={steps}>
        {(step) => {
          const frame = frames[step];
          const ready = frame.pods.filter((pod) => pod.phase === "running").length;
          const hasNew = frame.newReplicas !== undefined;
          return (
            <>
              <DiagramNode x={250} y={10} width={220} height={56} label="Deployment web" sublabel="replicas: 3" tone="violet" />
              <DiagramArrow from={[320, 68]} to={[200, 94]} tone="blue" />
              <DiagramNode x={90} y={96} width={220} height={52} label={`ReplicaSet v1 = ${frame.oldReplicas}`} sublabel="image web:v1" tone="blue" state={hasNew && frame.oldReplicas === 0 ? "dimmed" : "normal"} />
              {hasNew && (
                <>
                  <DiagramArrow from={[400, 68]} to={[520, 94]} tone="green" animated />
                  <DiagramNode x={410} y={96} width={220} height={52} label={`ReplicaSet v2 = ${frame.newReplicas}`} sublabel="image web:v2" tone="green" state="active" />
                </>
              )}
              <DiagramGroupBox x={20} y={170} width={680} height={110} label="Pods trong cluster" tone="slate">
                {frame.pods.map((pod, index) => (
                  <DiagramNode
                    key={`${step}-${pod.name}`}
                    x={40 + index * 165}
                    y={200}
                    width={148}
                    height={62}
                    label={`${pod.name} (${pod.version})`}
                    sublabel={phaseSublabel[pod.phase]}
                    tone={pod.phase === "terminating" ? "rose" : pod.phase === "starting" ? "amber" : pod.version === "v2" ? "green" : "blue"}
                    state={pod.phase === "terminating" ? "dimmed" : pod.phase === "starting" ? "active" : "normal"}
                    dashed={pod.phase === "starting"}
                  />
                ))}
              </DiagramGroupBox>
              <DiagramLabel
                x={360}
                y={306}
                text={`Mong muốn: 3 · Đang sẵn sàng: ${ready} · Tổng pod: ${frame.pods.length}`}
                tone={ready < 3 ? "rose" : "green"}
                bold
                size={13}
              />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
