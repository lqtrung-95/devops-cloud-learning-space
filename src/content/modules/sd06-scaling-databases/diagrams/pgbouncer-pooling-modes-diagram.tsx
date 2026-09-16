"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Mode = "direct" | "session" | "transaction";

const POOL_PER_INSTANCE = 20;
const MAX_CONNECTIONS = 100;
const PGBOUNCER_POOL_SIZE = 20;

const modeLabels: Record<Mode, string> = {
  direct: "Nối thẳng Postgres",
  session: "PgBouncer · session",
  transaction: "PgBouncer · transaction",
};

function describe(mode: Mode, clients: number) {
  if (mode === "direct") {
    const ok = clients <= MAX_CONNECTIONS - 3;
    return {
      server: clients,
      waiting: 0,
      ok,
      verdict: ok ? "Chạy được, nhưng sát trần" : "❌ FATAL: too many clients",
      note: "Mỗi connection là một backend process của Postgres, tốn RAM kể cả khi rảnh.",
    };
  }
  if (mode === "session") {
    const waiting = Math.max(0, clients - PGBOUNCER_POOL_SIZE);
    return {
      server: Math.min(clients, PGBOUNCER_POOL_SIZE),
      waiting,
      ok: waiting === 0,
      verdict: `${waiting} client phải xếp hàng chờ`,
      note: "Pool của app giữ connection mở mãi → mỗi client chiếm một server connection tới khi ngắt. Session mode chỉ giúp khi client hay đóng/mở kết nối.",
    };
  }
  return {
    server: PGBOUNCER_POOL_SIZE,
    waiting: 0,
    ok: true,
    verdict: "✅ Đủ cho mọi client (tx ngắn)",
    note: "Server connection chỉ bị giữ trong lúc transaction chạy. Đổi lại: SET, LISTEN, advisory lock mức session, WITH HOLD cursor, PREPARE bằng SQL không dùng được.",
  };
}

export function PgbouncerPoolingModesDiagram() {
  const [mode, setMode] = useState<Mode>("direct");
  const [instances, setInstances] = useState(4);
  const clients = instances * POOL_PER_INSTANCE;
  const info = describe(mode, clients);
  const usesBouncer = mode !== "direct";

  return (
    <DiagramFrame
      title="Bao nhiêu connection thật sự chạm tới Postgres?"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(modeLabels) as Mode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {modeLabels[option]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[4, 8].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setInstances(count)}
                className={clsx(
                  "rounded-lg border px-3 py-1.5 font-medium",
                  instances === count
                    ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
                    : "border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-400",
                )}
              >
                {count} instance app × pool {POOL_PER_INSTANCE}
              </button>
            ))}
          </div>
          <p className="text-stone-700 dark:text-stone-300">{info.note}</p>
        </div>
      }
      caption="Giả định: pool của mỗi app instance là 20, Postgres `max_connections = 100` (mặc định, trừ vài slot dành cho superuser), PgBouncer `default_pool_size = 20`."
    >
      {Array.from({ length: instances }, (_, index) => {
        const rowHeight = instances === 4 ? 62 : 31;
        const y = 20 + index * rowHeight;
        return (
          <g key={index}>
            <DiagramNode x={20} y={y} width={130} height={rowHeight - 8} label={`app-${index + 1}`} sublabel={instances === 4 ? "pool 20" : undefined} tone="violet" />
            <DiagramArrow from={[152, y + (rowHeight - 8) / 2]} to={usesBouncer ? [268, 145] : [498, 145]} tone="slate" />
          </g>
        );
      })}
      <DiagramLabel x={85} y={280} text={`${clients} client connection`} bold />

      <DiagramNode
        x={270}
        y={105}
        width={160}
        height={80}
        label="🚦 PgBouncer"
        sublabel={usesBouncer ? `pool_mode = ${mode}` : "không dùng"}
        tone="cyan"
        state={usesBouncer ? "active" : "dimmed"}
      />
      {usesBouncer && <DiagramArrow from={[432, 145]} to={[498, 145]} tone="cyan" animated label={`${info.server}`} />}
      {info.waiting > 0 && <DiagramLabel x={350} y={210} text={`⏳ ${info.waiting} đang chờ`} tone="amber" bold />}

      <DiagramNode
        x={500}
        y={95}
        width={200}
        height={100}
        label="🗄️ Postgres"
        sublabel={`${info.server} / ${MAX_CONNECTIONS} connection`}
        tone={info.ok ? "green" : "rose"}
        state="active"
      />
      <DiagramLabel x={590} y={225} text={info.verdict} tone={info.ok ? "green" : "rose"} bold size={12} />
    </DiagramFrame>
  );
}
