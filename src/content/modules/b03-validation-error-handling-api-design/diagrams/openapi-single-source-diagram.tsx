"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "Định nghĩa 1 lần",
    description: "`createTaskBodySchema = z.object({ title: z.string().min(1), status: z.enum([...]) })` — viết đúng MỘT LẦN trong `src/schemas/`.",
  },
  {
    title: "Gắn vào route",
    description: "Route `POST /api/v1/tasks` khai báo `schema: { body: createTaskBodySchema }` khi đăng ký với Fastify qua `withTypeProvider<ZodTypeProvider>()`.",
  },
  {
    title: "Validate lúc chạy",
    description: "Mỗi request thật đi qua route này được `validatorCompiler` (từ `fastify-type-provider-zod`) parse bằng đúng schema đó — đây là nguồn `422` bạn thấy ở lesson trước.",
  },
  {
    title: "Sinh OpenAPI",
    description: "`@fastify/swagger` đọc CÙNG schema đó qua `jsonSchemaTransform`, không phải một file `.yaml` viết tay riêng — chuyển Zod schema sang JSON Schema cho OpenAPI.",
  },
  {
    title: "Hiển thị /docs",
    description: "`@fastify/swagger-ui` render OpenAPI spec vừa sinh thành trang Swagger UI tại `/docs` — luôn khớp 100% với validation thật đang chạy.",
  },
];

export function OpenapiSingleSourceDiagram() {
  return (
    <StepDiagram title="Một schema Zod, hai công dụng: validate và tự sinh doc" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramArrow from={[150, 66]} to={[150, 88]} tone="violet" dimmed={step < 1} />
          <DiagramArrow from={[150, 144]} to={[150, 166]} tone="blue" dimmed={step < 2} />
          <DiagramArrow from={[240, 190]} to={[430, 108]} tone="amber" curve={-40} dimmed={step < 3} label="jsonSchemaTransform" />
          <DiagramArrow from={[520, 136]} to={[520, 210]} tone="cyan" dimmed={step < 4} />

          <DiagramNode
            x={40}
            y={10}
            width={220}
            height={56}
            tone="violet"
            label="📐 createTaskBodySchema"
            sublabel="z.object({ title, status })"
            state={step === 0 ? "active" : step > 0 ? "normal" : "dimmed"}
          />
          <DiagramNode
            x={40}
            y={88}
            width={220}
            height={56}
            tone="blue"
            label="🔌 Gắn vào route Fastify"
            sublabel="schema: { body: ... }"
            state={step === 1 ? "active" : step > 1 ? "normal" : "dimmed"}
          />
          <DiagramNode
            x={40}
            y={166}
            width={220}
            height={56}
            tone="green"
            label="🛂 Validate request thật"
            sublabel="422 khi sai — lesson trước"
            state={step === 2 ? "active" : step > 2 ? "normal" : "dimmed"}
          />

          <DiagramNode
            x={410}
            y={80}
            width={220}
            height={56}
            tone="amber"
            label="📄 OpenAPI JSON Schema"
            sublabel="@fastify/swagger sinh ra"
            state={step === 3 ? "active" : step > 3 ? "normal" : "dimmed"}
          />
          <DiagramNode
            x={410}
            y={212}
            width={220}
            height={56}
            tone="cyan"
            label="🖥️ Swagger UI tại /docs"
            sublabel="luôn khớp validation thật"
            state={step === 4 ? "active" : "dimmed"}
          />
        </>
      )}
    </StepDiagram>
  );
}
