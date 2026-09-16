"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Behavior = "invalidate" | "forgot";
type Actor = "client" | "api" | "postgres" | "redis";
type KeyState = "kept" | "deleted";

interface WriteStep extends DiagramStep {
  active: Actor[];
  arrows: { from: [number, number]; to: [number, number]; tone: DiagramTone; label?: string }[];
  keys: KeyState[];
}

const registryKeys = [
  "tasks:{p}:list:status=all:cursor=first:limit=20",
  "tasks:{p}:list:status=todo:cursor=first:limit=20",
  "tasks:{p}:list:status=done:cursor=first:limit=20",
];

const behaviorLabels: Record<Behavior, string> = {
  invalidate: "Có gọi invalidate (đúng)",
  forgot: "Quên gọi invalidate (bug)",
};

const scenarios: Record<Behavior, WriteStep[]> = {
  invalidate: [
    {
      title: "Client sửa task",
      description: "`PATCH /api/v1/projects/{p}/tasks/{id}` đổi `status` từ `todo` sang `done`. 3 key list của project vẫn còn nguyên trong Redis.",
      active: ["client"],
      arrows: [{ from: [130, 165], to: [200, 165], tone: "violet", label: "PATCH" }],
      keys: ["kept", "kept", "kept"],
    },
    {
      title: "Ghi xuống Postgres",
      description: "Update commit thành công — hàng trong bảng `tasks` đã đổi. Postgres đúng, nhưng cache vẫn còn bản cũ, chưa ai xoá.",
      active: ["api", "postgres"],
      arrows: [{ from: [280, 140], to: [380, 108], tone: "rose", label: "UPDATE ... SET status" }],
      keys: ["kept", "kept", "kept"],
    },
    {
      title: "Tra registry & xoá toàn bộ key liên quan",
      description: "`SMEMBERS tasks:{p}:list:keys` lấy đủ 3 key, `UNLINK` cả 3, rồi `DEL` chính registry set — xoá NGUYÊN cache, không sửa từng phần tử bên trong.",
      active: ["api", "redis"],
      arrows: [{ from: [280, 190], to: [380, 220], tone: "rose", label: "SMEMBERS + UNLINK ×3" }],
      keys: ["deleted", "deleted", "deleted"],
    },
    {
      title: "Client gọi lại danh sách",
      description: "`GET .../tasks?status=todo` — key vừa bị xoá nên chắc chắn MISS, dữ liệu trả về chắc chắn mới vì không còn key cũ nào để đọc nhầm.",
      active: ["client", "api", "postgres"],
      arrows: [
        { from: [130, 165], to: [200, 165], tone: "violet", label: "GET" },
        { from: [280, 140], to: [380, 108], tone: "amber", label: "MISS → query lại" },
      ],
      keys: ["deleted", "deleted", "deleted"],
    },
  ],
  forgot: [
    {
      title: "Client sửa task",
      description: "Y hệt kịch bản đúng: `PATCH` đổi `status` từ `todo` sang `done`. 3 key vẫn còn nguyên, TTL 30s vẫn đang đếm.",
      active: ["client"],
      arrows: [{ from: [130, 165], to: [200, 165], tone: "violet", label: "PATCH" }],
      keys: ["kept", "kept", "kept"],
    },
    {
      title: "Ghi xuống Postgres — nhưng quên gọi invalidate",
      description: "Update Postgres xong, route trả response luôn — thiếu dòng gọi `invalidateProjectTaskListCache(projectId)`. Không có lệnh xoá nào được gọi.",
      active: ["api", "postgres"],
      arrows: [{ from: [280, 140], to: [380, 108], tone: "rose", label: "UPDATE ... SET status" }],
      keys: ["kept", "kept", "kept"],
    },
    {
      title: "Client gọi lại danh sách",
      description: "`GET .../tasks?status=todo` trong lúc TTL còn hiệu lực. Vẫn còn key cũ — Redis sẵn sàng trả nó ra.",
      active: ["client", "api", "redis"],
      arrows: [
        { from: [130, 165], to: [200, 165], tone: "violet", label: "GET" },
        { from: [280, 190], to: [380, 220], tone: "amber", label: "GET key" },
      ],
      keys: ["kept", "kept", "kept"],
    },
    {
      title: "HIT — trả về dữ liệu CŨ",
      description: "Redis vẫn còn key với JSON lưu TRƯỚC khi task đổi trạng thái ⇒ client thấy task vẫn `todo`, dù Postgres đã ghi `done` từ lâu. Bug kéo dài tới khi TTL 30s tự hết.",
      active: ["client", "redis"],
      arrows: [{ from: [380, 220], to: [280, 190], tone: "rose", label: "HIT — JSON cũ" }],
      keys: ["kept", "kept", "kept"],
    },
  ],
};

export function CacheInvalidationOnWriteDiagram() {
  const [behavior, setBehavior] = useState<Behavior>("invalidate");
  const steps = scenarios[behavior];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(behaviorLabels) as Behavior[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setBehavior(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              behavior === option ? (option === "invalidate" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {behaviorLabels[option]}
          </button>
        ))}
      </div>
      <StepDiagram key={behavior} title="Invalidate khi ghi: xoá đúng key, hay quên mất?" viewBox="0 0 720 340" steps={steps}>
        {(index) => {
          const step = steps[index];
          return (
            <>
              <DiagramNode x={20} y={130} width={110} height={70} label="Client" emoji="🧑‍💻" tone="violet" state={step.active.includes("client") ? "active" : "normal"} />
              <DiagramNode x={200} y={130} width={110} height={70} label="API" sublabel="Fastify route" emoji="🛠️" tone="blue" state={step.active.includes("api") ? "active" : "normal"} />
              <DiagramNode x={380} y={70} width={160} height={64} label="Postgres" sublabel="tasks" emoji="🐘" tone="rose" state={step.active.includes("postgres") ? "active" : "normal"} />
              {step.arrows.map((arrow, arrowIndex) => (
                <DiagramArrow key={arrowIndex} {...arrow} animated />
              ))}
              <DiagramGroupBox
                x={380}
                y={170}
                width={300}
                height={150}
                label="Redis — key list của project"
                tone={behavior === "invalidate" && index >= 2 ? "green" : "amber"}
              >
                {registryKeys.map((key, keyIndex) => (
                  <text
                    key={key}
                    x={396}
                    y={200 + keyIndex * 34}
                    fontSize={11}
                    className={clsx(
                      "font-mono transition-opacity duration-500",
                      step.keys[keyIndex] === "deleted" ? "fill-rose-500 opacity-40 line-through" : "fill-stone-800 dark:fill-stone-200",
                    )}
                  >
                    {step.keys[keyIndex] === "deleted" ? `UNLINK ${key}` : key}
                  </text>
                ))}
              </DiagramGroupBox>
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
