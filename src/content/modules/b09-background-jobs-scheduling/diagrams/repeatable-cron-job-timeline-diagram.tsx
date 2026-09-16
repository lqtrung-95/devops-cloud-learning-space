"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Scenario = "normal" | "restart";

const runs = [0, 30, 60, 90, 120] as const; // phút, minh hoạ pattern "*/30 * * * *"

const copy: Record<Scenario, { caption: string }> = {
  normal: {
    caption:
      "BullMQ lưu lịch chạy (repeat pattern) trong Redis, không phải trong bộ nhớ của process `worker`. Mỗi 30 phút, một job `cleanup-expired-refresh-tokens` mới xuất hiện trong hàng đợi dù không có ai gọi API nào cả.",
  },
  restart: {
    caption:
      "`worker` container restart lúc phút 45 (deploy mới, crash, `docker compose restart`...). Vì lịch nằm trong Redis chứ không phải `setInterval` trong RAM của process, job ở phút 60 vẫn được lên lịch đúng giờ khi worker mới khởi động lại và kết nối lại Redis.",
  },
};

/** Toggle: repeatable job keeps its schedule across a worker restart because state lives in Redis, not in-process. */
export function RepeatableCronJobTimelineDiagram() {
  const [scenario, setScenario] = useState<Scenario>("normal");

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["normal", "restart"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "normal" ? "Chạy bình thường" : "Worker restart giữa chừng"}
          </button>
        ))}
      </div>
      <DiagramFrame title="Repeatable job: dọn refresh_tokens hết hạn mỗi 30 phút" viewBox="0 0 720 240" caption={copy[scenario].caption}>
        <DiagramLabel x={20} y={20} text="phút →" anchor="start" size={11} />
        <DiagramArrow from={[16, 30]} to={[700, 30]} tone="slate" dimmed />

        {runs.map((minute, index) => {
          const x = 40 + index * 160;
          const isRestartGap = scenario === "restart" && minute === 60;
          return (
            <g key={minute}>
              <DiagramNode
                x={x - 55}
                y={60}
                width={110}
                height={60}
                label={`t=${minute}p`}
                sublabel="DELETE expired"
                emoji={isRestartGap ? "🔁" : "🧹"}
                tone={isRestartGap ? "amber" : "green"}
                state={isRestartGap ? "active" : "normal"}
              />
              <DiagramArrow from={[x, 30]} to={[x, 58]} tone={isRestartGap ? "amber" : "green"} dimmed={false} />
            </g>
          );
        })}

        {scenario === "restart" && (
          <>
            <DiagramNode x={280} y={150} width={200} height={50} label="worker restart" sublabel="phút 45 — process chết & sống lại" tone="rose" dashed />
            <DiagramArrow from={[380, 150]} to={[380, 122]} tone="rose" animated label="Redis vẫn giữ lịch" />
          </>
        )}
      </DiagramFrame>
    </div>
  );
}
