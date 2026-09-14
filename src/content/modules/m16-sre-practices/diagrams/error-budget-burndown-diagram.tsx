"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { InlineCodeText } from "@/components/ui/inline-code-text";

type Severity = "none" | "minor" | "major" | "critical";

// Rough minutes of budget consumed per day of incident, out of a 216-minute (99.5%/30d) budget.
const dailyBurn: Record<Severity, number> = { none: 2, minor: 8, major: 40, critical: 120 };
const BUDGET_MINUTES = 216;
const DAYS = 30;

const severities: { key: Severity; label: string; emoji: string }[] = [
  { key: "none", label: "Ngày bình thường", emoji: "🙂" },
  { key: "minor", label: "Sự cố nhỏ", emoji: "⚠️" },
  { key: "major", label: "Sự cố lớn", emoji: "🔥" },
  { key: "critical", label: "Sập hoàn toàn 2 giờ", emoji: "💥" },
];

export function ErrorBudgetBurndownDiagram() {
  const [severity, setSeverity] = useState<Severity>("minor");
  const [freezeEnabled, setFreezeEnabled] = useState(true);

  const points: number[] = [BUDGET_MINUTES];
  let remaining = BUDGET_MINUTES;
  let frozeOnDay = -1;
  for (let day = 1; day <= DAYS; day++) {
    const frozen = freezeEnabled && remaining <= BUDGET_MINUTES * 0.2;
    if (frozen && frozeOnDay === -1) frozeOnDay = day;
    const burn = frozen ? dailyBurn.none : dailyBurn[severity];
    remaining = Math.max(0, remaining - burn);
    points.push(remaining);
  }

  const width = 620;
  const height = 160;
  const originX = 70;
  const originY = 40;
  const toX = (day: number) => originX + (day / DAYS) * width;
  const toY = (value: number) => originY + height - (value / BUDGET_MINUTES) * height;
  const path = points.map((value, day) => `${day === 0 ? "M" : "L"} ${toX(day)} ${toY(value)}`).join(" ");
  const exhausted = remaining <= 0;

  return (
    <DiagramFrame
      title="Error budget burn-down — 30 ngày"
      viewBox="0 0 720 260"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {severities.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSeverity(item.key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  severity === item.key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {item.emoji} {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFreezeEnabled((current) => !current)}
              className={clsx("rounded-full px-3 py-1.5 font-medium", freezeEnabled ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
            >
              {freezeEnabled ? "✅ Freeze policy: bật" : "❌ Freeze policy: tắt"}
            </button>
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            {exhausted ? (
              <InlineCodeText text="Budget về 0 trước khi hết tháng — SLO vi phạm. Nếu freeze policy đã bật đúng lúc còn 20% budget, đội ngừng release tính năng và tập trung sửa độ tin cậy." />
            ) : frozeOnDay > 0 ? (
              <InlineCodeText text={`Ngày ${frozeOnDay}: budget chạm ngưỡng 20% → freeze policy tự kích hoạt, chỉ còn fix độ tin cậy được release. Đường burn-down phẳng lại.`} />
            ) : (
              <InlineCodeText text="Budget còn dư tới cuối tháng 30 ngày — đội được release tính năng mới bình thường." />
            )}
          </p>
        </div>
      }
      caption="Trục ngang: ngày trong cửa sổ 30 ngày. Trục dọc: error budget còn lại (phút). Freeze policy: khi budget chạm ngưỡng thấp, tạm dừng release tính năng."
    >
      <line x1={originX} y1={originY} x2={originX} y2={originY + height} className="stroke-stone-400 dark:stroke-stone-600" strokeWidth={1.5} />
      <line x1={originX} y1={originY + height} x2={originX + width} y2={originY + height} className="stroke-stone-400 dark:stroke-stone-600" strokeWidth={1.5} />
      <line x1={originX} y1={toY(BUDGET_MINUTES * 0.2)} x2={originX + width} y2={toY(BUDGET_MINUTES * 0.2)} strokeDasharray="5 4" className="stroke-amber-500" strokeWidth={1.5} />
      <DiagramLabel x={originX + width - 4} y={toY(BUDGET_MINUTES * 0.2) - 6} text="ngưỡng freeze 20%" anchor="end" tone="amber" size={11} />
      <path d={path} fill="none" className={clsx(exhausted ? "stroke-rose-500" : "stroke-cyan-500", "transition-all duration-300")} strokeWidth={3} />
      <DiagramLabel x={originX - 8} y={originY + 4} text={`${BUDGET_MINUTES}p`} anchor="end" size={11} />
      <DiagramLabel x={originX - 8} y={originY + height + 4} text="0p" anchor="end" size={11} />
      <DiagramLabel x={originX} y={originY + height + 22} text="ngày 0" anchor="start" size={11} />
      <DiagramLabel x={originX + width} y={originY + height + 22} text="ngày 30" anchor="end" size={11} />
      <DiagramNode x={originX + width - 30} y={toY(remaining) - 14} width={28} height={28} label="" tone={exhausted ? "rose" : "cyan"} rounded={14} />
    </DiagramFrame>
  );
}
