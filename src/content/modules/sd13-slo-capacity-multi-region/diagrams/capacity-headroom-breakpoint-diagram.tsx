"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel } from "@/components/diagrams/diagram-shapes";

type Multiplier = 1 | 2 | 5 | 10;

interface ResourceUsage {
  key: string;
  label: string;
  emoji: string;
  /** Usage % at 1x load. */
  baseUsage: number;
  /** How usage scales with load: "linear" (scales with multiplier) or "stepped" (jumps hard past a hard limit). */
  hardLimitAtMultiplier?: Multiplier;
}

const resources: ResourceUsage[] = [
  { key: "cpu", label: "CPU app", emoji: "🖥️", baseUsage: 35 },
  { key: "db-conn", label: "Postgres connections", emoji: "🗄️", baseUsage: 40, hardLimitAtMultiplier: 5 },
  { key: "cache-mem", label: "Redis memory", emoji: "🧠", baseUsage: 20 },
];

const multipliers: Multiplier[] = [1, 2, 5, 10];

/** Usage % at a given load multiplier — CPU/memory scale ~linearly, DB connections hit a hard ceiling and stay pinned at 100% (rejecting new connections) once past it. */
function usageAt(resource: ResourceUsage, multiplier: Multiplier): number {
  if (resource.hardLimitAtMultiplier && multiplier >= resource.hardLimitAtMultiplier) return 100;
  return Math.min(100, resource.baseUsage * multiplier);
}

function barTone(usage: number): string {
  if (usage >= 100) return "fill-rose-500 dark:fill-rose-400";
  if (usage >= 70) return "fill-amber-500 dark:fill-amber-400";
  return "fill-emerald-500 dark:fill-emerald-400";
}

const buttonClass = (active: boolean) =>
  active
    ? "rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
    : "rounded-full bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300";

/**
 * Shows headroom for 3 resources (app CPU, Postgres connections, Redis memory) as load
 * scales up. CPU/memory degrade gracefully (scale-out fixes them); Postgres connections
 * hit a hard ceiling (`max_connections`) and reject new work outright past 5x — teaching
 * that "which breaks first" depends on the TYPE of limit, not just the raw number.
 */
export function CapacityHeadroomBreakpointDiagram() {
  const [multiplier, setMultiplier] = useState<Multiplier>(1);

  const barWidth = 380;
  const barHeight = 26;
  const gapY = 55;

  const firstBroken = resources.find((resource) => usageAt(resource, multiplier) >= 100);

  return (
    <DiagramFrame
      title="Headroom 3 thành phần khi load tăng — cái nào vỡ trước?"
      viewBox="0 0 720 260"
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-500">Load:</span>
          {multipliers.map((value) => (
            <button key={value} type="button" onClick={() => setMultiplier(value)} className={buttonClass(multiplier === value)}>
              {value}×
            </button>
          ))}
        </div>
      }
      caption={
        firstBroken
          ? `Ở ${multiplier}×, "${firstBroken.label}" vỡ trước (đạt giới hạn cứng, từ chối request mới) — dù CPU/memory còn scale-out được, connection Postgres không tự scale.`
          : `Ở ${multiplier}×, cả 3 thành phần còn headroom — chưa có gì vỡ.`
      }
    >
      {resources.map((resource, index) => {
        const usage = usageAt(resource, multiplier);
        const y = 30 + index * gapY;
        return (
          <g key={resource.key}>
            <text x={20} y={y - 8} fontSize={13} fontWeight={600} className="fill-stone-800 dark:fill-stone-200">
              {resource.emoji} {resource.label}
            </text>
            <rect x={20} y={y} width={barWidth} height={barHeight} rx={5} className="fill-stone-100 dark:fill-stone-800" />
            <rect x={20} y={y} width={(barWidth * usage) / 100} height={barHeight} rx={5} className={barTone(usage)} />
            <DiagramLabel x={20 + barWidth + 40} y={y + 18} text={usage >= 100 ? "VỠ (100%+)" : `${usage.toFixed(0)}%`} anchor="start" size={13} bold />
          </g>
        );
      })}
      <DiagramLabel x={360} y={230} text="CPU & Redis memory: scale-out cứu được. Postgres connections: giới hạn cứng, cần PgBouncer hoặc tăng max_connections." size={11.5} />
    </DiagramFrame>
  );
}
