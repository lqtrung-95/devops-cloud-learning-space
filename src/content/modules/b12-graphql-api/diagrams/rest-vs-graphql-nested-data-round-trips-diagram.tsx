"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "rest" | "graphql";
type Actor = "client" | "api" | "postgres";

interface FlowStep extends DiagramStep {
  active: Actor[];
  arrows: { from: [number, number]; to: [number, number]; tone: DiagramTone; label?: string; curve?: number }[];
  requestCount: number;
}

const scenarioLabels: Record<Scenario, string> = {
  rest: "REST — 3 endpoint riêng",
  graphql: "GraphQL — 1 query duy nhất",
};

const scenarios: Record<Scenario, FlowStep[]> = {
  rest: [
    {
      title: "Gọi GET /projects/:id",
      description: "Client cần project trước. Round-trip 1 trong 3.",
      active: ["client", "api"],
      arrows: [
        { from: [170, 150], to: [280, 150], tone: "violet", label: "GET /projects/:id" },
        { from: [420, 128], to: [480, 128], tone: "blue" },
      ],
      requestCount: 1,
    },
    {
      title: "Gọi GET /projects/:id/tasks",
      description: "Có project rồi mới biết gọi endpoint task nào. Round-trip 2.",
      active: ["client", "api"],
      arrows: [
        { from: [170, 150], to: [280, 150], tone: "violet", label: "GET .../tasks" },
        { from: [420, 128], to: [480, 128], tone: "blue" },
      ],
      requestCount: 2,
    },
    {
      title: "Gọi GET /tasks/:id/comments cho TỪNG task",
      description: "Muốn có comment + author của từng task, client lặp lại endpoint này N lần — hoặc backend phải tự over-fetch để gộp sẵn.",
      active: ["client", "api", "postgres"],
      arrows: [
        { from: [170, 150], to: [280, 150], tone: "violet", label: "GET .../comments ×N" },
        { from: [420, 128], to: [480, 128], tone: "amber" },
        { from: [420, 195], to: [480, 215], tone: "rose", label: "N câu SELECT" },
      ],
      requestCount: 4,
    },
    {
      title: "Tổng cộng",
      description: "Ít nhất 3 round-trip riêng biệt (hoặc 1 endpoint over-fetch được thiết kế cứng cho đúng 1 màn hình) — thêm 1 màn hình mới lại cần thêm endpoint mới.",
      active: ["client"],
      arrows: [{ from: [280, 150], to: [170, 150], tone: "rose", label: "3+ round-trip" }],
      requestCount: 4,
    },
  ],
  graphql: [
    {
      title: "Client gửi 1 query duy nhất",
      description: "`{ project(id) { name tasks { title comments { body author { name } } } } }` — client tự chọn đúng field cần, gửi 1 lần.",
      active: ["client", "api"],
      arrows: [{ from: [170, 150], to: [280, 150], tone: "violet", label: "POST /graphql" }],
      requestCount: 1,
    },
    {
      title: "Resolver lồng nhau tự chạy trong 1 request",
      description: "API tự điều phối các resolver Project → Task → Comment → User, KHÔNG cần client gọi lại lần nào nữa.",
      active: ["api", "postgres"],
      arrows: [{ from: [420, 150], to: [480, 150], tone: "blue" }],
      requestCount: 1,
    },
    {
      title: "Trả về đúng 1 response lồng sẵn",
      description: "Client nhận đúng shape đã hỏi, không thừa không thiếu field — không có over-fetch/under-fetch.",
      active: ["client"],
      arrows: [{ from: [280, 150], to: [170, 150], tone: "green", label: "1 response lồng 3 cấp" }],
      requestCount: 1,
    },
  ],
};

export function RestVsGraphqlNestedDataRoundTripsDiagram() {
  const [scenario, setScenario] = useState<Scenario>("rest");
  const steps = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarioLabels) as Scenario[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarioLabels[option]}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Cùng một màn hình: REST cần mấy round-trip so với GraphQL?" viewBox="0 0 720 300" steps={steps}>
        {(stepIndex) => {
          const step = steps[stepIndex];
          return (
            <>
              <DiagramNode x={30} y={112} width={140} height={76} label="Client" emoji="🧑‍💻" tone="violet" state={step.active.includes("client") ? "active" : "normal"} />
              <DiagramNode x={280} y={112} width={140} height={76} label="API" sublabel="Fastify" emoji="🛠️" tone="blue" state={step.active.includes("api") ? "active" : "normal"} />
              <DiagramNode
                x={480}
                y={90}
                width={170}
                height={76}
                label="Postgres"
                sublabel="projects/tasks/comments"
                emoji="🐘"
                tone="rose"
                state={step.active.includes("postgres") ? "active" : "dimmed"}
              />
              <DiagramNode
                x={480}
                y={200}
                width={170}
                height={64}
                label="Round-trip tính đến giờ"
                sublabel={`${step.requestCount} lượt gọi mạng`}
                tone={scenario === "rest" ? "rose" : "green"}
                state="normal"
              />
              {step.arrows.map((arrow, arrowIndex) => (
                <DiagramArrow key={arrowIndex} {...arrow} animated />
              ))}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
