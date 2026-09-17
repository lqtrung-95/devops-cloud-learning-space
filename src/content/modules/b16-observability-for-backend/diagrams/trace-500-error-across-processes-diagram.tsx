"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const REQUEST_ID = "e7f0219b";

const steps: DiagramStep[] = [
  { title: "Resend gây lỗi thật", description: "`curl -X POST /api/v1/notifications/:id/resend` cho một notification có `type: \"legacy_digest_summary\"` — giá trị `notification-service` chưa từng hỗ trợ." },
  { title: "api gọi gRPC như bình thường", description: "Route handler log `\"resending notification via gRPC\"` (có `requestId`), rồi gọi `sendNotification(...)` — chưa biết phía bên kia sẽ từ chối." },
  { title: "notification-service từ chối", description: "Handler kiểm tra `SUPPORTED_NOTIFICATION_TYPES`, không thấy `legacy_digest_summary` — log lỗi `\"unsupported notification type\"` (cùng `requestId` lấy từ metadata), trả `INVALID_ARGUMENT` qua `callback(...)`." },
  { title: "Lỗi dội ngược về api", description: "Promise của `sendNotification(...)` reject. Route handler không có `try/catch` riêng cho lỗi này — lỗi rơi thẳng vào `setErrorHandler` (đã có từ B03)." },
  { title: "setErrorHandler trả 500", description: "Lỗi không phải `AppError`/Zod nên rơi vào nhánh cuối: `request.log.error({ err }, \"Unhandled error\")` — vẫn dùng đúng child logger có `requestId` — rồi trả `500 INTERNAL_ERROR` chung chung cho client." },
  { title: "Dựng lại toàn bộ đường đi", description: "Chỉ với `requestId` từ header `x-request-id` của response 500, grep cả 2 container log — ghép đúng thứ tự thời gian, thấy rõ root cause nằm ở dữ liệu `type`, không phải ở gRPC hay logic `api`." },
];

/** Kịch bản: một lỗi 500 thật được dựng lại xuyên 2 process chỉ bằng đúng 1 requestId. */
export function Trace500ErrorAcrossProcessesDiagram() {
  return (
    <StepDiagram title="Lần dấu lỗi 500 xuyên 2 process bằng đúng 1 requestId" viewBox="0 0 720 360" steps={steps}>
      {(step) => {
        const timeline = [
          { at: 1, tone: "blue" as const, text: `api: "resending notification via gRPC"` },
          { at: 2, tone: "rose" as const, text: `notification-service: "unsupported notification type" (type=legacy_digest_summary)` },
          { at: 3, tone: "rose" as const, text: `api: "Unhandled error" → trả 500` },
        ];

        return (
          <>
            <DiagramNode x={10} y={20} width={120} height={60} label="Client" emoji="🧑‍💻" tone="violet" state={step === 0 || step === 5 ? "active" : "normal"} />
            <DiagramNode
              x={200}
              y={20}
              width={160}
              height={60}
              label="api"
              sublabel={step >= 4 ? "setErrorHandler → 500" : "route handler"}
              tone={step >= 4 ? "rose" : "blue"}
              state={step === 1 || step === 3 || step === 4 ? "active" : "normal"}
            />
            <DiagramNode
              x={430}
              y={20}
              width={200}
              height={60}
              label="notification-service"
              sublabel={step >= 2 ? "từ chối: type lạ" : "chờ request"}
              tone={step >= 2 ? "rose" : "green"}
              state={step === 2 ? "active" : "normal"}
            />

            <DiagramArrow from={[130, 50]} to={[196, 50]} tone="violet" animated={step === 0} dimmed={step !== 0} />
            <DiagramArrow from={[360, 50]} to={[426, 50]} tone="blue" animated={step === 1} dimmed={step !== 1} label="SendNotification" />
            <DiagramArrow from={[426, 66]} to={[360, 66]} tone="rose" animated={step === 3} dimmed={step !== 3} label="INVALID_ARGUMENT" />
            {step === 5 && <DiagramArrow from={[196, 40]} to={[130, 40]} tone="rose" curve={-24} animated label="500 + x-request-id" />}

            {/* Log dòng chảy theo requestId */}
            <DiagramLabel x={16} y={116} text={`📜 requestId = ${REQUEST_ID}`} anchor="start" size={12.5} bold tone="slate" />
            <rect x={12} y={124} width={696} height={110} rx={10} className="fill-stone-50 stroke-stone-300 dark:fill-stone-900 dark:stroke-stone-700" strokeWidth={1} />
            {timeline.map((entry, index) => {
              const visible = step >= entry.at;
              const colorClass =
                entry.tone === "rose"
                  ? "fill-rose-700 dark:fill-rose-300"
                  : "fill-blue-700 dark:fill-blue-300";
              return (
                <text
                  key={entry.text}
                  x={26}
                  y={150 + index * 26}
                  fontSize={11.5}
                  fontFamily="ui-monospace, monospace"
                  className={visible ? `${colorClass} transition-opacity duration-500` : "fill-stone-300 dark:fill-stone-700 opacity-0"}
                >
                  {`${index + 1}. ${entry.text}`}
                </text>
              );
            })}

            {step === 5 && (
              <DiagramLabel
                x={360}
                y={335}
                text="Root cause: dữ liệu type không hợp lệ — không phải lỗi gRPC hay bug ở api"
                bold
                tone="rose"
                size={13}
              />
            )}
          </>
        );
      }}
    </StepDiagram>
  );
}
