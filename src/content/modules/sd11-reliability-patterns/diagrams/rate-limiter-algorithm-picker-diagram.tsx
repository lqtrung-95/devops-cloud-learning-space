"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses, type DiagramTone } from "@/components/diagrams/diagram-tones";

type Algo = "token-bucket" | "leaky-bucket" | "fixed-window" | "sliding-window";

/**
 * A client fires a burst of requests right at a window boundary, then goes idle.
 * Limit = 100 req/window sustained. Bars show requests ADMITTED per half-window slot —
 * each algorithm handles the same burst differently.
 */
const series: Record<Algo, number[]> = {
  "token-bucket": [180, 40, 40, 40, 40, 40],
  "leaky-bucket": [100, 100, 100, 100, 100, 100],
  "fixed-window": [190, 10, 190, 10, 190, 10],
  "sliding-window": [110, 90, 100, 100, 100, 100],
};

const noteByAlgo: Record<Algo, string> = {
  "token-bucket":
    "Bucket đầy sẵn token (burst capacity) → cho qua hết burst đầu (180%) ngay lập tức, sau đó chỉ refill theo rate ổn định (40%/slot). Cho phép burst hợp lệ, miễn có sẵn token.",
  "leaky-bucket":
    "Request vào hàng đợi (queue), rồi 'rò rỉ' ra ngoài đúng 1 rate cố định — burst đầu bị xếp hàng, xử lý dần đều 100%/slot. Mượt tuyệt đối nhưng burst hợp lệ cũng bị delay như burst xấu.",
  "fixed-window":
    "Đếm request theo mốc đồng hồ cố định (0-1s, 1-2s...). Client canh đúng lúc cuối window 1 và đầu window 2 bắn liền → 190% rồi 190% sát nhau thực tế là gần 380% trong 1 giây liên tục quanh biên (edge burst) dù mỗi window riêng lẻ vẫn ≤ limit.",
  "sliding-window":
    "Tính theo cửa sổ trượt theo thời gian thực (hoặc sliding window counter xấp xỉ) thay vì mốc cố định → edge burst ở ranh giới window bị triệt tiêu, đường tải phẳng hơn hẳn fixed window.",
};

function toneFor(value: number): DiagramTone {
  if (value >= 150) return "rose";
  if (value >= 100) return "amber";
  return "green";
}

const algoLabels: Record<Algo, string> = {
  "token-bucket": "Token bucket",
  "leaky-bucket": "Leaky bucket",
  "fixed-window": "Fixed window",
  "sliding-window": "Sliding window",
};

export function RateLimiterAlgorithmPickerDiagram() {
  const [algo, setAlgo] = useState<Algo>("token-bucket");
  const values = series[algo];
  const capacityY = 210 - 100 * 0.7;

  return (
    <DiagramFrame
      title="Limit 100 req/giây sustained — client bắn burst rồi im, mỗi thuật toán xử lý khác nhau"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(algoLabels) as Algo[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setAlgo(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  algo === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {algoLabels[key]}
              </button>
            ))}
          </div>
          <p className="text-stone-700 dark:text-stone-300">{noteByAlgo[algo]}</p>
        </div>
      }
      caption="Đường đứt nét = 100% sustained rate cho phép. % chỉ minh hoạ xu hướng tương đối giữa các thuật toán, không phải benchmark thật."
    >
      <line x1={40} x2={700} y1={capacityY} y2={capacityY} strokeWidth={1.5} strokeDasharray="6 4" className={diagramToneClasses.rose.stroke} />
      <DiagramLabel x={700} y={capacityY - 6} text="100% sustained" anchor="end" size={11} tone="rose" />

      {values.map((value, index) => {
        const barX = 60 + index * 105;
        const height = Math.min(value, 400) * 0.42;
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
            <DiagramLabel x={barX + 32} y={232} text={`slot ${index + 1}`} size={11.5} />
          </g>
        );
      })}
    </DiagramFrame>
  );
}
