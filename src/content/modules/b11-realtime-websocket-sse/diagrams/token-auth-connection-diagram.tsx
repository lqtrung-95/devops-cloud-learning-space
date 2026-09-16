"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "1. Mở kết nối kèm token",
    description:
      "Browser không thể tự thêm header `Authorization` vào request của `EventSource` — API của nó chỉ nhận một URL. Client phải nhét access token (từ B05) vào query string: `new EventSource(\"/api/v1/notifications/stream?token=eyJhbGci...\")`.",
  },
  {
    title: "2. Route nhận request",
    description: "Request tới `GET /api/v1/notifications/stream` như một request HTTP bình thường — Fastify chưa biết đây sẽ là một kết nối giữ mở lâu dài.",
  },
  {
    title: "3. Verify token thủ công",
    description:
      "Không dùng được `request.jwtVerify()` mặc định (nó chỉ đọc header) — handler tự lấy `token` từ `request.query`, gọi `app.jwt.verify(token)`. Sai chữ ký hoặc hết hạn → `reply.code(401)` và dừng ngay, chưa mở stream.",
  },
  {
    title: "4. Nâng cấp thành stream",
    description:
      "Token hợp lệ → `reply.hijack()` báo cho Fastify biết \"tôi tự quản response từ đây\", rồi `reply.raw.writeHead(200, { \"Content-Type\": \"text/event-stream\" })` và giữ kết nối mở.",
  },
  {
    title: "5. Mất mạng giữa chừng",
    description: "Wifi chập chờn, TCP connection rớt. Không ai gọi `reply.raw.end()` một cách chủ động — kết nối chỉ đơn giản biến mất.",
  },
  {
    title: "6. Auto-reconnect (điểm mạnh của SSE)",
    description:
      "`EventSource` tự phát hiện mất kết nối và tự mở lại request y hệt URL cũ (cùng `?token=...`) sau khoảng `retry` (mặc định vài giây, server có thể gợi ý bằng dòng `retry: 3000\\n\\n`) — không cần một dòng code reconnect nào ở client.",
  },
];

export function TokenAuthConnectionDiagram() {
  return (
    <StepDiagram title="Xác thực kết nối SSE bằng token + hành vi reconnect" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={20} y={40} width={150} height={64} label="Browser" sublabel="EventSource" emoji="🖥️" tone="blue" state={[0, 5].includes(step) ? "active" : step <= 4 ? "normal" : "dimmed"} />
          <DiagramNode x={230} y={40} width={160} height={64} label="Route handler" sublabel="/notifications/stream" emoji="🚪" tone="violet" state={[1, 2].includes(step) ? "active" : "normal"} />
          <DiagramNode x={460} y={0} width={160} height={56} label="app.jwt.verify()" sublabel="dùng chung hạ tầng JWT từ B05" emoji="🔑" tone="amber" state={step === 2 ? "active" : "dimmed"} />
          <DiagramNode x={460} y={90} width={220} height={64} label="text/event-stream" sublabel="reply.hijack() + reply.raw" emoji="📡" tone="green" state={step === 3 ? "active" : step > 3 ? "normal" : "dimmed"} />
          <DiagramNode x={230} y={190} width={160} height={64} label="Mất kết nối" sublabel="TCP drop" emoji="🔌" tone="rose" state={step === 4 ? "active" : "dimmed"} />
          <DiagramNode x={20} y={190} width={150} height={64} label="Tự reconnect" sublabel="cùng URL, cùng token" emoji="🔁" tone="cyan" state={step === 5 ? "active" : "dimmed"} />

          <DiagramArrow from={[170, 65]} to={[228, 65]} tone="slate" animated={step === 0} dimmed={step > 2} label={step <= 1 ? "GET ?token=..." : undefined} />
          <DiagramArrow from={[390, 55]} to={[458, 30]} tone="amber" animated={step === 2} dimmed={step !== 2} />
          <DiagramArrow from={[390, 75]} to={[458, 110]} tone="green" animated={step === 3} dimmed={step !== 3} />
          <DiagramArrow from={[570, 154]} to={[300, 190]} tone="rose" animated={step === 4} dimmed={step !== 4} />
          <DiagramArrow from={[228, 220]} to={[172, 220]} tone="cyan" animated={step === 5} dimmed={step !== 5} label="retry sau ~3s" />
        </>
      )}
    </StepDiagram>
  );
}
