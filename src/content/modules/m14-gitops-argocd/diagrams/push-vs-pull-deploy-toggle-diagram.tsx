"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";

type Mode = "push" | "pull";
type Scenario = "normal" | "ci-compromised" | "drift";

const verdicts: Record<Mode, Record<Scenario, { text: string; good: boolean }>> = {
  push: {
    normal: { text: "CI chạy `kubectl apply` thẳng vào cluster prod. Hoạt động bình thường, nhưng CI đang cầm credentials có quyền GHI vào cluster.", good: true },
    "ci-compromised": { text: "Kẻ tấn công chiếm được CI runner → CÓ credentials apply thẳng vào cluster prod → toàn quyền trên namespace đó ngay lập tức.", good: false },
    drift: { text: "Ai đó `kubectl edit` sửa tay trên prod. CI không hề hay biết — Git và cluster lệch nhau âm thầm, không ai phát hiện cho tới lần deploy sau.", good: false },
  },
  pull: {
    normal: { text: "Argo CD (agent TRONG cluster) tự kéo Git về mỗi vài phút và áp dụng. CI chỉ cần quyền GHI vào Git, không hề chạm tới cluster.", good: true },
    "ci-compromised": { text: "Kẻ tấn công chiếm CI runner → chỉ đẩy được commit vào Git (có thể chặn bằng review/branch protection) → KHÔNG có credentials cluster để khai thác trực tiếp.", good: true },
    drift: { text: "Ai đó `kubectl edit` sửa tay trên prod. Argo CD phát hiện OutOfSync ngay ở lần reconcile kế tiếp và tự sync lại theo Git (nếu bật selfHeal).", good: true },
  },
};

export function PushVsPullDeployToggleDiagram() {
  const [mode, setMode] = useState<Mode>("pull");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const verdict = verdicts[mode][scenario];

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["push", "pull"] as const).map((option) => (
          <button key={option} type="button" className={pill(mode === option)} onClick={() => setMode(option)}>
            {option === "push" ? "Mô hình Push (CI apply thẳng)" : "Mô hình Pull (GitOps)"}
          </button>
        ))}
        {(["normal", "ci-compromised", "drift"] as const).map((option) => (
          <button key={option} type="button" className={pill(scenario === option)} onClick={() => setScenario(option)}>
            {option === "normal" ? "Bình thường" : option === "ci-compromised" ? "CI bị chiếm quyền" : "Ai đó sửa tay trên cluster"}
          </button>
        ))}
      </div>
      <DiagramFrame
        title="Push vs Pull — ai cầm chìa khoá vào cluster?"
        viewBox="0 0 720 260"
        controls={
          <p className={clsx("text-sm leading-relaxed", verdict.good ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
            {verdict.good ? "✅ " : "🚨 "}
            {verdict.text}
          </p>
        }
        caption="GitOps = mô hình pull: agent trong cluster tự kéo Git về, không ai bên ngoài cần quyền ghi trực tiếp vào cluster."
      >
        <DiagramNode x={16} y={100} width={120} height={64} label="Developer" sublabel="git push" emoji="🧑‍💻" tone="slate" />
        <DiagramArrow from={[138, 132]} to={[186, 132]} tone="violet" animated />
        <DiagramNode x={190} y={100} width={140} height={64} label="Git repo" sublabel={scenario === "drift" ? "vẫn đúng ý định" : "nguồn sự thật"} tone="violet" state="active" />

        {mode === "push" ? (
          <>
            <DiagramNode
              x={370}
              y={100}
              width={150}
              height={64}
              label="CI runner"
              sublabel={scenario === "ci-compromised" ? "⚠️ đã bị chiếm quyền" : "có credentials cluster"}
              tone={scenario === "ci-compromised" ? "rose" : "amber"}
              state={scenario === "ci-compromised" ? "active" : "normal"}
            />
            <DiagramArrow from={[330, 132]} to={[366, 132]} tone="amber" animated />
            <DiagramArrow from={[520, 132]} to={[566, 132]} tone={scenario === "ci-compromised" ? "rose" : "amber"} animated label="kubectl apply" />
            {scenario === "ci-compromised" && <MovingPacket key="attack" path="M 520 132 L 566 132" tone="rose" durationSeconds={0.9} label="🔓" />}
          </>
        ) : (
          <DiagramGroupBox x={370} y={70} width={300} height={130} label="Cluster prod" tone="green">
            <DiagramNode x={390} y={110} width={150} height={60} label="Argo CD" sublabel="pull mỗi 3 phút" emoji="🔁" tone="green" state="active" />
            <DiagramArrow from={[330, 132]} to={[386, 140]} tone="green" animated curve={-15} label="git pull" />
          </DiagramGroupBox>
        )}

        <DiagramNode
          x={570}
          y={100}
          width={130}
          height={64}
          label="Cluster prod"
          sublabel={scenario === "drift" ? (mode === "pull" ? "tự sửa lại (selfHeal)" : "lệch khỏi Git, không ai biết") : "khớp Git"}
          tone={scenario === "drift" ? (mode === "pull" ? "green" : "rose") : "blue"}
        />

        {scenario === "drift" && (
          <>
            <DiagramNode x={570} y={190} width={130} height={44} label="🖐️ kubectl edit" sublabel="sửa tay" tone="rose" />
            <DiagramArrow from={[635, 190]} to={[635, 168]} tone="rose" animated />
          </>
        )}
        {mode === "pull" && scenario === "drift" && <DiagramLabel x={480} y={230} text="Argo CD reconcile lại → tự sửa về đúng Git" tone="green" bold size={12} />}
      </DiagramFrame>
    </div>
  );
}
