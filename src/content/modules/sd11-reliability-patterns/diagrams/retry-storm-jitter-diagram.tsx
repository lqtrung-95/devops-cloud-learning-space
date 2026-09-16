"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses, type DiagramTone } from "@/components/diagrams/diagram-tones";

type Mode = "no-jitter" | "full-jitter";

/**
 * Request rate hitting a dependency that just recovered from an outage, across 6 one-second
 * buckets. Without jitter, every client's exponential-backoff retry lands on the same tick
 * (1s, 2s, 4s...) producing synchronized spikes far above capacity — a retry storm that can
 * knock the dependency back down. Full jitter (`random(0, min(cap, base*2^attempt))`) spreads
 * those same retries across each interval, staying under capacity.
 */
const series: Record<Mode, number[]> = {
  "no-jitter": [310, 15, 275, 10, 240, 8],
  "full-jitter": [92, 88, 95, 85, 90, 87],
};

const noteByMode: Record<Mode, string> = {
  "no-jitter":
    "Mọi client cùng backoff theo cấp số nhân (1s, 2s, 4s...) — tới đúng giây đó, TẤT CẢ đều bắn retry cùng lúc. Đỉnh vượt xa capacity, dependency vừa hồi phục lại sập tiếp.",
  "full-jitter":
    "Mỗi client chọn thời điểm retry ngẫu nhiên trong khoảng `random(0, min(cap, base*2^attempt))` — cùng tổng số retry nhưng trải đều theo thời gian, không tick nào vượt capacity.",
};

function toneFor(value: number): DiagramTone {
  if (value >= 150) return "rose";
  if (value >= 100) return "amber";
  return "green";
}

export function RetryStormJitterDiagram() {
  const [mode, setMode] = useState<Mode>("no-jitter");
  const values = series[mode];
  const capacityY = 210 - 100 * 1.2;

  return (
    <DiagramFrame
      title="Dependency vừa hồi phục sau outage — request/giây trong 6 giây tiếp theo"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("no-jitter")}
              className={clsx(
                "rounded-full px-3 py-1.5 font-medium",
                mode === "no-jitter" ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
              )}
            >
              Backoff không jitter
            </button>
            <button
              type="button"
              onClick={() => setMode("full-jitter")}
              className={clsx(
                "rounded-full px-3 py-1.5 font-medium",
                mode === "full-jitter" ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
              )}
            >
              Full jitter
            </button>
          </div>
          <p className="text-stone-700 dark:text-stone-300">{noteByMode[mode]}</p>
        </div>
      }
      caption="Đường đứt nét = capacity dependency chịu được (100%). % chỉ minh hoạ xu hướng tương đối, không phải số đo thật."
    >
      <line x1={40} x2={700} y1={capacityY} y2={capacityY} strokeWidth={1.5} strokeDasharray="6 4" className={diagramToneClasses.rose.stroke} />
      <DiagramLabel x={700} y={capacityY - 6} text="capacity 100%" anchor="end" size={11} tone="rose" />

      {values.map((value, index) => {
        const barX = 60 + index * 105;
        const height = Math.min(value, 320) * 0.6;
        const barTone = toneFor(value);
        return (
          <g key={index}>
            <rect
              x={barX}
              y={210 - height}
              width={64}
              height={height}
              rx={6}
              className={clsx(diagramToneClasses[barTone].fill, "transition-all duration-500")}
            />
            <DiagramLabel x={barX + 32} y={202 - height} text={`${value}%`} tone={barTone} bold />
            <DiagramLabel x={barX + 32} y={232} text={`t=${index + 1}s`} size={11.5} />
          </g>
        );
      })}
    </DiagramFrame>
  );
}
