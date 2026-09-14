"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "ha" | "no-ha";

// Same incident (AZ mất điện lúc 08:00), hai kiến trúc khác nhau phản ứng khác nhau.
const scenarios: Record<Scenario, { label: string; steps: DiagramStep[]; downtimeMin: number; dataLossMin: number }> = {
  ha: {
    label: "🛡️ Có Multi-AZ + ASG 2 AZ",
    downtimeMin: 2,
    dataLossMin: 0,
    steps: [
      { title: "08:00 — Sự cố", description: "AZ a mất điện. Instance ASG và RDS primary ở AZ a ngừng phản hồi." },
      { title: "08:00–08:02 — Tự phục hồi", description: "ALB health check phát hiện target AZ a fail, dồn traffic sang AZ b. RDS Multi-AZ failover sang standby (đã đồng bộ). Đây là fault tolerance: hệ thống tự chịu được lỗi một thành phần." },
      { title: "08:02 — Ổn định", description: "App vẫn phục vụ, chỉ gián đoạn ngắn (~2 phút) cho request đang gọi tới AZ a. Không mất dữ liệu vì standby đồng bộ. Đây là high availability đang hoạt động đúng." },
    ],
  },
  "no-ha": {
    label: "🚨 Chỉ 1 AZ, không backup gần",
    downtimeMin: 240,
    dataLossMin: 60,
    steps: [
      { title: "08:00 — Sự cố", description: "AZ duy nhất mất điện. Toàn bộ app và DB ngừng hoạt động — không có bản sao nơi khác." },
      { title: "08:00–12:00 — Ứng cứu thủ công", description: "Đội vận hành phải: dựng EC2 mới ở AZ khác, restore RDS từ snapshot gần nhất (backup lúc 07:00), trỏ lại DNS. Đây là quy trình Disaster Recovery — chậm vì làm thủ công." },
      { title: "12:00 — Khôi phục xong", description: "App chạy lại sau 4 giờ (RTO thực tế). Dữ liệu ghi từ 07:00–08:00 (1 giờ trước snapshot) bị mất — đó là RPO thực tế, không phải mục tiêu." },
    ],
  },
};

export function HaFtDrIncidentTimelineDiagram() {
  const [scenario, setScenario] = useState<Scenario>("ha");
  const data = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["ha", "no-ha"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarios[option].label}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Cùng một sự cố, hai kiến trúc — timeline downtime & mất dữ liệu" viewBox="0 0 720 260" steps={data.steps}>
        {(step) => {
          const barWidth = Math.min(560, 40 + data.downtimeMin * (scenario === "ha" ? 60 : 2));
          return (
            <>
              <DiagramLabel x={20} y={30} text="08:00 sự cố" anchor="start" bold />
              <line x1={20} y1={44} x2={680} y2={44} strokeWidth={2} className="stroke-stone-400 dark:stroke-stone-500" />
              <circle cx={20} cy={44} r={6} className="fill-rose-500" />

              {step >= 1 && (
                <>
                  <rect x={20} y={70} width={barWidth} height={26} rx={6} className={scenario === "ha" ? "fill-emerald-200 dark:fill-emerald-900" : "fill-amber-200 dark:fill-amber-900"} />
                  <DiagramLabel x={20 + barWidth / 2} y={87} text={`Downtime: ${data.downtimeMin} phút (RTO thực tế)`} size={11} />
                </>
              )}

              {step >= 2 && (
                <>
                  <rect x={20} y={110} width={data.dataLossMin === 0 ? 8 : 200} height={26} rx={6} className={data.dataLossMin === 0 ? "fill-emerald-300 dark:fill-emerald-800" : "fill-rose-300 dark:fill-rose-800"} />
                  <DiagramLabel
                    x={20 + (data.dataLossMin === 0 ? 8 : 200) + 8}
                    y={127}
                    text={`Mất dữ liệu: ${data.dataLossMin === 0 ? "0 phút (đồng bộ)" : `${data.dataLossMin} phút (RPO thực tế)`}`}
                    anchor="start"
                    size={11}
                  />
                </>
              )}

              <DiagramNode x={20} y={165} width={200} height={70} label="AZ a" sublabel={step === 0 ? "🔥 mất điện" : "vẫn hỏng"} tone="rose" state={step === 0 ? "active" : "dimmed"} />
              <DiagramNode
                x={260}
                y={165}
                width={200}
                height={70}
                label={scenario === "ha" ? "AZ b (standby)" : "Chờ dựng lại"}
                sublabel={step >= 1 ? (scenario === "ha" ? "✅ phục vụ traffic" : "⏳ đang restore") : "chưa vào cuộc"}
                tone={step >= 1 ? "green" : "slate"}
                state={step >= 1 ? "active" : "dimmed"}
              />
              {step >= 1 && <DiagramArrow from={[124, 165]} to={[264, 200]} tone={scenario === "ha" ? "green" : "amber"} animated label={scenario === "ha" ? "failover" : "manual restore"} />}
              <DiagramNode x={500} y={165} width={200} height={70} label="User" sublabel={step >= 2 ? "vẫn dùng được app" : "gặp lỗi"} tone={step >= 2 ? "green" : "rose"} state="active" />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
