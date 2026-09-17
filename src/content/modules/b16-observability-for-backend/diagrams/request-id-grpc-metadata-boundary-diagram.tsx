"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const REQUEST_ID = "a1b2c3d4";

const steps: DiagramStep[] = [
  { title: "Request có requestId", description: "`POST /api/v1/notifications/:id/resend` tới `api`. `onRequest` (bài trước) đã gắn `requestId: a1b2c3d4` vào `request.log`." },
  { title: "Gói vào gRPC metadata", description: "Route handler gọi `sendNotification(input, request.requestId)`. Trong `notification-client.ts`: `metadata.set(\"x-request-id\", requestId)` — giống hệt việc gắn một HTTP header trước khi gửi đi." },
  { title: "Cuộc gọi vượt ranh giới process", description: "`client.SendNotification(payload, metadata, ...)` rời `api`, đi qua mạng Docker nội bộ sang `notification-service` — payload nghiệp vụ và metadata `x-request-id` đi CÙNG một request, nhưng là 2 phần tách biệt." },
  { title: "notification-service đọc metadata", description: "`call.metadata.get(\"x-request-id\")` trả về mảng — lấy phần tử đầu tiên. `notification-service` giờ biết đúng `requestId` mà `api` đã dùng." },
  { title: "Log lại đúng giá trị", description: "`notification-service` tạo child logger riêng (`logger.child({ requestId })`) và log `\"delivering notification\"` — CÙNG `requestId` với log bên `api`, dù là 2 process, 2 pino instance hoàn toàn khác nhau." },
  { title: "So sánh 2 log song song", description: "Giờ có thể `grep a1b2c3d4` trên CẢ HAI container log — ghép lại thành một dòng thời gian duy nhất của đúng 1 request, xuyên qua ranh giới process." },
];

/** Step-through: requestId của api được gắn vào gRPC metadata và xuất hiện lại trong log của notification-service. */
export function RequestIdGrpcMetadataBoundaryDiagram() {
  return (
    <StepDiagram title="requestId vượt ranh giới process qua gRPC metadata" viewBox="0 0 720 340" steps={steps}>
      {(step) => {
        const inFlight = step === 2;
        const serverHasId = step >= 3;
        return (
          <>
            <DiagramGroupBox x={10} y={10} width={310} height={150} label="Process: api" tone="blue">
              <DiagramNode x={30} y={44} width={120} height={56} label="route handler" sublabel={`requestId: ${REQUEST_ID}`} tone="blue" state={step === 0 || step === 1 ? "active" : "normal"} />
              <DiagramNode x={180} y={44} width={120} height={56} label="notification-client" sublabel={step >= 1 ? "metadata: x-request-id" : "chưa gắn metadata"} tone={step >= 1 ? "violet" : "slate"} state={step === 1 ? "active" : "normal"} />
            </DiagramGroupBox>

            <DiagramGroupBox x={400} y={10} width={310} height={150} label="Process: notification-service" tone="green">
              <DiagramNode
                x={420}
                y={44}
                width={270}
                height={56}
                label="SendNotification handler"
                sublabel={serverHasId ? `call.metadata → requestId: ${REQUEST_ID}` : "chưa nhận metadata"}
                tone={serverHasId ? "green" : "slate"}
                state={step === 3 || step === 4 ? "active" : "normal"}
              />
            </DiagramGroupBox>

            {inFlight && <MovingPacket key={step} path="M 300 72 L 420 72" tone="violet" label="x-request-id" durationSeconds={1.2} repeat={false} />}
            {!inFlight && <DiagramArrow from={[300, 72]} to={[420, 72]} tone={step >= 3 ? "green" : "slate"} dimmed={step < 3} />}

            {/* Log panel: 2 cột song song, api bên trái / notification-service bên phải */}
            <DiagramLabel x={16} y={188} text="📜 log api" anchor="start" size={12} bold tone="blue" />
            <rect x={12} y={196} width={310} height={70} rx={10} className="fill-blue-50 stroke-blue-200 dark:fill-blue-950/40 dark:stroke-blue-800" strokeWidth={1} />
            <text x={22} y={222} fontSize={11} fontFamily="ui-monospace, monospace" className={step >= 1 ? "fill-blue-800 dark:fill-blue-200" : "fill-stone-300 dark:fill-stone-700"}>
              {`{"requestId":"${REQUEST_ID}","msg":"resending notification via gRPC"}`}
            </text>

            <DiagramLabel x={406} y={188} text="📜 log notification-service" anchor="start" size={12} bold tone="green" />
            <rect x={400} y={196} width={310} height={70} rx={10} className="fill-emerald-50 stroke-emerald-200 dark:fill-emerald-950/40 dark:stroke-emerald-800" strokeWidth={1} />
            <text x={410} y={222} fontSize={11} fontFamily="ui-monospace, monospace" className={serverHasId ? "fill-emerald-800 dark:fill-emerald-200" : "fill-stone-300 dark:fill-stone-700"}>
              {serverHasId ? `{"requestId":"${REQUEST_ID}","msg":"delivering notification"}` : "(chưa nhận được metadata)"}
            </text>

            {step === 5 && <DiagramLabel x={360} y={300} text={`grep "${REQUEST_ID}" ghép được cả 2 cột log ở trên thành 1 dòng thời gian`} bold tone="violet" size={13} />}
          </>
        );
      }}
    </StepDiagram>
  );
}
