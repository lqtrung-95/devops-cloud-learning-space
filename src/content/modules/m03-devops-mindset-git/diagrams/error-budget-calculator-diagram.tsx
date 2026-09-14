"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

const MINUTES_IN_30_DAYS = 30 * 24 * 60;
const sloOptions = [99, 99.5, 99.9, 99.95, 99.99];

const incidentPresets = [
  { label: "Blip mạng 2 phút", minutes: 2 },
  { label: "Deploy lỗi, rollback sau 15 phút", minutes: 15 },
  { label: "DB sự cố 45 phút", minutes: 45 },
];

const BAR_X = 60;
const BAR_WIDTH = 600;

function formatMinutes(value: number): string {
  return `${Number(value.toFixed(2)).toLocaleString("en-US")} phút`;
}

export function ErrorBudgetCalculatorDiagram() {
  const [slo, setSlo] = useState(99.9);
  const [incidents, setIncidents] = useState<{ label: string; minutes: number }[]>([]);

  const budget = ((100 - slo) / 100) * MINUTES_IN_30_DAYS;
  const used = incidents.reduce((sum, incident) => sum + incident.minutes, 0);
  const ratio = used / budget;
  const availability = 100 - (used / MINUTES_IN_30_DAYS) * 100;
  const decision =
    ratio >= 1
      ? { label: "⛔ Hết error budget", sublabel: "đóng băng release tính năng, dồn sức cho reliability", tone: "rose" as const }
      : ratio >= 0.75
        ? { label: "⚠️ Sắp cạn budget", sublabel: "chậm lại thay đổi rủi ro, ưu tiên sửa nguyên nhân", tone: "amber" as const }
        : { label: "✅ Còn nhiều budget", sublabel: "cứ deploy tính năng mới, chấp nhận rủi ro hợp lý", tone: "green" as const };

  return (
    <DiagramFrame
      title="Error budget: chọn SLO, thêm sự cố, xem team được phép làm gì"
      viewBox="0 0 720 270"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-stone-600 dark:text-stone-400">SLO availability:</span>
            {sloOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSlo(option)}
                className={clsx("rounded-full px-3 py-1 font-mono text-[13px]", slo === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
              >
                {option}%
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {incidentPresets.map((preset) => (
              <button key={preset.label} type="button" onClick={() => setIncidents([...incidents, preset])} className="rounded-lg bg-rose-600 px-3 py-1 font-medium text-white hover:bg-rose-700">
                💥 {preset.label}
              </button>
            ))}
            <button type="button" onClick={() => setIncidents([])} className="rounded-lg border border-stone-300 px-3 py-1 font-medium dark:border-stone-700">
              Tháng mới (reset)
            </button>
          </div>
        </div>
      }
      caption="Error budget = phần 'được phép hỏng' của SLO. 100% là mục tiêu sai: càng nhiều số 9, budget càng nhỏ, chi phí và độ chậm của việc thay đổi càng lớn. Ngưỡng hành động ở đây là ví dụ — mỗi team tự thống nhất error budget policy."
    >
      <DiagramLabel x={BAR_X} y={30} anchor="start" text={`SLO ${slo}% trong 30 ngày → budget ${formatMinutes(budget)} downtime`} bold size={14} />
      <rect x={BAR_X} y={48} width={BAR_WIDTH} height={36} rx={8} className="fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950 dark:stroke-emerald-400" strokeWidth={1.5} />
      <rect
        x={BAR_X}
        y={48}
        width={Math.min(ratio, 1) * BAR_WIDTH}
        height={36}
        rx={8}
        className={clsx("transition-all duration-500", ratio >= 1 ? "fill-rose-400 dark:fill-rose-600" : ratio >= 0.75 ? "fill-amber-300 dark:fill-amber-600" : "fill-emerald-300 dark:fill-emerald-700")}
      />
      <DiagramLabel x={BAR_X + BAR_WIDTH / 2} y={71} text={`đã dùng ${formatMinutes(used)} · ${Math.round(ratio * 100)}% budget`} bold size={13} />
      <DiagramLabel
        x={BAR_X}
        y={108}
        anchor="start"
        size={12.5}
        text={`Availability thực tế: ${availability.toFixed(3)}% · còn lại: ${ratio >= 1 ? `vượt ${formatMinutes(used - budget)}` : formatMinutes(budget - used)}`}
        tone={ratio >= 1 ? "rose" : "slate"}
      />
      {incidents.slice(-4).map((incident, index) => (
        <DiagramLabel key={`${index}-${incident.label}`} x={BAR_X} y={140 + index * 22} anchor="start" size={12} tone="rose" text={`💥 ${incident.label}`} />
      ))}
      {incidents.length === 0 && <DiagramLabel x={BAR_X} y={140} anchor="start" size={12} tone="slate" text="Chưa có sự cố nào trong tháng" />}
      <DiagramNode x={320} y={130} width={390} height={100} label={decision.label} sublabel={decision.sublabel} tone={decision.tone} state="active" />
    </DiagramFrame>
  );
}
