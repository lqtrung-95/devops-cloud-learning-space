"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const REQUEST_ID = "a1b2c3d4";

const steps: DiagramStep[] = [
  { title: "Request tới", description: "Client gọi `GET /api/v1/projects`. Request chưa có `requestId` nào — Fastify mới nhận, chưa chạy hook nào cả." },
  { title: "onRequest sinh requestId", description: "Hook `onRequest` chạy đầu tiên: `request.requestId = randomUUID()`. Từ đây request có một mã riêng, ví dụ `a1b2c3d4`." },
  { title: "Tạo child logger", description: "`request.log = request.log.child({ requestId })` — logger CON này tự động gộp `requestId` vào mọi dòng log gọi qua nó, không cần truyền tay." },
  { title: "Handler log (tự động có requestId)", description: "Route handler gọi `request.log.info({ count }, \"...\")` như bình thường — `requestId` xuất hiện trong dòng log dù không ai nhắc tới nó ở đây." },
  { title: "onResponse ghi log hoàn tất", description: "Hook `onResponse` log `\"request completed\"` — vẫn cùng `requestId`, vì vẫn dùng đúng logger con đã tạo ở bước trước." },
  { title: "Trả header x-request-id", description: "Response về tới client kèm header `x-request-id: a1b2c3d4` — ai cầm response cũng tự tra được log tương ứng." },
];

/** Step-through: một requestId được sinh ở onRequest và bám theo mọi dòng log của đúng request đó. */
export function RequestIdOnRequestChildLoggerDiagram() {
  return (
    <StepDiagram title="requestId sinh ở onRequest, bám theo mọi dòng log của 1 request" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const hasId = step >= 1;
        const hasChildLogger = step >= 2;
        const logLines = [
          { visible: step >= 3, text: `{"requestId":"${REQUEST_ID}","msg":"fetching projects"}` },
          { visible: step >= 3, text: `{"requestId":"${REQUEST_ID}","count":4,"msg":"projects loaded"}` },
          { visible: step >= 4, text: `{"requestId":"${REQUEST_ID}","statusCode":200,"msg":"request completed"}` },
        ];

        return (
          <>
            {/* Pipeline: Client -> onRequest -> Handler -> onResponse */}
            <DiagramNode x={10} y={20} width={110} height={64} label="Client" emoji="🧑‍💻" tone="violet" state={step === 0 || step === 5 ? "active" : "normal"} />
            <DiagramNode x={170} y={20} width={140} height={64} label="onRequest" sublabel={hasId ? `requestId: ${REQUEST_ID}` : "chưa có id"} tone={hasId ? "blue" : "slate"} state={step === 1 || step === 2 ? "active" : "normal"} />
            <DiagramNode x={360} y={20} width={140} height={64} label="Handler" sublabel="request.log.info(...)" tone={hasChildLogger ? "green" : "slate"} state={step === 3 ? "active" : "normal"} />
            <DiagramNode x={550} y={20} width={150} height={64} label="onResponse" sublabel="log completed" tone={hasChildLogger ? "green" : "slate"} state={step === 4 ? "active" : "normal"} />

            <DiagramArrow from={[120, 52]} to={[166, 52]} tone="violet" animated={step === 0} dimmed={step !== 0} />
            <DiagramArrow from={[310, 52]} to={[356, 52]} tone="blue" animated={step === 2} dimmed={step < 2} />
            <DiagramArrow from={[500, 52]} to={[546, 52]} tone="green" animated={step === 3} dimmed={step < 3} />
            {step === 5 && <DiagramArrow from={[625, 84]} to={[65, 84]} tone="violet" curve={40} animated label="x-request-id" />}

            {/* Log panel */}
            <DiagramLabel x={16} y={132} text="📜 Log output (JSON)" anchor="start" size={12.5} bold tone="slate" />
            <rect x={12} y={142} width={696} height={120} rx={10} className="fill-stone-50 stroke-stone-300 dark:fill-stone-900 dark:stroke-stone-700" strokeWidth={1} />
            {logLines.map((line, index) => (
              <text
                key={line.text}
                x={26}
                y={168 + index * 28}
                fontSize={12}
                fontFamily="ui-monospace, monospace"
                className={line.visible ? "fill-emerald-700 dark:fill-emerald-300 transition-opacity duration-500" : "fill-stone-300 dark:fill-stone-700 opacity-0"}
              >
                {line.text}
              </text>
            ))}
            {!logLines.some((l) => l.visible) && (
              <text x={26} y={168} fontSize={12} fontFamily="ui-monospace, monospace" className="fill-stone-400 dark:fill-stone-600">
                (chưa có dòng log nào)
              </text>
            )}

            <DiagramLabel x={360} y={300} text={hasId ? `Mọi dòng log phía trên đều mang cùng requestId: ${REQUEST_ID}` : "onRequest chưa chạy — request chưa có requestId"} size={12} bold tone={hasId ? "green" : "slate"} />
          </>
        );
      }}
    </StepDiagram>
  );
}
