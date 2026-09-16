"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Mode = "naive" | "relational";

interface QueryStep extends DiagramStep {
  runningTotal: number;
}

const stepsByMode: Record<Mode, QueryStep[]> = {
  naive: [
    { title: "Query 1", description: "`const allTasks = await db.select().from(tasks)` — lấy 3 task.", runningTotal: 1 },
    { title: "Query 2", description: "Vòng lặp task #1: `db.select().from(comments).where(eq(comments.taskId, task1.id))`.", runningTotal: 2 },
    { title: "Query 3", description: "Vòng lặp task #2: chạy lại y hệt query trên, chỉ đổi `task2.id`.", runningTotal: 3 },
    { title: "Query 4", description: "Vòng lặp task #3: tổng cộng 1 + N = 4 query cho chỉ 3 task — với 300 task sẽ là 301 query.", runningTotal: 4 },
  ],
  relational: [
    { title: "Query 1", description: "`await db.query.tasks.findMany({ with: { comments: true } })` — Drizzle bắt đầu.", runningTotal: 1 },
    {
      title: "Query 2 (gộp theo lô)",
      description: "Drizzle tự phát 1 `SELECT` cho `tasks`, rồi 1 `SELECT ... WHERE task_id IN (...)` lấy hết comments của cả lô — không nhân theo N.",
      runningTotal: 2,
    },
  ],
};

export function NPlusOneQueryCounterDiagram() {
  const [mode, setMode] = useState<Mode>("naive");
  const steps = stepsByMode[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["naive", "relational"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "naive" ? "Vòng lặp thủ công (N+1)" : "Relational query API (with)"}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title="Đếm số query SQL thực tế" viewBox="0 0 720 220" steps={steps}>
        {(step) => {
          const total = steps[step].runningTotal;
          const isNaive = mode === "naive";
          return (
            <>
              <DiagramNode x={30} y={70} width={170} height={70} label="route handler" sublabel="taskflow-api" tone="violet" />
              <DiagramNode x={520} y={70} width={170} height={70} label="Postgres" sublabel="taskflow" tone="slate" />
              <MovingPacket
                key={`${mode}-${step}`}
                path="M 205 105 L 515 105"
                durationSeconds={0.9}
                repeat={false}
                tone={isNaive ? "rose" : "green"}
                label="query"
              />
              <DiagramNode
                x={280}
                y={150}
                width={160}
                height={54}
                label={`Tổng: ${total} query`}
                tone={isNaive && total > 1 ? "rose" : "green"}
                state="active"
              />
              <DiagramLabel
                x={360}
                y={30}
                text={isNaive ? "Mỗi vòng lặp = 1 query mới, tăng dần theo N" : "Số query không phụ thuộc N task"}
                size={12}
                tone={isNaive ? "rose" : "green"}
                bold
              />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
