"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses, type DiagramTone } from "@/components/diagrams/diagram-tones";

type KeyOption = "created-at" | "message-id" | "channel-id" | "channel-bucket";

interface QueryRoute {
  query: string;
  shards: string;
  cheap: boolean;
}

interface Option {
  label: string;
  strategy: string;
  /** % write load per shard. */
  writeLoad: [number, number, number, number];
  queries: QueryRoute[];
  note: string;
}

const options: Record<KeyOption, Option> = {
  "created-at": {
    label: "created_at (range theo tháng)",
    strategy: "range",
    writeLoad: [0, 0, 0, 100],
    queries: [
      { query: "Gửi tin mới", shards: "luôn shard tháng này 🔥", cheap: false },
      { query: "50 tin mới nhất của #general", shards: "1 shard (nhưng quá tải)", cheap: true },
      { query: "Tất cả tin của user 42", shards: "cả 4 shard", cheap: false },
    ],
    note: "Mọi ghi mới dồn vào shard mới nhất, shard cũ gần như ngồi chơi. Range hợp với quét theo khoảng, không hợp với ghi theo thời gian.",
  },
  "message-id": {
    label: "hash(message_id)",
    strategy: "hash",
    writeLoad: [25, 25, 25, 25],
    queries: [
      { query: "Gửi tin mới", shards: "1 shard, rải đều", cheap: true },
      { query: "50 tin mới nhất của #general", shards: "cả 4 shard + merge sort", cheap: false },
      { query: "Tất cả tin của user 42", shards: "cả 4 shard", cheap: false },
    ],
    note: "Phân bố đẹp nhất nhưng tin của cùng một channel bị rải khắp nơi — query nóng nhất phải scatter-gather.",
  },
  "channel-id": {
    label: "hash(channel_id)",
    strategy: "hash",
    writeLoad: [52, 16, 17, 15],
    queries: [
      { query: "Gửi tin mới", shards: "1 shard", cheap: true },
      { query: "50 tin mới nhất của #general", shards: "1 shard ✓", cheap: true },
      { query: "Tất cả tin của user 42", shards: "cả 4 shard", cheap: false },
    ],
    note: "Query theo channel chỉ chạm 1 shard. Nhưng một channel khổng lồ (server game 1 triệu member) biến shard của nó thành hot shard, và partition đó phình mãi không giới hạn.",
  },
  "channel-bucket": {
    label: "(channel_id, bucket 10 ngày)",
    strategy: "hash",
    writeLoad: [30, 24, 23, 23],
    queries: [
      { query: "Gửi tin mới", shards: "1 shard", cheap: true },
      { query: "50 tin mới nhất của #general", shards: "1–2 partition ✓", cheap: true },
      { query: "Tất cả tin của user 42", shards: "cả 4 shard → cần bảng index riêng", cheap: false },
    ],
    note: "Kiểu Discord mô tả trong blog: partition = channel + khoảng thời gian, nên kích thước mỗi partition có trần. Channel lớn vẫn nóng hơn, nhưng dữ liệu của nó được chia theo thời gian.",
  },
};

function loadTone(load: number): DiagramTone {
  if (load >= 60) return "rose";
  if (load >= 35) return "amber";
  return "green";
}

export function ShardKeyChoiceDiagram() {
  const [choice, setChoice] = useState<KeyOption>("created-at");
  const option = options[choice];

  return (
    <DiagramFrame
      title="Chọn shard key cho bảng messages — xem tải và đường đi của query"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(options) as KeyOption[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setChoice(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-mono text-xs font-medium",
                  choice === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {options[key].label}
              </button>
            ))}
          </div>
          <p className="text-stone-700 dark:text-stone-300">{option.note}</p>
        </div>
      }
      caption="4 shard, số % là tải ghi minh hoạ (không phải số đo). Xanh: ổn · vàng: lệch · đỏ: hot shard."
    >
      <DiagramLabel x={20} y={24} text={`Chiến lược: ${option.strategy} · tải ghi mỗi shard`} anchor="start" bold />
      {option.writeLoad.map((load, index) => {
        const x = 20 + index * 90;
        const barHeight = Math.max(4, (load / 100) * 130);
        const tone = loadTone(load);
        return (
          <g key={index}>
            <rect x={x + 18} y={40} width={44} height={130} rx={6} className={diagramToneClasses.slate.shape} strokeWidth={1} />
            <rect x={x + 18} y={170 - barHeight} width={44} height={barHeight} rx={6} className={clsx(diagramToneClasses[tone].fill, "transition-all duration-500")} />
            <DiagramLabel x={x + 40} y={188} text={`${load}%`} tone={tone} bold />
            <DiagramNode x={x + 4} y={200} width={72} height={36} label={`shard ${index + 1}`} tone={tone} state={load >= 60 ? "active" : "normal"} />
          </g>
        );
      })}

      <DiagramLabel x={390} y={24} text="Query nào đi mấy shard?" anchor="start" bold />
      {option.queries.map((route, index) => (
        <DiagramNode
          key={route.query}
          x={390}
          y={40 + index * 66}
          width={320}
          height={56}
          label={route.query}
          sublabel={route.shards}
          tone={route.cheap ? "green" : "rose"}
        />
      ))}
      <DiagramLabel x={20} y={270} text="Đổi shard key sau này = di chuyển toàn bộ dữ liệu" anchor="start" tone="amber" size={12} />
    </DiagramFrame>
  );
}
