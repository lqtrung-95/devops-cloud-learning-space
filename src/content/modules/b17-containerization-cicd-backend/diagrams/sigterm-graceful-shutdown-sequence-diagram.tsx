"use client";

import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Scenario = "graceful" | "abrupt";

const GRACEFUL_STEPS = [
  "SIGTERM tới process",
  "app.close(): ngừng nhận connection mới",
  "Request đang chạy hoàn tất",
  "client.end() + redis.quit()",
  "process.exit(0)",
];

const ABRUPT_STEPS = ["SIGTERM tới process", "process.exit(0) ngay lập tức", "Request đang chạy bị cắt ngang", "Connection Postgres/Redis bị bỏ mồ côi"];

/** So sánh graceful shutdown (server.close() rồi mới đóng pool) với việc thoát ngay khi nhận SIGTERM. */
export function SigtermGracefulShutdownSequenceDiagram() {
  const [scenario, setScenario] = useState<Scenario>("graceful");
  const isGraceful = scenario === "graceful";
  const stepLabels = isGraceful ? GRACEFUL_STEPS : ABRUPT_STEPS;

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setScenario("graceful")}
        className={
          isGraceful
            ? "rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
            : "rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400"
        }
      >
        ✅ Có graceful shutdown
      </button>
      <button
        type="button"
        onClick={() => setScenario("abrupt")}
        className={
          !isGraceful
            ? "rounded-full bg-rose-600 px-3 py-1.5 text-sm font-medium text-white"
            : "rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400"
        }
      >
        ❌ process.exit() ngay
      </button>
      <span className="ml-auto text-xs font-medium text-stone-500">docker stop mặc định đợi 10s trước khi SIGKILL</span>
    </div>
  );

  return (
    <DiagramFrame title="SIGTERM: đóng cửa từ tốn hay sập cửa giữa chừng?" viewBox="0 0 720 300" controls={controls}>
      {/* Timeline */}
      <DiagramLabel x={30} y={24} text="t=0s: docker stop api" anchor="start" size={12} bold />
      <DiagramArrow from={[30, 32]} to={[690, 32]} tone="slate" />
      <DiagramLabel x={690} y={24} text="t=10s: SIGKILL nếu chưa thoát" anchor="end" size={11} tone="rose" />

      {stepLabels.map((label, index) => {
        const x = 40 + index * (640 / (stepLabels.length - 1 || 1));
        const isFinal = index === stepLabels.length - 1;
        const failing = !isGraceful && index >= 2;
        return (
          <g key={label}>
            <DiagramNode
              x={x - 65}
              y={60}
              width={130}
              height={70}
              label={label}
              tone={failing ? "rose" : isFinal ? "green" : "blue"}
              state={failing ? "active" : "normal"}
            />
          </g>
        );
      })}

      {/* Client request bar, in-flight during shutdown */}
      <DiagramNode
        x={40}
        y={170}
        width={640}
        height={40}
        label={isGraceful ? "Request đang xử lý: chờ xong rồi mới đóng server" : "Request đang xử lý: bị cắt ngang, client nhận connection reset"}
        tone={isGraceful ? "cyan" : "rose"}
        state="active"
      />

      <DiagramNode
        x={230}
        y={230}
        width={260}
        height={50}
        label={isGraceful ? "✅ Không mất request nào" : "🚫 Mất request + rò connection DB/Redis"}
        tone={isGraceful ? "green" : "rose"}
      />
    </DiagramFrame>
  );
}
