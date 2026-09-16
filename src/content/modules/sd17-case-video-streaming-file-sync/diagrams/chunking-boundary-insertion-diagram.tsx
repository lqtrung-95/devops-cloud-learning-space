"use client";

import { DiagramGroupBox, DiagramLabel } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

// Minh hoạ đơn giản, không phải cài đặt Rabin fingerprint thật (bài học nói rõ điều này).
const BASE_TEXT = "the_quick_brown_fox_jumps_over_the_lazy_dog";
const INSERT_AT = 14;
const INSERT_CHAR = "Z";
const AFTER_TEXT = BASE_TEXT.slice(0, INSERT_AT) + INSERT_CHAR + BASE_TEXT.slice(INSERT_AT);
const FIXED_SIZE = 6;
const CDC_MOD = 7; // "boundary" giả lập: ký tự có mã ASCII chia hết cho số này

function fixedChunks(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += FIXED_SIZE) chunks.push(text.slice(i, i + FIXED_SIZE));
  return chunks;
}

function cdcChunks(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const isBoundary = text.charCodeAt(i) % CDC_MOD === 0;
    if (isBoundary || i === text.length - 1) {
      chunks.push(text.slice(start, i + 1));
      start = i + 1;
    }
  }
  return chunks;
}

const baseFixed = fixedChunks(BASE_TEXT);
const afterFixed = fixedChunks(AFTER_TEXT);
const baseCdc = cdcChunks(BASE_TEXT);
const afterCdc = cdcChunks(AFTER_TEXT);
const baseFixedSet = new Set(baseFixed);
const baseCdcSet = new Set(baseCdc);

interface Row {
  label: string;
  chunks: string[];
  reusedFlags: boolean[] | null; // null = bước "trước khi sửa", chưa có gì để so sánh
  changedCount: number;
}

const rowsByStep: Row[][] = [
  [
    { label: "Fixed-size (6 ký tự/chunk)", chunks: baseFixed, reusedFlags: null, changedCount: 0 },
    { label: "Content-defined (rolling hash)", chunks: baseCdc, reusedFlags: null, changedCount: 0 },
  ],
  [
    {
      label: "Fixed-size (6 ký tự/chunk)",
      chunks: afterFixed,
      reusedFlags: afterFixed.map((chunk) => baseFixedSet.has(chunk)),
      changedCount: afterFixed.filter((chunk) => !baseFixedSet.has(chunk)).length,
    },
    {
      label: "Content-defined (rolling hash)",
      chunks: afterCdc,
      reusedFlags: afterCdc.map((chunk) => baseCdcSet.has(chunk)),
      changedCount: afterCdc.filter((chunk) => !baseCdcSet.has(chunk)).length,
    },
  ],
];

const steps: DiagramStep[] = [
  {
    title: "File gốc",
    description: `Chuỗi gốc dài ${BASE_TEXT.length} ký tự được chia chunk theo 2 cách: cố định mỗi ${FIXED_SIZE} ký tự, và theo nội dung (rolling hash — ở đây giả lập bằng "ranh giới sau ký tự có mã ASCII chia hết cho ${CDC_MOD}").`,
  },
  {
    title: `Chèn 1 ký tự ('${INSERT_CHAR}') vào giữa file`,
    description:
      "So màu với bước trước: xanh = chunk có nội dung giống hệt một chunk đã tồn tại trước đó (tái dùng, không cần upload lại); đỏ = chunk mới/khác (phải upload lại).",
  },
];

function tone(reused: boolean | undefined): DiagramTone {
  if (reused === undefined) return "slate";
  return reused ? "green" : "rose";
}

/** Chunk width in px, then its left edge x — computed up front so render never mutates state. */
function layoutChunks(chunks: string[]): { width: number; left: number }[] {
  const layout: { width: number; left: number }[] = [];
  let cursor = 20;
  for (const chunk of chunks) {
    const width = Math.max(chunk.length * 11, 26);
    layout.push({ width, left: cursor });
    cursor += width;
  }
  return layout;
}

function ChunkRow({ row, y }: { row: Row; y: number }) {
  const layout = layoutChunks(row.chunks);
  return (
    <g>
      <DiagramLabel x={20} y={y - 10} text={row.label} anchor="start" size={12} bold />
      {row.reusedFlags && (
        <DiagramLabel x={480} y={y - 10} text={`${row.changedCount}/${row.chunks.length} chunk phải upload lại`} anchor="start" size={11} tone="amber" />
      )}
      {row.chunks.map((chunk, index) => {
        const { width, left } = layout[index];
        return (
          <g key={index}>
            <rect
              x={left}
              y={y}
              width={width - 2}
              height={38}
              rx={6}
              className={
                tone(row.reusedFlags?.[index]) === "green"
                  ? "fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950 dark:stroke-emerald-400"
                  : tone(row.reusedFlags?.[index]) === "rose"
                    ? "fill-rose-50 stroke-rose-500 dark:fill-rose-950 dark:stroke-rose-400"
                    : "fill-stone-50 stroke-stone-400 dark:fill-stone-900 dark:stroke-stone-500"
              }
              strokeWidth={1.5}
            />
            <text x={left + width / 2 - 1} y={y + 24} textAnchor="middle" fontSize={9.5} className="fill-stone-700 dark:fill-stone-300 font-mono">
              {chunk}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function ChunkingBoundaryInsertionDiagram() {
  return (
    <StepDiagram title="Chèn 1 byte: fixed-size chunking đổi gần hết, content-defined chỉ đổi chunk lân cận" viewBox="0 0 720 240" steps={steps}>
      {(step) => (
        <DiagramGroupBox x={5} y={10} width={710} height={200} label="">
          <ChunkRow row={rowsByStep[step][0]} y={40} />
          <ChunkRow row={rowsByStep[step][1]} y={130} />
        </DiagramGroupBox>
      )}
    </StepDiagram>
  );
}
