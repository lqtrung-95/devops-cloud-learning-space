"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

const PARTITION_COUNT = 3;
const rowY = [40, 120, 200];
const consumerY = [12, 84, 156, 228];

// Messages already placed by hash(key) % 3 — same key always lands in the same partition.
const keyTones: Record<string, DiagramTone> = { A: "blue", B: "violet", C: "cyan", D: "green", E: "rose" };
const partitions: string[][] = [
  ["A1", "C1", "A2"],
  ["B1", "B2", "B3"],
  ["D1", "E1", "D2"],
];

/** Simplified round-robin assignor: partition p goes to consumer p % n. Real assignors (range, sticky…) differ in detail. */
function ownerOf(partition: number, consumerCount: number) {
  return partition % consumerCount;
}

export function PartitionConsumerGroupRebalanceDiagram() {
  const [consumerCount, setConsumerCount] = useState(1);
  const [previousCount, setPreviousCount] = useState(1);

  const changeCount = (next: number) => {
    setPreviousCount(consumerCount);
    setConsumerCount(next);
  };

  const moves = Array.from({ length: PARTITION_COUNT }, (_, partition) => partition)
    .filter((partition) => ownerOf(partition, previousCount) !== ownerOf(partition, consumerCount))
    .map((partition) => `P${partition}: C${ownerOf(partition, previousCount) + 1} → C${ownerOf(partition, consumerCount) + 1}`);

  const rebalanceText =
    previousCount === consumerCount
      ? "Chọn số consumer trong group email-svc để xem partition được chia lại."
      : moves.length > 0
        ? `Rebalance (${previousCount} → ${consumerCount} consumer): ${moves.join(" · ")}. Trong lúc chia lại, các partition bị chuyển tạm dừng xử lý.`
        : `Rebalance (${previousCount} → ${consumerCount} consumer): không partition nào đổi chủ.`;

  return (
    <DiagramFrame
      title="Topic orders (3 partition) & consumer group email-svc"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-stone-600 dark:text-stone-400">Số consumer:</span>
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => changeCount(count)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  consumerCount === count ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {count}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="text-stone-700 dark:text-stone-300">
            {rebalanceText}
          </p>
        </div>
      }
      caption="Thứ tự chỉ được đảm bảo TRONG một partition: A1 luôn trước A2 vì cùng key A → cùng P0. Giữa P0 và P1 không có thứ tự chung. Consumer thứ 4 ngồi chơi vì chỉ có 3 partition."
    >
      <DiagramNode x={10} y={110} width={140} height={80} label="Producer" sublabel="hash(key) % 3" emoji="🧾" tone="violet" />

      <DiagramGroupBox x={176} y={8} width={310} height={284} label="topic orders" tone="amber">
        {partitions.map((messages, partition) => (
          <g key={`p${partition}`}>
            <DiagramArrow from={[152, 150]} to={[190, rowY[partition] + 26]} tone="violet" dimmed />
            <DiagramNode x={192} y={rowY[partition]} width={60} height={52} label={`P${partition}`} tone="amber" state="active" />
            {messages.map((message, slot) => (
              <DiagramNode
                key={message}
                x={262 + slot * 70}
                y={rowY[partition] + 6}
                width={60}
                height={40}
                label={message}
                tone={keyTones[message[0]]}
                rounded={8}
              />
            ))}
          </g>
        ))}
      </DiagramGroupBox>

      {Array.from({ length: PARTITION_COUNT }, (_, partition) => {
        const owner = ownerOf(partition, consumerCount);
        return (
          <DiagramArrow
            key={`assign-${partition}-${owner}`}
            from={[478, rowY[partition] + 26]}
            to={[556, consumerY[owner] + 28]}
            tone="green"
            animated
          />
        );
      })}

      {consumerY.map((y, index) => {
        const owned = Array.from({ length: PARTITION_COUNT }, (_, partition) => partition).filter((partition) => ownerOf(partition, consumerCount) === index);
        const exists = index < consumerCount;
        return (
          <DiagramNode
            key={`c${index}`}
            x={560}
            y={y}
            width={150}
            height={56}
            label={`C${index + 1}`}
            sublabel={!exists ? "chưa chạy" : owned.length > 0 ? `đọc ${owned.map((p) => `P${p}`).join(", ")}` : "idle — thừa"}
            tone={exists && owned.length > 0 ? "green" : "slate"}
            state={exists ? "normal" : "dimmed"}
            dashed={exists && owned.length === 0}
          />
        );
      })}
    </DiagramFrame>
  );
}
