"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "project-safe" | "task-leak" | "task-fixed";
type Actor = "client" | "context" | "resolver" | "service" | "postgres";

interface FlowStep extends DiagramStep {
  active: Actor[];
  arrows: { from: [number, number]; to: [number, number]; tone: DiagramTone; label?: string; curve?: number }[];
  verdict?: "ok" | "leak";
}

const scenarioLabels: Record<Scenario, string> = {
  "project-safe": "Query.project — có check org",
  "task-leak": "Query.task mới thêm — QUÊN check (rò rỉ)",
  "task-fixed": "Query.task — đã vá",
};

const scenarios: Record<Scenario, FlowStep[]> = {
  "project-safe": [
    {
      title: "Client gửi query kèm JWT",
      description: "User thuộc org A gọi `Query.project(id: \"proj-B\")` — id thuộc org KHÁC (org B).",
      active: ["client"],
      arrows: [{ from: [110, 150], to: [220, 150], tone: "violet", label: "POST /graphql + Bearer JWT" }],
    },
    {
      title: "context() verify JWT",
      description: "`request.jwtVerify()` (cùng @fastify/jwt của B05) lấy `userId` từ `sub`, gắn vào context cho mọi resolver dùng.",
      active: ["context"],
      arrows: [{ from: [220, 150], to: [330, 150], tone: "blue" }],
    },
    {
      title: "Resolver gọi service layer",
      description: "`Query.project` gọi `getProjectById(id)` — hàm y hệt route REST đang dùng, không viết lại logic.",
      active: ["resolver", "service"],
      arrows: [{ from: [330, 150], to: [440, 150], tone: "blue" }],
    },
    {
      title: "Service tự kiểm tra org-scoping",
      description: "Resolver GỌI THÊM `getMembershipRole(userId, project.organizationId)` — user org A không có membership ở org B ⇒ role null.",
      active: ["service"],
      arrows: [{ from: [440, 128], to: [560, 128], tone: "amber", label: "getMembershipRole" }],
      verdict: "ok",
    },
    {
      title: "Chặn đúng — trả lỗi, không lộ dữ liệu",
      description: "Không có membership ⇒ resolver throw lỗi 'không tìm thấy', KHÔNG trả project của org B. Giống hệt REST.",
      active: ["client"],
      arrows: [{ from: [330, 172], to: [110, 172], tone: "green", label: "lỗi — không rò rỉ" }],
      verdict: "ok",
    },
  ],
  "task-leak": [
    {
      title: "Client gửi query kèm JWT",
      description: "Cùng user org A, nhưng lần này gọi field MỚI THÊM: `Query.task(id: \"task-of-org-B\")`.",
      active: ["client"],
      arrows: [{ from: [110, 150], to: [220, 150], tone: "violet", label: "POST /graphql + Bearer JWT" }],
    },
    {
      title: "context() verify JWT — vẫn đúng",
      description: "Bước xác thực JWT không có vấn đề gì — userId org A vẫn được lấy đúng.",
      active: ["context"],
      arrows: [{ from: [220, 150], to: [330, 150], tone: "blue" }],
    },
    {
      title: "Resolver gọi thẳng service — THIẾU bước check",
      description: "`Query.task` gọi thẳng `getTaskById(id)` rồi trả kết quả luôn — dev nghĩ 'chỉ là đọc dữ liệu, chắc không sao'.",
      active: ["resolver", "service"],
      arrows: [{ from: [330, 150], to: [440, 150], tone: "rose", label: "getTaskById (không check org)" }],
      verdict: "leak",
    },
    {
      title: "Rò rỉ: trả về task của org khác",
      description: "Không có bước `getMembershipRole` nào chạy — user org A đọc được task thuộc org B chỉ vì biết đúng UUID.",
      active: ["client"],
      arrows: [{ from: [330, 172], to: [110, 172], tone: "rose", label: "200 OK — LỘ dữ liệu org B" }],
      verdict: "leak",
    },
  ],
  "task-fixed": [
    {
      title: "Client gửi lại đúng request cũ",
      description: "Vẫn user org A, vẫn gọi `Query.task(id: \"task-of-org-B\")`.",
      active: ["client"],
      arrows: [{ from: [110, 150], to: [220, 150], tone: "violet", label: "POST /graphql + Bearer JWT" }],
    },
    {
      title: "context() verify JWT",
      description: "Không đổi gì ở bước này.",
      active: ["context"],
      arrows: [{ from: [220, 150], to: [330, 150], tone: "blue" }],
    },
    {
      title: "Resolver tự tra organizationId rồi mới check",
      description: "`Query.task` sửa lại: lấy task, đọc `task.project.organizationId`, gọi `getMembershipRole(userId, organizationId)` TRƯỚC khi trả kết quả — giống hệt cách `Query.project` đã làm.",
      active: ["resolver", "service"],
      arrows: [{ from: [440, 128], to: [560, 128], tone: "amber", label: "getMembershipRole" }],
      verdict: "ok",
    },
    {
      title: "Chặn đúng — không còn rò rỉ",
      description: "Field mới thêm giờ tự org-scope y hệt các field cũ — nguyên tắc: MỌI entry point nhận ID trực tiếp từ client phải tự kiểm tra quyền, không kế thừa miễn phí.",
      active: ["client"],
      arrows: [{ from: [330, 172], to: [110, 172], tone: "green", label: "lỗi — không rò rỉ" }],
      verdict: "ok",
    },
  ],
};

export function ResolverServiceLayerAndOrgScopingDiagram() {
  const [scenario, setScenario] = useState<Scenario>("project-safe");
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
      <StepDiagram key={scenario} title="Resolver gọi service layer — org-scoping có theo kịp không?" viewBox="0 0 680 300" steps={steps}>
        {(stepIndex) => {
          const step = steps[stepIndex];
          const leaking = step.verdict === "leak";
          return (
            <>
              <DiagramNode x={10} y={112} width={100} height={76} label="Client" emoji="🧑‍💻" tone="violet" state={step.active.includes("client") ? "active" : "normal"} />
              <DiagramNode x={220} y={112} width={110} height={76} label="context()" sublabel="verify JWT" emoji="🔑" tone="blue" state={step.active.includes("context") ? "active" : "normal"} />
              <DiagramNode x={330} y={112} width={110} height={76} label="Resolver" emoji="🧩" tone="blue" state={step.active.includes("resolver") ? "active" : "normal"} />
              <DiagramNode
                x={440}
                y={100}
                width={130}
                height={100}
                label="Service layer"
                sublabel={leaking ? "thiếu getMembershipRole" : "getMembershipRole()"}
                emoji="🗄️"
                tone={leaking ? "rose" : "green"}
                state={step.active.includes("service") ? "active" : "normal"}
              />
              <DiagramNode x={600} y={205} width={60} height={50} label="DB" emoji="🐘" tone="slate" state={step.active.includes("postgres") ? "active" : "dimmed"} />
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
