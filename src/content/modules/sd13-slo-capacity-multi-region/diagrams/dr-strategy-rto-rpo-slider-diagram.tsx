"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel } from "@/components/diagrams/diagram-shapes";

interface DrStep {
  label: string;
  emoji: string;
  /** 0-100, used to size the RTO/RPO/cost gauge bars. */
  rtoScore: number;
  rpoScore: number;
  costScore: number;
  rtoText: string;
  rpoText: string;
  note: string;
}

const steps: DrStep[] = [
  {
    label: "Backup & restore",
    emoji: "💾",
    rtoScore: 100,
    rpoScore: 90,
    costScore: 15,
    rtoText: "vài giờ",
    rpoText: "theo lịch backup (vd 24h)",
    note: "Chỉ chạy pg_dump/pg_basebackup định kỳ (SD06). Khi sự cố: dựng lại hạ tầng từ đầu rồi pg_restore.",
  },
  {
    label: "Pilot light",
    emoji: "🕯️",
    rtoScore: 55,
    rpoScore: 20,
    costScore: 40,
    rtoText: "vài chục phút",
    rpoText: "vài phút (WAL archiving liên tục)",
    note: "DB replica chạy sẵn dạng thu nhỏ ở region DR; app server tắt, bật lên khi cần.",
  },
  {
    label: "Warm standby",
    emoji: "🌤️",
    rtoScore: 20,
    rpoScore: 8,
    costScore: 70,
    rtoText: "vài phút",
    rpoText: "gần như 0",
    note: "Toàn bộ stack chạy ở cả 2 region, nhưng DR chỉ chạy capacity nhỏ — scale-out khi failover.",
  },
  {
    label: "Multi-site active-active",
    emoji: "🌍",
    rtoScore: 3,
    rpoScore: 2,
    costScore: 100,
    rtoText: "gần như 0",
    rpoText: "gần như 0",
    note: "Cả 2 region cùng phục vụ traffic thật ngày thường — mất 1 region, region kia đã quen tải.",
  },
];

const gaugeWidth = 300;

function Gauge({ y, label, score, value, tone }: { y: number; label: string; score: number; value: string; tone: string }) {
  return (
    <g>
      <text x={20} y={y} fontSize={12} className="fill-stone-600 dark:fill-stone-400">
        {label}
      </text>
      <text x={20 + gaugeWidth} y={y} textAnchor="end" fontSize={12} fontWeight={600} className="fill-stone-800 dark:fill-stone-200">
        {value}
      </text>
      <rect x={20} y={y + 8} width={gaugeWidth} height={10} rx={5} className="fill-stone-100 dark:fill-stone-800" />
      <rect x={20} y={y + 8} width={(gaugeWidth * score) / 100} height={10} rx={5} className={tone} />
    </g>
  );
}

/**
 * DR-strategy picker driven by a single range slider (0-3) instead of discrete buttons.
 * RTO and RPO gauges shrink and the cost gauge grows as you slide toward active-active,
 * making the "spend more, recover faster" trade-off feel continuous.
 */
export function DrStrategyRtoRpoSliderDiagram() {
  const [index, setIndex] = useState(1);
  const step = steps[index];

  return (
    <DiagramFrame
      title="Kéo thanh trượt: 4 chiến lược DR, đánh đổi RTO/RPO lấy chi phí"
      viewBox="0 0 720 250"
      controls={
        <div className="space-y-3">
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={index}
            onChange={(event) => setIndex(Number(event.target.value))}
            className="w-full accent-indigo-600"
            aria-label="Chọn chiến lược DR"
          />
          <div className="flex justify-between text-xs text-stone-500">
            {steps.map((item, itemIndex) => (
              <span key={item.label} className={itemIndex === index ? "font-semibold text-indigo-600 dark:text-indigo-400" : ""}>
                {item.emoji} {item.label}
              </span>
            ))}
          </div>
          <p className="text-sm text-stone-700 dark:text-stone-300">{step.note}</p>
        </div>
      }
      caption="RTO/RPO nhỏ nghĩa là phục hồi nhanh, mất ít dữ liệu — nhưng chi phí vận hành 2 region tăng theo. Chọn theo mức chịu đựng downtime/mất dữ liệu THẬT của business, không chọn 'càng tốt càng hay'."
    >
      <Gauge y={30} label="RTO (thời gian ngừng chấp nhận được)" score={step.rtoScore} value={step.rtoText} tone="fill-blue-500 dark:fill-blue-400" />
      <Gauge y={65} label="RPO (dữ liệu mất chấp nhận được)" score={step.rpoScore} value={step.rpoText} tone="fill-violet-500 dark:fill-violet-400" />
      <Gauge
        y={100}
        label="Chi phí tương đối"
        score={step.costScore}
        value={"💰".repeat(Math.max(1, Math.ceil(step.costScore / 25)))}
        tone="fill-amber-500 dark:fill-amber-400"
      />

      <DiagramLabel x={580} y={35} text="Region chính" size={13} bold />
      <circle cx={580} cy={70} r={28} className="fill-blue-50 stroke-blue-500 dark:fill-blue-950 dark:stroke-blue-400" strokeWidth={2} />
      <text x={580} y={78} textAnchor="middle" fontSize={22}>
        🏢
      </text>

      <DiagramLabel x={580} y={140} text="Region DR" size={13} bold />
      <circle
        cx={580}
        cy={175}
        r={10 + step.costScore * 0.16}
        className="fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950 dark:stroke-emerald-400"
        strokeWidth={2}
      />
      <text x={580} y={181} textAnchor="middle" fontSize={14 + step.costScore * 0.06}>
        {step.emoji}
      </text>
    </DiagramFrame>
  );
}
