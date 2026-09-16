"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramLabel } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Page = 1 | 10000;
type Mode = "offset" | "cursor";

const buttonClass = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  );

const ROWS_PER_PAGE = 20;
const TOTAL_ROWS = 5_000_000;

export function OffsetVsCursorPaginationDiagram() {
  const [page, setPage] = useState<Page>(1);
  const [mode, setMode] = useState<Mode>("offset");

  const offsetValue = (page - 1) * ROWS_PER_PAGE;
  // Offset pagination must scan (offset + limit) rows regardless of index; cursor scans ~limit rows via index seek.
  const rowsScanned = mode === "offset" ? offsetValue + ROWS_PER_PAGE : ROWS_PER_PAGE;
  const barMaxWidth = 560;
  const barWidth = Math.max(6, Math.min(barMaxWidth, (rowsScanned / TOTAL_ROWS) * barMaxWidth * 40));
  // Illustrative, not measured: offset scan cost grows with page depth, cursor stays flat — exact ms depends on hardware/cache.
  const estimatedMs = mode === "offset" ? Math.round(2 + (offsetValue / TOTAL_ROWS) * 850) : 3;

  return (
    <DiagramFrame
      title="Offset vs cursor pagination — chi phí quét ở trang sâu"
      viewBox="0 0 720 260"
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500">Trang:</span>
          <button type="button" onClick={() => setPage(1)} className={buttonClass(page === 1)}>
            Trang 1
          </button>
          <button type="button" onClick={() => setPage(10000)} className={buttonClass(page === 10000)}>
            Trang 10.000
          </button>
          <span className="mx-1 text-stone-400">·</span>
          <span className="text-xs font-medium text-stone-500">Kiểu:</span>
          <button type="button" onClick={() => setMode("offset")} className={buttonClass(mode === "offset")}>
            OFFSET
          </button>
          <button type="button" onClick={() => setMode("cursor")} className={buttonClass(mode === "cursor")}>
            Cursor (keyset)
          </button>
        </div>
      }
      caption={
        mode === "offset" ? (
          <>
            <code>SELECT * FROM orders ORDER BY id OFFSET {offsetValue} LIMIT 20</code> — Postgres phải đọc và bỏ qua {offsetValue.toLocaleString("vi-VN")}{" "}
            dòng trước khi lấy 20 dòng cần, dù client chỉ thấy 20 dòng. Trang càng sâu, quét càng nhiều — số ms dưới đây minh hoạ xu hướng, không phải đo thật (tuỳ phần cứng/cache).
          </>
        ) : (
          <>
            <code>SELECT * FROM orders WHERE id &gt; $lastId ORDER BY id LIMIT 20</code> — index seek trên <code>id</code> nhảy thẳng tới vị trí, luôn quét cỡ
            đúng 20 dòng bất kể đang ở trang nào. Đánh đổi: không nhảy thẳng tới &quot;trang 5.000&quot;, chỉ đi tiếp từ cursor hiện có.
          </>
        )
      }
    >
      <text x={30} y={35} fontSize={13} fontWeight={700} className="fill-stone-700 dark:fill-stone-300">
        Số dòng phải quét để lấy 20 dòng ở trang {page === 1 ? "1" : "10.000"}
      </text>

      <rect x={30} y={60} width={barMaxWidth} height={36} rx={8} className="fill-stone-100 stroke-stone-300 dark:fill-stone-900 dark:stroke-stone-700" strokeWidth={1} />
      <rect
        x={30}
        y={60}
        width={barWidth}
        height={36}
        rx={8}
        className={mode === "offset" && page === 10000 ? "fill-rose-500 dark:fill-rose-500" : "fill-emerald-500 dark:fill-emerald-500"}
      />
      <DiagramLabel x={30 + barMaxWidth / 2} y={82} text={`${rowsScanned.toLocaleString("vi-VN")} dòng quét`} bold size={13} />

      <text x={30} y={130} fontSize={13} fontWeight={700} className="fill-stone-700 dark:fill-stone-300">
        Thời gian minh hoạ (xu hướng, không phải số đo thật)
      </text>
      <rect x={30} y={150} width={300} height={30} rx={8} className="fill-stone-100 dark:fill-stone-900" />
      <rect
        x={30}
        y={150}
        width={Math.max(6, Math.min(300, estimatedMs))}
        height={30}
        rx={8}
        className={estimatedMs > 200 ? "fill-rose-500" : "fill-emerald-500"}
      />
      <DiagramLabel x={30 + 300 / 2} y={170} text={`~${estimatedMs} ms`} bold size={13} />

      <text x={30} y={215} fontSize={12} className="fill-stone-600 dark:fill-stone-400">
        {mode === "offset"
          ? "OFFSET: chi phí quét ~ tuyến tính theo độ sâu trang — trang 1 nhanh, trang 10.000 chậm dần."
          : "Cursor: chi phí quét gần như hằng số nhờ index seek — trang 1 và trang 10.000 nhanh như nhau."}
      </text>
    </DiagramFrame>
  );
}
