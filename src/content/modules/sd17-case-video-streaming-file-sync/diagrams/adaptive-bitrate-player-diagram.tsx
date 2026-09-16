"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

interface Variant {
  name: string;
  mbps: number;
  tone: DiagramTone;
}

// A tiny master manifest: 4 renditions, from lightest to heaviest.
const VARIANTS: Variant[] = [
  { name: "240p", mbps: 0.5, tone: "slate" },
  { name: "480p", mbps: 1.5, tone: "cyan" },
  { name: "720p", mbps: 3.5, tone: "blue" },
  { name: "1080p", mbps: 6, tone: "green" },
];

const SAFETY_MARGIN = 0.8; // player thường không dùng hết 100% băng thông đo được, chừa đệm cho jitter
const MAX_HISTORY = 6;

/** ABR heuristic đơn giản: chọn rendition nặng nhất mà bitrate <= bandwidth * margin. */
function pickVariant(bandwidthMbps: number): Variant {
  const affordable = VARIANTS.filter((variant) => variant.mbps <= bandwidthMbps * SAFETY_MARGIN);
  return affordable.length > 0 ? affordable[affordable.length - 1] : VARIANTS[0];
}

export function AdaptiveBitratePlayerDiagram() {
  const [bandwidth, setBandwidth] = useState(2.5);
  const [history, setHistory] = useState<Variant[]>([]);
  const current = pickVariant(bandwidth);

  const loadNextSegment = () => {
    setHistory((previous) => [...previous, current].slice(-MAX_HISTORY));
  };

  return (
    <DiagramFrame
      title="Player chọn rendition theo băng thông đo được — chỉ đổi ở ranh giới segment"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-300">
            <span>
              Băng thông đo được: <strong>{bandwidth.toFixed(1)} Mbps</strong>
            </span>
            <input
              type="range"
              min={0.2}
              max={8}
              step={0.1}
              value={bandwidth}
              onChange={(event) => setBandwidth(Number(event.target.value))}
              className="w-full accent-indigo-600"
            />
          </label>
          <button
            type="button"
            onClick={loadNextSegment}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            ▶ Tải segment tiếp theo (áp dụng rendition hiện tại)
          </button>
          <button
            type="button"
            onClick={() => setHistory([])}
            className="ml-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            ↺ Reset timeline
          </button>
        </div>
      }
      caption="Kéo thanh trượt để đổi băng thông rồi bấm 'Tải segment tiếp theo' nhiều lần: mỗi ô trên timeline là một segment đã tải, giữ nguyên rendition cho tới hết segment đó — player không bao giờ đổi chất lượng giữa chừng một segment đang phát."
    >
      {/* Manifest: master.m3u8 liệt kê các variant */}
      <DiagramLabel x={20} y={24} text="master.m3u8" anchor="start" size={13} bold />
      {VARIANTS.map((variant, index) => (
        <DiagramNode
          key={variant.name}
          x={20 + index * 110}
          y={34}
          width={100}
          height={54}
          label={variant.name}
          sublabel={`${variant.mbps} Mbps`}
          tone={variant.tone}
          state={variant.name === current.name ? "active" : "normal"}
        />
      ))}
      <DiagramLabel x={460} y={24} text={`Ngưỡng chọn: bitrate ≤ ${SAFETY_MARGIN}× băng thông đo`} anchor="start" size={11} tone="amber" />

      <DiagramArrow from={[70 + VARIANTS.findIndex((v) => v.name === current.name) * 110, 92]} to={[70, 150]} tone={current.tone} curve={0} />
      <DiagramNode x={20} y={150} width={150} height={60} label="Player" sublabel={`đang phát: ${current.name}`} emoji="▶️" tone={current.tone} state="active" />

      {/* Timeline các segment đã "tải" theo lịch sử click */}
      <DiagramLabel x={200} y={172} text="Timeline segment đã tải (mỗi ô = 1 segment, ~2–10s)" anchor="start" size={11.5} />
      {Array.from({ length: MAX_HISTORY }, (_, index) => {
        const item = history[index];
        return (
          <DiagramNode
            key={index}
            x={200 + index * 82}
            y={185}
            width={72}
            height={60}
            label={item ? item.name : "—"}
            sublabel={item ? `seg ${index + 1}` : "trống"}
            tone={item ? item.tone : "slate"}
            dashed={!item}
          />
        );
      })}

      <DiagramLabel
        x={20}
        y={278}
        text="Segment liền kề có thể khác rendition: mỗi segment chốt chất lượng riêng theo băng thông lúc tải, không đổi giữa chừng."
        anchor="start"
        size={10.5}
      />
    </DiagramFrame>
  );
}
