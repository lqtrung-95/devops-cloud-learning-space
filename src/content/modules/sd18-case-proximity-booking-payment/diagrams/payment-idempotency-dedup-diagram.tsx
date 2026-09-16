"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram } from "@/components/diagrams/step-diagram";

type Mode = "no-key" | "with-key";

const modes: { key: Mode; label: string }[] = [
  { key: "no-key", label: "Không có idempotency key" },
  { key: "with-key", label: "Có idempotency key (atomic)" },
];

const steps: Record<Mode, { title: string; description: string; psp: "idle" | "charging" | "charged"; chargeCount: number; note: string }[]> = {
  "no-key": [
    { title: "Client gọi POST /charge", description: "Mạng chậm; client chưa nhận được response nhưng request đã tới server.", psp: "idle", chargeCount: 0, note: "" },
    { title: "Server gọi PSP, charge thành công", description: "Server gọi PSP charge $20 — thành công — nhưng response về client bị rớt trên đường (timeout ở client).", psp: "charged", chargeCount: 1, note: "" },
    { title: "Client không nhận response → tự retry", description: "Client coi như request thất bại (không có gì phân biệt với thất bại thật), gửi lại y hệt request.", psp: "charged", chargeCount: 1, note: "" },
    { title: "Server xử lý lại từ đầu → charge lần 2", description: "Không có gì để nhận ra đây là request cũ lặp lại — server gọi PSP charge $20 THÊM MỘT LẦN NỮA. Khách bị trừ $40 cho một đơn hàng $20.", psp: "charged", chargeCount: 2, note: "❌ double charge" },
  ],
  "with-key": [
    { title: "Client gửi kèm Idempotency-Key", description: "Client sinh `Idempotency-Key: req-abc123` một lần và giữ nguyên khi retry (không đổi mỗi lần gửi).", psp: "idle", chargeCount: 0, note: "" },
    { title: "INSERT key trong transaction, unique constraint", description: "`INSERT INTO idempotency_keys(key, status) VALUES ('req-abc123','processing')` — atomic với việc ghi ý định charge, cùng một transaction. Insert thành công vì key chưa tồn tại.", psp: "idle", chargeCount: 0, note: "" },
    { title: "Gọi PSP, lưu kết quả vào đúng bản ghi key", description: "Server gọi PSP charge $20, rồi UPDATE bản ghi key đó thành `status='completed'` kèm response — vẫn trong phạm vi có thể tra lại sau.", psp: "charged", chargeCount: 1, note: "" },
    { title: "Client timeout, retry cùng key → server chặn", description: "Server thấy key đã 'completed' → trả ngay kết quả đã lưu, KHÔNG gọi PSP lần nữa. Nếu key đang 'processing' (request trùng đến giữa lúc xử lý) → trả 409, bảo client thử lại sau thay vì charge song song.", psp: "charged", chargeCount: 1, note: "✅ chỉ charge 1 lần" },
  ],
};

export function PaymentIdempotencyDedupDiagram() {
  const [mode, setMode] = useState<Mode>("no-key");
  const currentSteps = steps[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {modes.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setMode(option.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option.key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title="Client retry do timeout — có chặn được double charge không?" viewBox="0 0 720 260" steps={currentSteps}>
        {(step) => {
          const current = currentSteps[step];
          const bad = current.chargeCount >= 2;
          return (
            <>
              <DiagramNode x={20} y={90} width={130} height={60} label="Client" emoji="📱" tone="blue" state="active" />
              <DiagramArrow from={[150, 120]} to={[280, 120]} tone="blue" animated label="POST /charge" />
              <DiagramNode x={290} y={90} width={150} height={60} label="Payment service" emoji="🧾" tone="cyan" state="active" />
              <DiagramArrow from={[440, 110]} to={[560, 90]} tone={current.psp === "charged" ? "amber" : "slate"} animated={current.psp === "charged"} label="charge" />
              <DiagramNode
                x={560}
                y={40}
                width={140}
                height={60}
                label="PSP (Stripe-like)"
                emoji="💳"
                tone={bad ? "rose" : current.psp === "charged" ? "amber" : "slate"}
                state={current.psp === "charged" ? "active" : "normal"}
              />
              <DiagramNode
                x={290}
                y={175}
                width={150}
                height={60}
                label="idempotency_keys"
                sublabel={mode === "with-key" ? (step === 0 ? "chưa có key" : "req-abc123") : "(không dùng)"}
                emoji="🗝️"
                tone={mode === "with-key" ? "green" : "slate"}
                state={mode === "with-key" && step > 0 ? "active" : "normal"}
              />
              <DiagramLabel x={620} y={130} text={`Số lần PSP charge: ${current.chargeCount}`} size={13} bold tone={bad ? "rose" : "green"} />
              {current.note && <DiagramLabel x={360} y={245} text={current.note} size={14} bold tone={bad ? "rose" : "green"} />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
