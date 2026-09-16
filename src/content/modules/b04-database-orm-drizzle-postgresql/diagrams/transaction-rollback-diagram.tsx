"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "success" | "forced-failure";

const nodes: Record<string, { x: number; y: number; width: number; label: string; sublabel: string; tone: DiagramTone }> = {
  begin: { x: 270, y: 10, width: 180, label: "BEGIN", sublabel: "db.transaction(async (tx) => {", tone: "violet" },
  insertTask: { x: 250, y: 90, width: 220, label: "tx.insert(tasks)", sublabel: ".returning() → lấy task.id", tone: "blue" },
  insertComment: { x: 250, y: 168, width: 220, label: "tx.insert(comments)", sublabel: "log dùng task.id vừa tạo", tone: "amber" },
  commit: { x: 40, y: 250, width: 230, label: "✅ COMMIT", sublabel: "2 dòng được lưu thật", tone: "green" },
  rollback: { x: 460, y: 250, width: 230, label: "↩️ ROLLBACK tự động", sublabel: "cả 2 dòng biến mất", tone: "rose" },
};

const scenarioData: Record<Scenario, { path: string[]; steps: DiagramStep[] }> = {
  success: {
    path: ["begin", "insertTask", "insertComment", "commit"],
    steps: [
      { title: "BEGIN", description: "`db.transaction(async (tx) => {...})` mở một transaction mới trên đúng 1 connection." },
      { title: "Insert task", description: "`await tx.insert(tasks).values({...}).returning()` — dùng `tx`, không dùng `db`, để nằm trong transaction." },
      { title: "Insert comment log", description: "`await tx.insert(comments).values({ taskId: task.id, ... })` — ghi tiếp trên cùng `tx`." },
      { title: "Không có lỗi → COMMIT", description: "Callback chạy xong không throw. Drizzle tự COMMIT — cả `tasks` và `comments` được lưu thật." },
    ],
  },
  "forced-failure": {
    path: ["begin", "insertTask", "insertComment", "rollback"],
    steps: [
      { title: "BEGIN", description: "Giống hệt kịch bản thành công lúc bắt đầu." },
      { title: "Insert task", description: "`tx.insert(tasks)` chạy — nhìn như đã thành công." },
      { title: "Insert comment log", description: "`tx.insert(comments)` cũng chạy xong." },
      {
        title: "throw Error(...) → ROLLBACK",
        description:
          "Ngay sau đó code `throw new Error(\"Giả lập lỗi\")`. Vì lỗi ném ra bên trong callback, Drizzle tự ROLLBACK toàn bộ — `tasks` lẫn `comments` đều biến mất, không cần gọi rollback thủ công.",
      },
    ],
  },
};

export function TransactionRollbackDiagram() {
  const [scenario, setScenario] = useState<Scenario>("forced-failure");
  const { path, steps } = scenarioData[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["success", "forced-failure"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "success" ? "Kịch bản: chạy trót lọt" : "Kịch bản: lỗi giữa chừng"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="db.transaction: tạo task + ghi log" viewBox="0 0 720 330" steps={steps}>
        {(step) => (
          <>
            <DiagramArrow from={[360, 64]} to={[360, 88]} tone="slate" dimmed={step < 1} />
            <DiagramArrow from={[360, 144]} to={[360, 166]} tone="slate" dimmed={step < 2} />
            <DiagramArrow
              from={[300, 222]}
              to={[155, 248]}
              tone="green"
              label="OK"
              dimmed={!path.includes("commit") || step < 3}
            />
            <DiagramArrow
              from={[420, 222]}
              to={[575, 248]}
              tone="rose"
              label="throw"
              dimmed={!path.includes("rollback") || step < 3}
            />
            {Object.entries(nodes).map(([id, node]) => {
              const position = path.indexOf(id);
              const state = position === step ? "active" : position !== -1 && position < step ? "normal" : "dimmed";
              return (
                <DiagramNode
                  key={id}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={58}
                  label={node.label}
                  sublabel={node.sublabel}
                  tone={node.tone}
                  state={state}
                />
              );
            })}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
