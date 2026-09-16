"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses, type DiagramTone } from "@/components/diagrams/diagram-tones";

type Strategy = "none" | "cache" | "salting" | "salting-cache";

interface Scenario {
  label: string;
  /** Illustrative load per shard as % of capacity. */
  write: [number, number, number, number];
  read: [number, number, number, number];
  readPath: string;
  note: string;
}

const scenarios: Record<Strategy, Scenario> = {
  none: {
    label: "Không xử lý",
    write: [20, 85, 25, 20],
    read: [30, 110, 25, 30],
    readPath: "1 key → shard 2",
    note: "Key `stream:999:comments` nằm trọn ở shard 2. Shard 2 quá tải cả đọc lẫn ghi, trong khi shard khác rảnh — thêm shard mới cũng không giúp vì một key không thể chia nhỏ hơn.",
  },
  cache: {
    label: "Cache phía đọc",
    write: [20, 85, 25, 20],
    read: [28, 35, 24, 28],
    readPath: "Redis trước, miss mới vào shard 2",
    note: "Cache TTL ngắn (vài giây) hấp thụ phần lớn lượt đọc. Nhưng ghi vẫn dồn vào shard 2 — cache không cứu được hot key phía ghi.",
  },
  salting: {
    label: "Salting key #0..3",
    write: [41, 42, 43, 40],
    read: [52, 55, 50, 52],
    readPath: "fan-out 4 key rồi gộp",
    note: "Ghi vào `stream:999:comments#<rand 0-3>` → tải ghi rải đều. Đổi lại mỗi lượt đọc phải hỏi 4 key rồi gộp và sắp xếp: latency đọc = key chậm nhất, code phức tạp hơn.",
  },
  "salting-cache": {
    label: "Salting + cache",
    write: [41, 42, 43, 40],
    read: [22, 24, 21, 22],
    readPath: "cache kết quả đã gộp",
    note: "Kết hợp: salting giải quyết ghi, cache kết quả đã gộp giải quyết đọc. Chỉ áp dụng cho số ít key thật sự nóng (phát hiện qua metrics), không salting mọi key.",
  },
};

function tone(load: number): DiagramTone {
  if (load >= 90) return "rose";
  if (load >= 60) return "amber";
  return "green";
}

function Bars({ values, x, title }: { values: number[]; x: number; title: string }) {
  return (
    <g>
      <DiagramLabel x={x} y={30} text={title} anchor="start" bold />
      <line x1={x} x2={x + 320} y1={70} y2={70} strokeWidth={1.5} strokeDasharray="5 4" className={diagramToneClasses.rose.stroke} />
      <DiagramLabel x={x + 320} y={64} text="100% capacity" anchor="end" size={11} tone="rose" />
      {values.map((value, index) => {
        const barX = x + 12 + index * 80;
        const height = Math.min(value, 120) * 1.6;
        const barTone = tone(value);
        return (
          <g key={index}>
            <rect x={barX} y={230 - height} width={48} height={height} rx={6} className={clsx(diagramToneClasses[barTone].fill, "transition-all duration-500")} />
            <DiagramLabel x={barX + 24} y={222 - height} text={`${value}%`} tone={barTone} bold />
            <DiagramLabel x={barX + 24} y={250} text={`shard ${index + 1}`} size={11.5} />
          </g>
        );
      })}
    </g>
  );
}

export function HotKeyMitigationDiagram() {
  const [strategy, setStrategy] = useState<Strategy>("none");
  const scenario = scenarios[strategy];

  return (
    <DiagramFrame
      title="Một livestream nổi tiếng đè lên shard 2 — thử từng cách xử lý"
      viewBox="0 0 720 320"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(scenarios) as Strategy[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStrategy(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  strategy === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {scenarios[key].label}
              </button>
            ))}
          </div>
          <p className="text-stone-700 dark:text-stone-300">{scenario.note.replaceAll("`", "")}</p>
        </div>
      }
      caption="Số % chỉ để minh hoạ xu hướng, không phải số đo. Đọc > 100% nghĩa là shard không theo kịp: latency tăng, timeout."
    >
      <Bars values={scenario.write} x={20} title="✍️ Tải ghi" />
      <Bars values={scenario.read} x={380} title="📖 Tải đọc" />
      <DiagramNode x={200} y={268} width={320} height={44} label={`Đường đọc: ${scenario.readPath}`} tone={strategy === "none" ? "rose" : "cyan"} />
    </DiagramFrame>
  );
}
