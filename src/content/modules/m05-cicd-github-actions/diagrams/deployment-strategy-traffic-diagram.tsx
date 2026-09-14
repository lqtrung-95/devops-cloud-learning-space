"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Strategy = "rolling" | "blue-green" | "canary";

interface Phase {
  name: string;
  /** Version per instance slot: 1 = v1, 2 = v2, 0 = không tồn tại. 8 slots: 0–3 nhóm A, 4–7 nhóm B. */
  slots: number[];
  /** % traffic tới v2. */
  v2Traffic: number;
  note: string;
}

const strategies: Record<Strategy, { label: string; extraCost: string; rollback: string; phases: Phase[] }> = {
  rolling: {
    label: "🔁 Rolling",
    extraCost: "Gần như không (thay dần từng máy)",
    rollback: "Chậm: phải rolling ngược lại",
    phases: [
      { name: "Ban đầu", slots: [1, 1, 1, 1, 0, 0, 0, 0], v2Traffic: 0, note: "4 instance đều chạy v1." },
      { name: "Thay 1/4", slots: [2, 1, 1, 1, 0, 0, 0, 0], v2Traffic: 25, note: "Rút 1 instance khỏi load balancer, cập nhật lên v2, healthcheck pass mới nhận traffic lại. Hai version chạy song song — API và DB phải tương thích ngược." },
      { name: "Thay 3/4", slots: [2, 2, 2, 1, 0, 0, 0, 0], v2Traffic: 75, note: "Tiếp tục từng đợt (maxUnavailable/maxSurge quyết định tốc độ). Kubernetes Deployment và ECS mặc định dùng kiểu này." },
      { name: "Xong", slots: [2, 2, 2, 2, 0, 0, 0, 0], v2Traffic: 100, note: "Toàn bộ là v2. Không tốn thêm máy, nhưng nếu v2 lỗi, bug đã lan rộng trước khi bạn kịp phát hiện." },
    ],
  },
  "blue-green": {
    label: "🔵🟢 Blue-Green",
    extraCost: "Gấp đôi hạ tầng trong lúc deploy",
    rollback: "Tức thì: chuyển traffic về Blue",
    phases: [
      { name: "Ban đầu", slots: [1, 1, 1, 1, 0, 0, 0, 0], v2Traffic: 0, note: "Blue (v1) nhận 100% traffic." },
      { name: "Dựng Green", slots: [1, 1, 1, 1, 2, 2, 2, 2], v2Traffic: 0, note: "Dựng môi trường Green (v2) đầy đủ, chạy smoke test trực tiếp — chưa khách nào vào." },
      { name: "Chuyển 100%", slots: [1, 1, 1, 1, 2, 2, 2, 2], v2Traffic: 100, note: "Đổi load balancer/DNS sang Green trong một lần. Blue vẫn giữ nguyên để quay về ngay nếu có sự cố." },
      { name: "Dọn Blue", slots: [0, 0, 0, 0, 2, 2, 2, 2], v2Traffic: 100, note: "Sau thời gian theo dõi, tắt Blue. Lần deploy sau, vai trò Blue/Green đổi cho nhau." },
    ],
  },
  canary: {
    label: "🐤 Canary",
    extraCost: "Ít: thêm vài instance canary",
    rollback: "Nhanh: rút canary, chỉ ít user bị ảnh hưởng",
    phases: [
      { name: "Ban đầu", slots: [1, 1, 1, 1, 0, 0, 0, 0], v2Traffic: 0, note: "v1 nhận 100% traffic." },
      { name: "5%", slots: [1, 1, 1, 1, 2, 0, 0, 0], v2Traffic: 5, note: "Một canary v2 nhận 5% traffic. Theo dõi error rate, latency so với v1 (M15). Như cho chim hoàng yến xuống mỏ trước." },
      { name: "25%", slots: [1, 1, 1, 1, 2, 2, 0, 0], v2Traffic: 25, note: "Chỉ số ổn → tăng dần. Có thể tự động hoá: vượt ngưỡng lỗi là tự rollback (Argo Rollouts, CodeDeploy)." },
      { name: "100%", slots: [0, 0, 0, 0, 2, 2, 2, 2], v2Traffic: 100, note: "Hoàn tất. Nếu v2 lỗi ở bước 5%, chỉ 5% người dùng gặp — blast radius nhỏ nhất trong ba cách." },
    ],
  },
};

const pillClass = (active: boolean) =>
  clsx("rounded-full px-3 py-1.5 font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

export function DeploymentStrategyTrafficDiagram() {
  const [strategy, setStrategy] = useState<Strategy>("canary");
  const [phaseIndex, setPhaseIndex] = useState(1);
  const [v2Buggy, setV2Buggy] = useState(false);
  const current = strategies[strategy];
  const phase = current.phases[phaseIndex];
  const groupLabels = strategy === "blue-green" ? ["Blue", "Green"] : ["Nhóm A", strategy === "canary" ? "Canary" : "(không dùng)"];

  return (
    <DiagramFrame
      title="Chiến lược deploy: traffic đi đâu ở từng giai đoạn?"
      viewBox="0 0 720 320"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(strategies) as Strategy[]).map((option) => (
              <button key={option} type="button" onClick={() => setStrategy(option)} className={pillClass(strategy === option)}>
                {strategies[option].label}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 font-medium">
              <input type="checkbox" checked={v2Buggy} onChange={() => setV2Buggy(!v2Buggy)} className="size-4 accent-rose-600" />
              💥 v2 có bug
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {current.phases.map((item, index) => (
              <button key={item.name} type="button" onClick={() => setPhaseIndex(index)} className={pillClass(phaseIndex === index)}>
                {index + 1}. {item.name}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">{phase.note}</p>
        </div>
      }
      caption="Không có chiến lược tốt nhất: đánh đổi giữa chi phí hạ tầng, tốc độ rollback và số người dùng bị ảnh hưởng khi bản mới lỗi."
    >
      <DiagramNode x={190} y={10} width={200} height={50} label="⚖️ Load balancer" sublabel={`v1 ${100 - phase.v2Traffic}% · v2 ${phase.v2Traffic}%`} tone="slate" state="active" />
      {[0, 1].map((group) => (
        <DiagramGroupBox key={group} x={10 + group * 290} y={100} width={270} height={120} label={groupLabels[group]} tone={strategy === "blue-green" ? (group === 0 ? "blue" : "green") : "slate"} />
      ))}
      {strategy === "rolling" ? (
        <DiagramArrow from={[260, 62]} to={[145, 104]} tone="blue" animated label="100% chia đều các instance" />
      ) : (
        <>
          <DiagramArrow from={[250, 62]} to={[145, 104]} tone="blue" dimmed={phase.v2Traffic === 100} label={`${100 - phase.v2Traffic}%`} />
          <DiagramArrow from={[330, 62]} to={[435, 104]} tone={v2Buggy ? "rose" : "green"} dimmed={phase.v2Traffic === 0} label={`${phase.v2Traffic}%`} />
        </>
      )}
      {phase.slots.map((version, slot) => {
        const x = 24 + (slot % 4) * 62 + (slot >= 4 ? 290 : 0);
        if (version === 0) return <DiagramNode key={slot} x={x} y={140} width={54} height={62} label="—" tone="slate" dashed state="dimmed" />;
        const isV2 = version === 2;
        return <DiagramNode key={slot} x={x} y={140} width={54} height={62} label={isV2 ? "v2" : "v1"} sublabel={isV2 && v2Buggy ? "💥" : "✓"} tone={isV2 ? (v2Buggy ? "rose" : "green") : "blue"} />;
      })}
      <DiagramNode x={590} y={10} width={120} height={90} label="👥 User gặp lỗi" sublabel={v2Buggy ? `${phase.v2Traffic}%` : "0%"} emoji={v2Buggy && phase.v2Traffic > 0 ? "😡" : "🙂"} tone={v2Buggy && phase.v2Traffic > 0 ? "rose" : "green"} state="active" />
      <DiagramNode x={10} y={240} width={340} height={66} label="💰 Tài nguyên thêm" sublabel={current.extraCost} tone="amber" />
      <DiagramNode x={370} y={240} width={340} height={66} label="⏪ Rollback" sublabel={current.rollback} tone="violet" />
      {strategy === "rolling" && <DiagramLabel x={445} y={180} text="Rolling thay tại chỗ" tone="slate" />}
    </DiagramFrame>
  );
}
