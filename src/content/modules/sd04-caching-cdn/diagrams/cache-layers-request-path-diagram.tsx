"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type LayerId = "browser" | "cdn" | "nginx" | "redis" | "db";

interface Layer {
  id: LayerId;
  label: string;
  sublabel: string;
  emoji: string;
  x: number;
  y: number;
  tone: DiagramTone;
  /** Illustrative round-trip latency when the request is answered at this layer. */
  latency: string;
  originWork: string;
  goodFor: string;
}

// Assumption: user in Vietnam, CDN edge in the same country, origin in a Singapore region.
const layers: Layer[] = [
  { id: "browser", label: "Browser", sublabel: "HTTP cache", emoji: "🧑‍💻", x: 10, y: 50, tone: "violet", latency: "~0 ms (không ra mạng)", originWork: "0 request tới origin", goodFor: "Asset có hash trong tên, ảnh, font — max-age dài" },
  { id: "cdn", label: "CDN edge", sublabel: "gần user", emoji: "🌏", x: 154, y: 50, tone: "cyan", latency: "~20 ms", originWork: "0 request tới origin", goodFor: "Static asset, trang/API public giống nhau cho mọi người" },
  { id: "nginx", label: "Nginx", sublabel: "proxy_cache", emoji: "🚪", x: 298, y: 50, tone: "blue", latency: "~60 ms", originWork: "Nginx trả từ disk, app không chạy", goodFor: "API public đọc nhiều, TTL vài giây — che app khỏi đỉnh tải" },
  { id: "redis", label: "App + Redis", sublabel: "cache-aside", emoji: "🗂️", x: 442, y: 50, tone: "amber", latency: "~65 ms", originWork: "App chạy, 1 round trip Redis (~0,5 ms)", goodFor: "Object/kết quả query theo key, dữ liệu theo user" },
  { id: "db", label: "Postgres", sublabel: "buffer cache", emoji: "🐘", x: 586, y: 50, tone: "green", latency: "~110 ms", originWork: "App + query DB (giả lập 50 ms)", goodFor: "Nguồn sự thật; buffer cache của DB giúp đọc trang nóng từ RAM" },
];

const NODE_WIDTH = 124;
const NODE_HEIGHT = 92;

export function CacheLayersRequestPathDiagram() {
  const [hitLayer, setHitLayer] = useState<LayerId>("redis");
  const hitIndex = layers.findIndex((layer) => layer.id === hitLayer);
  const hit = layers[hitIndex];

  const controls = (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-stone-600 dark:text-stone-400">Dữ liệu có sẵn ở tầng:</span>
      {layers.map((layer) => (
        <button
          key={layer.id}
          type="button"
          onClick={() => setHitLayer(layer.id)}
          className={clsx("rounded-full px-3 py-1.5 font-medium", hitLayer === layer.id ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
        >
          {layer.label}
        </button>
      ))}
    </div>
  );

  return (
    <DiagramFrame
      title="Request dừng ở tầng cache nào?"
      viewBox="0 0 720 300"
      controls={controls}
      caption="Latency là số minh hoạ theo giả định: user ở Việt Nam, CDN edge trong nước, origin ở region Singapore. Tầng càng gần user, càng ít việc cho các tầng phía sau — nhưng càng khó xoá khi dữ liệu đổi."
    >
      {layers.map((layer, index) => {
        const passed = index < hitIndex;
        const isHit = index === hitIndex;
        return (
          <g key={layer.id}>
            {index > 0 && (
              <DiagramArrow
                from={[layers[index - 1].x + NODE_WIDTH + 2, 96]}
                to={[layer.x - 2, 96]}
                tone={index <= hitIndex ? "violet" : "slate"}
                animated={index <= hitIndex}
                dimmed={index > hitIndex}
              />
            )}
            <DiagramNode
              x={layer.x}
              y={layer.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              label={layer.label}
              sublabel={isHit ? (layer.id === "db" ? "✅ đọc từ nguồn" : "✅ HIT") : passed ? "MISS → đi tiếp" : layer.sublabel}
              emoji={layer.emoji}
              tone={isHit ? "green" : passed ? "amber" : layer.tone}
              state={isHit ? "active" : passed ? "normal" : "dimmed"}
            />
          </g>
        );
      })}
      {hitIndex > 0 && (
        <DiagramArrow from={[hit.x + NODE_WIDTH / 2, 150]} to={[layers[0].x + NODE_WIDTH / 2, 150]} tone="green" curve={-40} label="response quay về" />
      )}
      <DiagramLabel x={20} y={222} text={`Tổng thời gian (cỡ): ${hit.latency}`} anchor="start" bold size={14} tone="green" />
      <DiagramLabel x={20} y={248} text={`Việc ở phía sau: ${hit.originWork}`} anchor="start" size={13} />
      <DiagramLabel x={20} y={274} text={`Hợp với: ${hit.goodFor}`} anchor="start" size={13} tone="blue" />
    </DiagramFrame>
  );
}
