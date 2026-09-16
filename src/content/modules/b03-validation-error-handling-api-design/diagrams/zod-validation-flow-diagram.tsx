"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "valid" | "invalid";

const stepsFor: Record<Scenario, DiagramStep[]> = {
  valid: [
    { title: "Request tới", description: "Client gửi `POST /api/v1/tasks` với body `{ title: \"Viết báo cáo\" }`." },
    { title: "Zod parse", description: "Fastify gọi validator compiler, chạy `createTaskBodySchema.parse(body)`." },
    { title: "Khớp schema", description: "`title` là string không rỗng — đúng schema. Zod trả lại object đã được làm sạch kiểu dữ liệu." },
    { title: "Vào handler", description: "Request đi tiếp vào route handler với `request.body` đã có type chính xác (không cần ép kiểu tay)." },
    { title: "201 Created", description: "Handler tạo task, trả `201` kèm resource vừa tạo." },
  ],
  invalid: [
    { title: "Request tới", description: "Client gửi `POST /api/v1/tasks` với body `{ title: \"\" }` (chuỗi rỗng)." },
    { title: "Zod parse", description: "Fastify gọi validator compiler, chạy `createTaskBodySchema.parse(body)`." },
    { title: "Không khớp schema", description: "`title` rỗng vi phạm `.min(1)` — Zod ném `ZodError` liệt kê chính xác field nào sai." },
    { title: "Chặn trước handler", description: "Request KHÔNG bao giờ tới route handler — Fastify chuyển thẳng lỗi sang `setErrorHandler`." },
    { title: "422 Unprocessable Entity", description: "Client nhận `{ error: { code: \"VALIDATION_ERROR\", message, details: [{ path: \"title\", ... }] } }`." },
  ],
};

const nodeBase = { width: 190, height: 56 } as const;

export function ZodValidationFlowDiagram() {
  const [scenario, setScenario] = useState<Scenario>("valid");
  const steps = stepsFor[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["valid", "invalid"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "valid" ? "Kịch bản: body hợp lệ" : "Kịch bản: body thiếu/sai kiểu"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Zod schema chặn request xấu trước khi vào handler" viewBox="0 0 720 320" steps={steps}>
        {(step) => {
          const isValid = scenario === "valid";
          return (
            <>
              <DiagramArrow from={[145, 40]} to={[145, 62]} tone="slate" dimmed={step < 1} />
              <DiagramArrow from={[145, 118]} to={[145, 140]} tone="slate" dimmed={step < 2} />
              <DiagramArrow
                from={[145, 196]}
                to={isValid ? [145, 218] : [480, 218]}
                curve={isValid ? 0 : 60}
                tone={isValid ? "green" : "rose"}
                label={isValid ? "hợp lệ" : "sai schema"}
                dimmed={step < 3}
              />
              {isValid && <DiagramArrow from={[145, 274]} to={[145, 296]} tone="green" dimmed={step < 4} />}

              <DiagramNode {...nodeBase} x={50} y={12} label="📨 Request tới" sublabel="POST /api/v1/tasks" tone="blue" state={step === 0 ? "active" : step > 0 ? "normal" : "dimmed"} />
              <DiagramNode
                {...nodeBase}
                x={50}
                y={90}
                label="🛂 Zod .parse()"
                sublabel="createTaskBodySchema"
                tone="amber"
                state={step === 1 ? "active" : step > 1 ? "normal" : "dimmed"}
              />
              <DiagramNode
                {...nodeBase}
                x={50}
                y={168}
                label={isValid ? "✅ Khớp schema" : "❌ Không khớp schema"}
                sublabel={isValid ? "type đã sạch" : "ZodError chi tiết field"}
                tone={isValid ? "green" : "rose"}
                state={step === 2 ? "active" : step > 2 ? "normal" : "dimmed"}
              />
              {isValid ? (
                <DiagramNode
                  {...nodeBase}
                  x={50}
                  y={246}
                  label="🧩 Route handler"
                  sublabel="request.body đã có type"
                  tone="green"
                  state={step === 3 ? "active" : step > 3 ? "normal" : "dimmed"}
                />
              ) : (
                <DiagramNode
                  {...nodeBase}
                  x={385}
                  y={168}
                  label="🚨 setErrorHandler"
                  sublabel="không vào handler"
                  tone="rose"
                  state={step === 3 ? "active" : step > 3 ? "normal" : "dimmed"}
                />
              )}
              <DiagramNode
                {...{ ...nodeBase, width: 240 }}
                x={isValid ? 30 : 385}
                y={isValid ? 246 : 246}
                label={isValid ? "201 Created" : "422 VALIDATION_ERROR"}
                sublabel={isValid ? "trả resource vừa tạo" : "error.code + details[]"}
                tone={isValid ? "green" : "rose"}
                state={step === 4 ? "active" : "dimmed"}
              />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
