"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Mode = "direct" | "outbox";

const copy: Record<Mode, { tone: "rose" | "green"; verdict: string }> = {
  direct: {
    tone: "rose",
    verdict:
      "Nếu process của `api` crash (hoặc mất mạng) đúng khoảng giữa hai bước — sau khi Postgres đã commit `UPDATE tasks`/`INSERT comments` nhưng TRƯỚC khi gọi gRPC `SendNotification` kịp gửi đi — event bị mất vĩnh viễn. Không ai retry giúp, vì `api` còn không biết mình đã bỏ dở việc gì.",
  },
  outbox: {
    tone: "green",
    verdict:
      "Business write và ghi `outbox` nằm trong CÙNG một `db.transaction` — cùng commit hoặc cùng rollback, không có khe hở giữa hai bước. Việc gọi gRPC tách hẳn ra cho relay, chạy sau, và có thể an toàn thử lại bất cứ khi nào vì `outbox` vẫn còn đó với `published_at IS NULL`.",
  },
};

/** Toggle between calling notification-service directly (dual-write gap) and the outbox pattern (atomic write, retryable relay). */
export function DualWriteProblemVsOutboxDiagram() {
  const [mode, setMode] = useState<Mode>("direct");
  const scenario = copy[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["direct", "outbox"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "direct" ? "Gọi gRPC trực tiếp (B13)" : "Outbox pattern"}
          </button>
        ))}
      </div>
      <DiagramFrame
        title={mode === "direct" ? "Dual-write problem: khe hở giữa 2 lệnh" : "Outbox: ghi atomic, gửi đi tách riêng"}
        viewBox="0 0 720 300"
        caption={scenario.verdict}
      >
        <DiagramNode x={16} y={120} width={130} height={60} label="api" sublabel="tạo comment" emoji="🛡️" tone="blue" state="active" />

        {mode === "direct" ? (
          <>
            <DiagramNode x={210} y={40} width={190} height={60} label="1. INSERT comments" sublabel="Postgres — đã commit" tone="blue" />
            <DiagramGroupBox x={430} y={20} width={270} height={100} label="⚠️ khe hở (gap)" tone="rose">
              <DiagramLabel x={565} y={70} text="crash / mất mạng ở đây" tone="rose" bold />
              <DiagramLabel x={565} y={90} text="→ event không bao giờ gửi" tone="rose" />
            </DiagramGroupBox>
            <DiagramNode x={210} y={190} width={190} height={60} label="2. gRPC SendNotification" sublabel="chưa kịp gọi" tone="rose" dashed />
            <DiagramNode x={480} y={190} width={190} height={70} label="notification-service" sublabel="không hề hay biết" emoji="📭" tone="slate" dashed />

            <DiagramArrow from={[146, 140]} to={[208, 70]} tone="blue" animated label="commit" />
            <DiagramArrow from={[146, 160]} to={[208, 210]} tone="rose" dimmed label="dự định gọi" />
            <DiagramArrow from={[400, 220]} to={[478, 220]} tone="rose" dimmed label="không tới nơi" />
          </>
        ) : (
          <>
            <DiagramGroupBox x={195} y={20} width={220} height={150} label="db.transaction (atomic)" tone="green">
              <DiagramNode x={210} y={45} width={190} height={55} label="INSERT comments" sublabel="business write" tone="blue" />
              <DiagramNode x={210} y={110} width={190} height={50} label="INSERT outbox" sublabel="published_at = NULL" tone="green" state="active" />
            </DiagramGroupBox>
            <DiagramNode x={470} y={45} width={210} height={55} label="🚚 relay (trong worker)" sublabel="poll mỗi ~2s" tone="amber" />
            <DiagramNode x={470} y={130} width={210} height={60} label="notification-service" sublabel="SendNotification" emoji="📬" tone="green" />

            <DiagramArrow from={[146, 140]} to={[208, 90]} tone="blue" animated label="1 transaction" />
            <DiagramArrow from={[415, 90]} to={[468, 72]} tone="amber" animated label="SELECT WHERE published_at IS NULL" />
            <DiagramArrow from={[575, 100]} to={[575, 128]} tone="green" animated label="gọi gRPC, thành công thì UPDATE published_at" />
          </>
        )}
      </DiagramFrame>
    </div>
  );
}
