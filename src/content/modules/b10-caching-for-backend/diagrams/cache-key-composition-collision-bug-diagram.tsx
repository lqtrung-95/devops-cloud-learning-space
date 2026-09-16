"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Mode = "correct" | "buggy";

function keyFor(mode: Mode, status: "todo" | "done"): string {
  return mode === "correct" ? `tasks:8f14...:list:status=${status}:cursor=first:limit=20` : "tasks:8f14...:list:cursor=first:limit=20";
}

export function CacheKeyCompositionCollisionBugDiagram() {
  const [mode, setMode] = useState<Mode>("correct");
  const collide = mode === "buggy";
  const keyA = keyFor(mode, "todo");
  const keyB = keyFor(mode, "done");

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-stone-500">Công thức cache key:</span>
      {(["correct", "buggy"] as Mode[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setMode(option)}
          className={clsx(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            mode === option ? (option === "correct" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
          )}
        >
          {option === "correct" ? "Đủ tham số (đúng)" : "Thiếu status (bug)"}
        </button>
      ))}
    </div>
  );

  return (
    <DiagramFrame
      title="Cache key phải chứa mọi tham số ảnh hưởng response"
      viewBox="0 0 720 320"
      controls={controls}
      caption={
        collide
          ? "Cả hai request build ra CÙNG MỘT key vì công thức thiếu status — request B đọc nhầm dữ liệu của request A."
          : "Mỗi tổ hợp tham số khác nhau tạo ra một key riêng — không thể đọc nhầm dữ liệu của nhau."
      }
    >
      <DiagramNode x={30} y={20} width={300} height={64} label="Request A" sublabel="GET tasks?status=todo&limit=20" tone="blue" state="active" />
      <DiagramNode x={390} y={20} width={300} height={64} label="Request B" sublabel="GET tasks?status=done&limit=20" tone="violet" state="active" />

      <DiagramArrow from={[180, 84]} to={[collide ? 300 : 180, 138]} tone="blue" animated />
      <DiagramArrow from={[540, 84]} to={[collide ? 420 : 540, 138]} tone="violet" animated />

      <DiagramNode x={collide ? 170 : 30} y={140} width={340} height={56} label="Key A" sublabel={keyA} tone={collide ? "rose" : "green"} rounded={8} />
      {!collide && <DiagramNode x={390} y={140} width={300} height={56} label="Key B" sublabel={keyB} tone="green" rounded={8} />}

      <DiagramArrow from={[collide ? 340 : 200, 196]} to={[collide ? 340 : 200, 240]} tone={collide ? "rose" : "green"} animated />
      {!collide && <DiagramArrow from={[540, 196]} to={[540, 240]} tone="green" animated />}

      <DiagramNode
        x={collide ? 170 : 30}
        y={240}
        width={collide ? 340 : 300}
        height={64}
        label={collide ? "1 cache entry duy nhất" : "Cache entry của A"}
        sublabel={collide ? "chứa data của request đến trước (todo) — B đọc nhầm" : "đúng danh sách status=todo"}
        emoji="🗂️"
        tone={collide ? "rose" : "green"}
      />
      {!collide && <DiagramNode x={390} y={240} width={300} height={64} label="Cache entry của B" sublabel="đúng danh sách status=done" emoji="🗂️" tone="green" />}

      {collide && <DiagramLabel x={340} y={314} text="Request B nhận về task 'todo' dù đang hỏi 'done'" bold tone="rose" />}
    </DiagramFrame>
  );
}
