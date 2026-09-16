"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type SloLevel = "999" | "9999" | "99999";
type BurnRate = 1 | 6 | 14.4;

interface SloInfo {
  label: string;
  budgetMinutesPerMonth: number;
  tone: DiagramTone;
}

const sloLevels: Record<SloLevel, SloInfo> = {
  "999": { label: "99,9%", budgetMinutesPerMonth: 43.8, tone: "blue" },
  "9999": { label: "99,99%", budgetMinutesPerMonth: 4.4, tone: "amber" },
  "99999": { label: "99,999%", budgetMinutesPerMonth: 0.43, tone: "rose" },
};

const burnRates: BurnRate[] = [1, 6, 14.4];

/**
 * Time-to-exhaust the error budget, in days, at a given burn rate over a 30-day window.
 * Burn rate is already normalized to the window (Google SRE Workbook definition), so the
 * absolute budget size (minutes/month) doesn't change this — only how bad a full exhaustion is.
 */
function daysToExhaust(burnRate: BurnRate): number {
  return 30 / burnRate;
}

function designImplication(level: SloLevel, burnRate: BurnRate): { text: string; tone: DiagramTone } {
  const days = daysToExhaust(burnRate);
  if (level === "99999") {
    return {
      text: "Ngân sách chỉ ~26 giây/tháng — con người không kịp phản ứng dù burn rate nào. Bắt buộc: multi-region active-active + failover tự động.",
      tone: "rose",
    };
  }
  if (days <= 2) {
    return { text: `Còn ~${days.toFixed(1)} ngày là cạn ngân sách — cần multi-AZ với failover tự động, không kịp chờ người trực xử lý bằng tay.`, tone: "rose" };
  }
  if (days <= 7) {
    return { text: `Còn ~${days.toFixed(1)} ngày — on-call cần được page ngay, multi-AZ là tối thiểu bắt buộc.`, tone: "amber" };
  }
  return { text: `Còn ~${days.toFixed(1)} ngày — đủ thời gian để review thủ công; 1 AZ có giám sát tốt có thể tạm chấp nhận.`, tone: "green" };
}

const buttonClass = (active: boolean) =>
  active
    ? "rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
    : "rounded-full bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300";

/**
 * Ties an SLO's monthly error-budget to a concrete architecture decision: at a given
 * SLO level and burn rate, how many days until the budget is gone — and what that
 * forces you to build (manual review vs multi-AZ vs multi-region auto-failover).
 */
export function ErrorBudgetBurnDesignDiagram() {
  const [level, setLevel] = useState<SloLevel>("999");
  const [burnRate, setBurnRate] = useState<BurnRate>(6);

  const info = sloLevels[level];
  const days = daysToExhaust(burnRate);
  const remainingFraction = Math.max(0, Math.min(1, days / 30));
  const implication = designImplication(level, burnRate);

  return (
    <DiagramFrame
      title="Ngân sách lỗi (error budget) hết trong bao lâu — và kiến trúc nào cần theo kịp"
      viewBox="0 0 720 250"
      controls={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">Mức SLO:</span>
            {(Object.keys(sloLevels) as SloLevel[]).map((key) => (
              <button key={key} type="button" onClick={() => setLevel(key)} className={buttonClass(level === key)}>
                {sloLevels[key].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">Burn rate:</span>
            {burnRates.map((rate) => (
              <button key={rate} type="button" onClick={() => setBurnRate(rate)} className={buttonClass(burnRate === rate)}>
                {rate}×
              </button>
            ))}
          </div>
        </div>
      }
      caption={`Ngân sách tháng: ${info.budgetMinutesPerMonth} phút (theo Phụ lục B). Ở burn rate ${burnRate}×, ngân sách cạn trong ~${days.toFixed(1)} ngày.`}
    >
      <DiagramNode x={20} y={20} width={180} height={60} label={`SLO ${info.label}`} sublabel={`${info.budgetMinutesPerMonth} phút/tháng`} tone={info.tone} state="active" />

      <rect x={20} y={100} width={400} height={28} rx={6} className="fill-stone-100 dark:fill-stone-800" />
      <rect
        x={20}
        y={100}
        width={400 * remainingFraction}
        height={28}
        rx={6}
        className={
          implication.tone === "rose"
            ? "fill-rose-500 dark:fill-rose-400"
            : implication.tone === "amber"
              ? "fill-amber-500 dark:fill-amber-400"
              : "fill-emerald-500 dark:fill-emerald-400"
        }
      />
      <DiagramLabel x={220} y={118} text={`còn lại ~${days.toFixed(1)}/30 ngày`} size={12} />

      <DiagramArrow from={[420, 114]} to={[500, 114]} tone="slate" label="⇒ quyết định" />

      <DiagramNode
        x={500}
        y={70}
        width={200}
        height={90}
        label="Kiến trúc cần có"
        sublabel={implication.text.length > 70 ? implication.text.slice(0, 70) + "…" : implication.text}
        tone={implication.tone}
        state="active"
      />

      <DiagramLabel x={360} y={230} text={implication.text} size={12} />
    </DiagramFrame>
  );
}
