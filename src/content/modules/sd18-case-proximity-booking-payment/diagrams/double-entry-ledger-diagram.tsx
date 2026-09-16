"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram } from "@/components/diagrams/step-diagram";

interface LedgerRow {
  debitAccount: string;
  creditAccount: string;
  amount: number;
}

/** A $20 ride: rider pays $20, platform keeps $4 fee, driver gets $16 — every entry is a debit+credit pair. */
const ALL_ROWS: LedgerRow[] = [
  { debitAccount: "rider_wallet", creditAccount: "platform_clearing", amount: 20 },
  { debitAccount: "platform_clearing", creditAccount: "driver_payable", amount: 16 },
  { debitAccount: "platform_clearing", creditAccount: "platform_revenue", amount: 4 },
];

const steps = [
  { title: "Thu tiền rider", description: "Rider trả $20 cho chuyến đi: ghi Nợ (debit) ví rider $20, Có (credit) tài khoản trung gian `platform_clearing` $20. Mỗi dòng luôn đi theo cặp." },
  { title: "Chia tiền cho tài xế", description: "Trừ $16 khỏi `platform_clearing`, cộng vào `driver_payable` (sẽ trả cho tài xế đợt thanh toán tới). Vẫn là một cặp Nợ/Có cân nhau." },
  { title: "Ghi nhận phí nền tảng", description: "Phần còn lại $4 chuyển từ `platform_clearing` sang `platform_revenue` — doanh thu của nền tảng cho chuyến đi này." },
  { title: "Đối soát: tổng Nợ = tổng Có?", description: "Cộng toàn bộ debit và toàn bộ credit của giao dịch. Nếu hai tổng không khớp, có dòng bị thiếu hoặc ghi sai — bug ảnh hưởng tới tiền được phát hiện bằng phép cộng, không cần dò từng dòng code." },
];

/** Net balance of an intermediary account: each credit adds money in, each debit sends money out. A correct, fully-posted ledger nets this to zero. */
function clearingBalance(rows: LedgerRow[], account: string): number {
  return rows.reduce((sum, r) => {
    if (r.creditAccount === account) return sum + r.amount;
    if (r.debitAccount === account) return sum - r.amount;
    return sum;
  }, 0);
}

export function DoubleEntryLedgerDiagram() {
  const [dropRow, setDropRow] = useState(false);
  const rows = dropRow ? ALL_ROWS.slice(0, 2) : ALL_ROWS;
  // Dropping the fee row leaves money sitting in platform_clearing instead of netting to zero.
  const clearingLeftover = clearingBalance(rows, "platform_clearing");

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDropRow((v) => !v)}
          className={clsx(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            dropRow ? "bg-rose-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
          )}
        >
          {dropRow ? "🐞 Đang giả lập thiếu 1 dòng ghi sổ" : "Giả lập lỗi: thiếu dòng ghi phí nền tảng"}
        </button>
      </div>
      <StepDiagram key={dropRow ? "buggy" : "ok"} title="Double-entry ledger cho một chuyến đi $20" viewBox="0 0 720 300" steps={steps}>
        {(step) => {
          const visibleRows = step >= 2 ? rows : rows.slice(0, Math.min(step + 1, rows.length));
          const showReconciliation = step === 3;
          const reconciledOk = showReconciliation && clearingLeftover === 0;
          return (
            <>
              <DiagramLabel x={130} y={22} text="Tài khoản" size={12} bold />
              <DiagramLabel x={420} y={22} text="Nợ (debit)" size={12} bold tone="rose" />
              <DiagramLabel x={560} y={22} text="Có (credit)" size={12} bold tone="green" />
              {visibleRows.map((row, index) => (
                <g key={`${row.debitAccount}-${row.creditAccount}`}>
                  <DiagramNode x={10} y={36 + index * 50} width={230} height={40} label={`${row.debitAccount} → ${row.creditAccount}`} rounded={8} tone="slate" state="active" />
                  <DiagramLabel x={420} y={36 + index * 50 + 24} text={`-$${row.amount}`} size={13} tone="rose" bold />
                  <DiagramLabel x={560} y={36 + index * 50 + 24} text={`+$${row.amount}`} size={13} tone="green" bold />
                </g>
              ))}
              {showReconciliation && (
                <DiagramNode
                  x={230}
                  y={210}
                  width={260}
                  height={64}
                  emoji={reconciledOk ? "✅" : "🚨"}
                  label={reconciledOk ? "platform_clearing = $0" : `platform_clearing còn dư $${clearingLeftover}`}
                  sublabel={
                    reconciledOk
                      ? "Mọi đồng vào clearing đều có nơi đi ra — Nợ và Có khớp nhau"
                      : "Thiếu dòng ghi $4 → tiền nằm lại clearing không rõ đi đâu, đối soát phát hiện ngay bằng một phép cộng"
                  }
                  tone={reconciledOk ? "green" : "rose"}
                  state="active"
                />
              )}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
