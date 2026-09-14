"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { InlineCodeText } from "@/components/ui/inline-code-text";

type Experiment = "none" | "pod-kill" | "network-delay" | "cpu-stress";

const experiments: { key: Experiment; label: string; emoji: string; manifest: string; observation: string }[] = [
  { key: "none", label: "Không có gì (steady state)", emoji: "🙂", manifest: "-- chưa chạy thí nghiệm --", observation: "3 pod checkout đang khoẻ, p95 latency 120ms, error rate 0%. Đây là baseline để so sánh." },
  {
    key: "pod-kill",
    manifest: "kind: PodChaos\naction: pod-kill\nmode: one\nselector:\n  labelSelectors:\n    app: checkout",
    label: "Kill 1 pod",
    emoji: "💀",
    observation: "1 trong 3 pod bị kill. Nếu HPA/ReplicaSet + PodDisruptionBudget cấu hình đúng, pod mới lên trong vài giây, error rate chỉ nhích nhẹ. Nếu chỉ có 1 replica, đây sẽ là SEV1 thật.",
  },
  {
    key: "network-delay",
    manifest: "kind: NetworkChaos\naction: delay\nlatency: 500ms\nselector:\n  labelSelectors:\n    app: payments",
    label: "Delay mạng 500ms",
    emoji: "🐢",
    observation: "payments trả lời chậm hơn. Nếu checkout gọi payments KHÔNG có timeout hợp lý, request xếp hàng, connection pool cạn kiệt — lộ ra thiếu timeout/circuit breaker.",
  },
  {
    key: "cpu-stress",
    manifest: "kind: StressChaos\nstressors:\n  cpu:\n    workers: 2\n    load: 90\nselector:\n  labelSelectors:\n    app: checkout",
    label: "CPU stress 90%",
    emoji: "🔥",
    observation: "Pod checkout bị ép CPU cao. Kiểm tra CFS throttling (USE saturation) có gây tăng latency không, và HPA có scale thêm pod kịp thời không.",
  },
];

export function ChaosExperimentInjectorDiagram() {
  const [experiment, setExperiment] = useState<Experiment>("none");
  const current = experiments.find((item) => item.key === experiment)!;
  const affected = experiment !== "none";

  return (
    <DiagramFrame
      title="Chaos Mesh — bấm để 'gây lỗi' và xem hệ thống phản ứng"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {experiments.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setExperiment(item.key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  experiment === item.key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-xl bg-stone-900 px-4 py-2 font-mono text-[11.5px] text-emerald-400">{current.manifest}</pre>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <InlineCodeText text={current.observation} />
          </p>
        </div>
      }
      caption="Chaos engineering: gây lỗi có kiểm soát trong phạm vi nhỏ (blast radius), có giả thuyết steady-state, và luôn có nút dừng khẩn cấp (kubectl delete)."
    >
      <DiagramGroupBox x={10} y={10} width={380} height={230} label="namespace: shop" tone="slate">
        {[0, 1, 2].map((index) => (
          <DiagramNode
            key={index}
            x={30 + index * 118}
            y={50}
            width={100}
            height={70}
            label="checkout"
            sublabel={experiment === "pod-kill" && index === 1 ? "💀 killed" : "healthy"}
            tone={experiment === "pod-kill" && index === 1 ? "rose" : "green"}
            state={experiment === "cpu-stress" ? "active" : "normal"}
          />
        ))}
        <DiagramNode x={90} y={150} width={220} height={70} label="payments" sublabel={experiment === "network-delay" ? "🐢 +500ms" : "healthy"} tone={experiment === "network-delay" ? "amber" : "green"} state={experiment === "network-delay" ? "active" : "normal"} />
        <DiagramArrow from={[190, 130]} to={[190, 146]} tone={experiment === "network-delay" ? "amber" : "slate"} animated={experiment === "network-delay"} />
      </DiagramGroupBox>
      <DiagramNode x={430} y={40} width={130} height={80} label="Chaos Mesh" sublabel="controller" emoji="🧪" tone="violet" state={affected ? "active" : "normal"} />
      <DiagramNode x={430} y={150} width={130} height={80} label="On-call" sublabel="dùng runbook" emoji="🧑‍💻" tone="blue" state={affected ? "active" : "normal"} />
      <DiagramArrow from={[430, 80]} to={[400, 100]} tone="violet" dimmed={!affected} animated={affected} />
      <DiagramArrow from={[430, 190]} to={[400, 150]} tone="blue" dimmed={!affected} animated={affected} />
      <DiagramNode x={590} y={95} width={110} height={90} label="Dashboard RED" sublabel="quan sát tác động" emoji="📈" tone="cyan" />
      <DiagramArrow from={[560, 140]} to={[586, 140]} tone="cyan" />
      {experiment === "none" && <DiagramLabel x={200} y={266} text="🧹 kubectl delete podchaos,networkchaos,stresschaos -n shop --all" tone="slate" size={11} />}
    </DiagramFrame>
  );
}
