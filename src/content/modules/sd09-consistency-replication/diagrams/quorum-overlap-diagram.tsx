"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

const buttonClass = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
    active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  );

/**
 * N/W/R quorum selector. Write set = first W replicas, read set = last R replicas
 * (the arrangement that MINIMIZES overlap) — this reproduces the pigeonhole worst case:
 * guaranteed overlap = max(0, W + R - N). Sloppy quorum diverts one write to a node
 * outside the tracked N, breaking that guarantee even when the arithmetic says W+R>N.
 */
export function QuorumOverlapDiagram() {
  const [n, setN] = useState(3);
  const [w, setW] = useState(2);
  const [r, setR] = useState(2);
  const [sloppy, setSloppy] = useState(false);

  const clampedW = Math.min(w, n);
  const clampedR = Math.min(r, n);
  // Worst-case arrangement: write set from the start, read set from the end.
  const writeSet = new Set(Array.from({ length: sloppy ? clampedW - 1 : clampedW }, (_, i) => i));
  const readSet = new Set(Array.from({ length: clampedR }, (_, i) => n - 1 - i));
  const overlapNodes = [...writeSet].filter((i) => readSet.has(i));
  const arithmeticSum = clampedW + clampedR;
  const guaranteed = !sloppy && arithmeticSum > n;

  const nodeWidth = 64;
  const gap = 18;
  const totalWidth = n * nodeWidth + (n - 1) * gap;
  const startX = (720 - totalWidth) / 2;

  return (
    <DiagramFrame
      title={`N = ${n} replica — tập ghi (xanh dương) và tập đọc (tím) chọn ở hai đầu để thử trường hợp xấu nhất`}
      viewBox="0 0 720 240"
      caption={
        guaranteed ? (
          <>
            ✅ <code>W + R = {arithmeticSum} &gt; N = {n}</code> — dù chọn kiểu gì, hai tập vẫn phải giao nhau ít nhất {arithmeticSum - n} node. Đọc
            luôn thấy được ghi gần nhất.
          </>
        ) : sloppy ? (
          <>
            ⚠️ Sloppy quorum: một write được đếm vào <code>W</code> nhưng nằm ở node hinted <strong>ngoài</strong> {n} node gốc. Công thức vẫn ghi{" "}
            <code>W + R = {arithmeticSum}</code>, nhưng node đó không nằm trong tập read repair chờ — đảm bảo giao nhau không còn giữ, vẫn có thể
            stale read cho tới khi hinted handoff chuyển dữ liệu về đúng node.
          </>
        ) : (
          <>
            ❌ <code>W + R = {arithmeticSum} ≤ N = {n}</code> — có thể chọn tập ghi và tập đọc rời nhau hoàn toàn (như hình). Đọc có thể không thấy
            ghi vừa xong.
          </>
        )
      }
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500">N:</span>
          {[3, 5].map((value) => (
            <button key={value} type="button" onClick={() => setN(value)} className={buttonClass(n === value)}>
              {value}
            </button>
          ))}
          <span className="mx-1 text-stone-400">·</span>
          <span className="text-xs font-medium text-stone-500">W:</span>
          <button type="button" onClick={() => setW(Math.max(1, w - 1))} className={buttonClass(false)}>
            −
          </button>
          <span className="w-5 text-center text-sm font-semibold">{clampedW}</span>
          <button type="button" onClick={() => setW(Math.min(n, w + 1))} className={buttonClass(false)}>
            +
          </button>
          <span className="mx-1 text-stone-400">·</span>
          <span className="text-xs font-medium text-stone-500">R:</span>
          <button type="button" onClick={() => setR(Math.max(1, r - 1))} className={buttonClass(false)}>
            −
          </button>
          <span className="w-5 text-center text-sm font-semibold">{clampedR}</span>
          <button type="button" onClick={() => setR(Math.min(n, r + 1))} className={buttonClass(false)}>
            +
          </button>
          <span className="mx-1 text-stone-400">·</span>
          <button type="button" onClick={() => setSloppy(!sloppy)} className={buttonClass(sloppy)}>
            Sloppy quorum {sloppy ? "BẬT" : "TẮT"}
          </button>
        </div>
      }
    >
      {Array.from({ length: n }, (_, i) => {
        const isWrite = writeSet.has(i);
        const isRead = readSet.has(i);
        const tone = isWrite && isRead ? "green" : isWrite ? "blue" : isRead ? "violet" : "slate";
        return (
          <DiagramNode
            key={i}
            x={startX + i * (nodeWidth + gap)}
            y={70}
            width={nodeWidth}
            height={64}
            emoji="🗄️"
            label={`R${i + 1}`}
            sublabel={isWrite && isRead ? "ghi+đọc" : isWrite ? "ghi" : isRead ? "đọc" : ""}
            tone={tone}
            state="active"
            rounded={10}
          />
        );
      })}
      {sloppy && (
        <DiagramNode
          x={startX + n * (nodeWidth + gap) + 10}
          y={70}
          width={nodeWidth}
          height={64}
          emoji="🩹"
          label="hinted"
          sublabel="tạm (ngoài N)"
          tone="amber"
          dashed
          state="active"
          rounded={10}
        />
      )}
      <DiagramLabel
        x={360}
        y={190}
        text={overlapNodes.length > 0 ? `Giao nhau ở ${overlapNodes.length} node (xanh lá)` : "Không có node nào chung giữa 2 tập"}
        size={13}
        bold
        tone={overlapNodes.length > 0 && !sloppy ? "green" : "rose"}
      />
    </DiagramFrame>
  );
}
