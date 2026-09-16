"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

/**
 * Fastify encapsulation model: mỗi register() tạo một "context" con riêng.
 * Decorator khai báo trong context con KHÔNG lộ ra ngoài hay sang context anh em —
 * trừ khi bọc bằng fastify-plugin (fp) để "phá" ranh giới đó một cách chủ động.
 */
const steps: DiagramStep[] = [
  { title: "app gốc", description: "`const app = Fastify()` — context gốc, chưa có route hay decorator nào." },
  {
    title: "register storePlugin (dùng fp)",
    description: "`app.register(fp(storePlugin))` decorate `fastify.store = { projects, tasks }` lên context GỐC — vì bọc `fp()`, decorator này lộ ra mọi context con phía dưới.",
  },
  {
    title: "register projectRoutes (plugin thường)",
    description: "`app.register(projectRoutes, { prefix: '/api/v1/projects' })` tạo context con riêng. Nó thấy được `fastify.store` (kế thừa từ cha), và có thể tự decorate thêm `assertProjectExists` — nhưng decorator này chỉ tồn tại TRONG context của nó.",
  },
  {
    title: "register taskRoutes (plugin thường, context khác)",
    description: "`app.register(taskRoutes, { prefix: '/api/v1' })` là một context con KHÁC, song song với projectRoutes — hai context anh em không thấy decorator riêng của nhau.",
  },
  {
    title: "Thử gọi chéo → lỗi",
    description: "Nếu taskRoutes gọi `fastify.assertProjectExists(...)` (decorator riêng của projectRoutes) → `FastifyError: decorator not found`. Nhưng `fastify.store` vẫn dùng được ở cả hai vì đến từ context GỐC qua `fp()`.",
  },
];

export function FastifyPluginEncapsulationDiagram() {
  return (
    <StepDiagram title="Encapsulation: context nào thấy decorator nào" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const storeVisible = step >= 1;
        const projectsRegistered = step >= 2;
        const tasksRegistered = step >= 3;
        const showError = step === 4;

        return (
          <>
            <DiagramGroupBox x={10} y={10} width={700} height={90} label="Context gốc (app)" tone="slate">
              <DiagramNode x={30} y={40} width={150} height={50} label="fastify.store" sublabel={storeVisible ? "decorate qua fp()" : "chưa có"} tone={storeVisible ? "blue" : "slate"} state={step === 1 ? "active" : storeVisible ? "normal" : "dimmed"} />
            </DiagramGroupBox>

            <DiagramGroupBox x={30} y={130} width={310} height={170} label="Context: projectRoutes" tone="green">
              <DiagramNode x={50} y={165} width={130} height={44} label="fastify.store" sublabel="kế thừa từ cha" tone="blue" state={projectsRegistered && storeVisible ? "normal" : "dimmed"} />
              <DiagramNode x={200} y={165} width={120} height={44} label="assertProjectExists" sublabel="chỉ ở đây" tone="green" state={projectsRegistered ? (step === 2 ? "active" : "normal") : "dimmed"} />
              <DiagramNode x={90} y={230} width={200} height={44} label="GET /projects/:id" tone="green" state={projectsRegistered ? "normal" : "dimmed"} />
            </DiagramGroupBox>

            <DiagramGroupBox x={370} y={130} width={340} height={170} label="Context: taskRoutes" tone="amber">
              <DiagramNode x={390} y={165} width={130} height={44} label="fastify.store" sublabel="kế thừa từ cha" tone="blue" state={tasksRegistered && storeVisible ? "normal" : "dimmed"} />
              <DiagramNode x={540} y={165} width={150} height={44} label="assertProjectExists?" sublabel={showError ? "decorator not found" : "không tồn tại ở đây"} tone={showError ? "rose" : "slate"} state={tasksRegistered ? (showError ? "active" : "dimmed") : "dimmed"} />
              <DiagramNode x={430} y={230} width={220} height={44} label="GET /projects/:id/tasks" tone="amber" state={tasksRegistered ? "normal" : "dimmed"} />
            </DiagramGroupBox>

            <DiagramArrow from={[105, 100]} to={[105, 163]} tone="blue" animated={projectsRegistered && storeVisible} dimmed={!(projectsRegistered && storeVisible)} />
            <DiagramArrow from={[440, 100]} to={[440, 163]} tone="blue" animated={tasksRegistered && storeVisible} dimmed={!(tasksRegistered && storeVisible)} />
            {showError && <DiagramArrow from={[320, 187]} to={[540, 187]} tone="rose" animated label="gọi chéo → lỗi" />}
            {step === 0 && <DiagramLabel x={360} y={290} text="Chưa register plugin nào — chỉ có app gốc trống." size={12} />}
          </>
        );
      }}
    </StepDiagram>
  );
}
