"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

/**
 * Request lifecycle rút gọn của Fastify (5 hook chính dùng trong module này).
 * Thứ tự đầy đủ còn có preParsing (trước preValidation) và preSerialization/onResponse
 * (sau onSend) — nêu ở phần Technical, không vẽ hết để giữ diagram dễ đọc.
 */
const phases = [
  { key: "onRequest", label: "onRequest", sublabel: "request vừa vào, chưa parse body", emoji: "📥" },
  { key: "preValidation", label: "preValidation", sublabel: "trước khi Fastify validate schema", emoji: "🔍" },
  { key: "preHandler", label: "preHandler", sublabel: "sau validate, trước handler", emoji: "🛂" },
  { key: "handler", label: "handler", sublabel: "code route thật sự chạy ở đây", emoji: "⚙️" },
  { key: "onSend", label: "onSend", sublabel: "trước khi payload rời server", emoji: "📤" },
] as const;

const steps: DiagramStep[] = [
  { title: "onRequest", description: "Hook chạy sớm nhất, request thô vừa tới. Dùng để ghi `requestId`, log thời điểm bắt đầu (`request.startTime = process.hrtime.bigint()`) — chưa có `request.body`." },
  { title: "preValidation", description: "Chạy trước khi Fastify kiểm tra schema (từ B03 trở đi có Zod/JSON Schema ở đây). Có thể sửa payload trước khi validate." },
  { title: "preHandler", description: "Payload đã hợp lệ. Chỗ hợp lý để kiểm tra quyền hạn (authorization) — B06 sẽ thêm `requireRole` ở đúng hook này." },
  { title: "handler", description: "Route handler chạy: đọc/ghi vào `Map` in-memory, trả về object hoặc gọi `reply.code(...).send(...)`." },
  { title: "onSend", description: "Payload đã serialize xong, trước khi gửi qua network. Hook logging của lab này đo `duration` và log status code tại đây (hoặc `onResponse`, chạy ngay sau khi response rời đi)." },
];

export function FastifyRequestLifecycleDiagram() {
  return (
    <StepDiagram title="Request lifecycle của Fastify — 5 hook chính" viewBox="0 0 720 240" steps={steps}>
      {(step) => (
        <>
          {phases.map((phase, index) => {
            const x = 20 + index * 140;
            const state = index === step ? "active" : index < step ? "normal" : "dimmed";
            return (
              <g key={phase.key}>
                <DiagramNode x={x} y={70} width={120} height={80} label={phase.label} sublabel={phase.sublabel} emoji={phase.emoji} tone={index === step ? "blue" : "slate"} state={state} />
                {index < phases.length - 1 && (
                  <DiagramArrow from={[x + 120, 110]} to={[x + 140, 110]} tone="blue" animated={index === step} dimmed={index !== step} />
                )}
              </g>
            );
          })}
          <DiagramLabel x={360} y={30} text="Request →" tone="violet" bold size={13} />
          <DiagramLabel x={360} y={200} text="Bên ngoài phạm vi hôm nay: preParsing (trước preValidation) và preSerialization / onResponse (sau onSend)." size={11} />
        </>
      )}
    </StepDiagram>
  );
}
