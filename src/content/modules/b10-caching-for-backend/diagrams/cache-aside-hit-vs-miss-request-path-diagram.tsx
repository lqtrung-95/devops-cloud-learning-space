"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "miss" | "hit";
type Actor = "client" | "redis" | "postgres";

interface FlowStep extends DiagramStep {
  active: Actor[];
  arrows: { from: [number, number]; to: [number, number]; tone: DiagramTone; label?: string; curve?: number }[];
}

const scenarioLabels: Record<Scenario, string> = {
  miss: "Cache MISS (lần đầu / hết TTL)",
  hit: "Cache HIT (đọc lại trong 30s)",
};

const scenarios: Record<Scenario, FlowStep[]> = {
  miss: [
    {
      title: "Client gọi API",
      description: "`GET /api/v1/projects/8f14.../tasks?status=todo&limit=20` — client chỉ biết URL, không biết Redis có gì.",
      active: ["client"],
      arrows: [{ from: [170, 150], to: [280, 150], tone: "violet" }],
    },
    {
      title: "API hỏi Redis trước",
      description: "Route build cache key theo đúng công thức rồi gọi `redis.get(key)` — LUÔN hỏi cache trước, không hỏi Postgres trước.",
      active: ["redis"],
      arrows: [{ from: [420, 128], to: [480, 128], tone: "amber", label: "GET key" }],
    },
    {
      title: "Redis: MISS",
      description: "Redis trả `null` — chưa ai hỏi key này gần đây, hoặc TTL 30 giây đã hết.",
      active: ["redis"],
      arrows: [{ from: [480, 150], to: [420, 150], tone: "rose", label: "null" }],
    },
    {
      title: "API query Postgres",
      description: "Chạy đúng câu Drizzle query cursor pagination từ B04 — độ trễ thật nằm ở đây (~15ms trong Docker dev).",
      active: ["postgres"],
      arrows: [{ from: [420, 195], to: [480, 215], tone: "rose", label: "SELECT ... WHERE project_id" }],
    },
    {
      title: "API lưu kết quả vào Redis",
      description: "`redis.set(key, JSON.stringify(result), \"EX\", 30)` rồi `SADD` key vào registry để dùng khi invalidate.",
      active: ["redis"],
      arrows: [{ from: [420, 110], to: [480, 100], tone: "green", label: "SET + SADD", curve: -15 }],
    },
    {
      title: "Trả kết quả cho Client",
      description: "Tổng thời gian ≈ round-trip Postgres + Redis — chậm nhất trong hai kịch bản, nhưng chỉ xảy ra khi thật sự cần.",
      active: ["client"],
      arrows: [{ from: [280, 150], to: [170, 150], tone: "violet" }],
    },
  ],
  hit: [
    {
      title: "Client gọi API",
      description: "Cùng URL hệt lần trước, gọi lại trong vòng 30 giây kể từ lần MISS.",
      active: ["client"],
      arrows: [{ from: [170, 150], to: [280, 150], tone: "violet" }],
    },
    {
      title: "API hỏi Redis trước",
      description: "Build key giống hệt công thức cũ — cùng tham số ⇒ cùng key, không có gì đặc biệt so với lần MISS.",
      active: ["redis"],
      arrows: [{ from: [420, 128], to: [480, 128], tone: "amber", label: "GET key" }],
    },
    {
      title: "Redis: HIT — dùng luôn",
      description: "Redis trả về đúng JSON đã lưu. `JSON.parse` rồi trả thẳng — KHÔNG chạm Postgres.",
      active: ["redis"],
      arrows: [{ from: [480, 150], to: [420, 150], tone: "green", label: "cached JSON" }],
    },
    {
      title: "Trả kết quả cho Client",
      description: "Chỉ một round-trip tới Redis (thường vài mili-giây trong Docker) — Postgres hoàn toàn rảnh cho request này.",
      active: ["client"],
      arrows: [{ from: [280, 150], to: [170, 150], tone: "violet" }],
    },
  ],
};

export function CacheAsideHitVsMissRequestPathDiagram() {
  const [scenario, setScenario] = useState<Scenario>("miss");
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
      <StepDiagram key={scenario} title="Cache-aside: đường đi của một request" viewBox="0 0 720 300" steps={steps}>
        {(stepIndex) => {
          const step = steps[stepIndex];
          return (
            <>
              <DiagramNode x={30} y={112} width={140} height={76} label="Client" emoji="🧑‍💻" tone="violet" state={step.active.includes("client") ? "active" : "normal"} />
              <DiagramNode x={280} y={112} width={140} height={76} label="API" sublabel="Fastify route" emoji="🛠️" tone="blue" state="normal" />
              <DiagramNode
                x={480}
                y={90}
                width={170}
                height={76}
                label="Redis"
                sublabel="tasks:{projectId}:list:*"
                emoji="🗂️"
                tone={scenario === "hit" ? "green" : "amber"}
                state={step.active.includes("redis") ? "active" : "normal"}
              />
              <DiagramNode
                x={480}
                y={194}
                width={170}
                height={70}
                label="Postgres"
                sublabel="tasks"
                emoji="🐘"
                tone="rose"
                state={step.active.includes("postgres") ? "active" : scenario === "hit" ? "dimmed" : "normal"}
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
