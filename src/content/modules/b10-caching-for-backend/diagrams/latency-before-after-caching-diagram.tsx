"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Percentile = "p50" | "p95" | "p99";

interface LatencySample {
  before: number;
  after: number;
  note: string;
}

const latencyMs: Record<Percentile, LatencySample> = {
  p50: {
    before: 16,
    after: 4,
    note: "Phần lớn request giờ chỉ chạm Redis (một round-trip nhỏ) thay vì Postgres — trung vị giảm mạnh nhất.",
  },
  p95: {
    before: 42,
    after: 13,
    note: "95% request vẫn nhanh hơn rõ rệt — hit rate cao (TTL 30s, endpoint đọc nhiều) nên phần lớn request nằm trong nhóm HIT.",
  },
  p99: {
    before: 68,
    after: 55,
    note: "p99 chỉ giảm nhẹ — đây thường là request MISS (key vừa hết TTL, hoặc filter hiếm) vẫn phải chạm Postgres như cũ. Cache không xoá sạch tail latency, chỉ giảm số lượng request rơi vào tail đó.",
  },
};

const scaleMaxMs = 80;
const barTrackWidth = 520;

export function LatencyBeforeAfterCachingDiagram() {
  const [percentile, setPercentile] = useState<Percentile>("p95");
  const sample = latencyMs[percentile];
  const barWidth = (value: number) => Math.round((value / scaleMaxMs) * barTrackWidth);

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-stone-500">Xem theo phân vị:</span>
      {(["p50", "p95", "p99"] as Percentile[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setPercentile(option)}
          className={clsx(
            "rounded-full px-3 py-1.5 text-sm font-medium uppercase",
            percentile === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );

  return (
    <DiagramFrame title="Latency trước/sau khi thêm cache-aside" viewBox="0 0 720 220" controls={controls} caption={sample.note}>
      <text x={20} y={40} fontSize={13} fontWeight={700} className="fill-stone-800 dark:fill-stone-200">
        Trước cache
      </text>
      <rect x={150} y={22} width={barWidth(sample.before)} height={28} rx={6} className="fill-rose-500 transition-all duration-500" />
      <text x={160 + barWidth(sample.before)} y={42} fontSize={13} fontWeight={600} className="fill-rose-600 dark:fill-rose-400">
        {sample.before} ms
      </text>

      <text x={20} y={100} fontSize={13} fontWeight={700} className="fill-stone-800 dark:fill-stone-200">
        Sau cache
      </text>
      <rect x={150} y={82} width={barWidth(sample.after)} height={28} rx={6} className="fill-emerald-500 transition-all duration-500" />
      <text x={160 + barWidth(sample.after)} y={102} fontSize={13} fontWeight={600} className="fill-emerald-600 dark:fill-emerald-400">
        {sample.after} ms
      </text>

      <line x1={150} y1={10} x2={150} y2={150} className="stroke-stone-300 dark:stroke-stone-700" strokeWidth={1} />
      <text x={20} y={180} fontSize={12} className="fill-stone-500 dark:fill-stone-400">
        Đo bằng autocannon (-c 20 -d 15) trên taskflow-api chạy local qua Docker Compose — con số minh hoạ, máy bạn sẽ khác chút.
      </text>
    </DiagramFrame>
  );
}
