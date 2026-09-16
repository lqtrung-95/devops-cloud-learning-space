"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "1. Client mở SSE, api ghi nhận",
    description:
      "Client mở `GET /notifications/stream` (đã xác thực ở bài trước). `api` lưu kết nối này vào một registry trong bộ nhớ, khoá theo `userId` — process `worker` hoàn toàn không biết registry này tồn tại.",
  },
  {
    title: "2. Việc khác xảy ra: đổi trạng thái task",
    description: "Ai đó gọi `PATCH /api/v1/tasks/:id` (không liên quan trực tiếp tới connection ở bước 1). Route handler enqueue job vào BullMQ như đã học ở B09 rồi trả response ngay.",
  },
  {
    title: "3. worker xử lý job, ghi notification",
    description: "Process `worker` (image khác, container khác — nhưng cùng codebase) lấy job, insert một dòng `notifications` cho đúng `userId` liên quan tới task đó.",
  },
  {
    title: "4. worker publish lên Redis",
    description: "Ngay sau khi insert xong, `worker` gọi `redis.publish(\"notifications:<userId>\", payload)`. `worker` không biết — và không cần biết — có ai đang lắng nghe kênh này hay không.",
  },
  {
    title: "5. Subscriber của api nhận message",
    description: "`api` đã `psubscribe(\"notifications:*\")` từ lúc khởi động bằng một connection Redis riêng (`redis.duplicate()`). Sự kiện `pmessage` bắn ra với đúng `channel` và `message`.",
  },
  {
    title: "6. api tra registry, đẩy xuống đúng client",
    description:
      "`api` tách `userId` ra khỏi tên channel, tra registry ở bước 1 — nếu có kết nối đang mở cho đúng `userId` đó trên chính instance này, ghi thẳng `data: ...\\n\\n` vào response stream. Client nhận event `message` ngay lập tức.",
  },
];

export function WorkerRedisPubsubApiSequenceDiagram() {
  return (
    <StepDiagram title="Chuỗi sự kiện worker → Redis pub/sub → api → client" viewBox="0 0 720 340" steps={steps}>
      {(step) => (
        <>
          <DiagramGroupBox x={10} y={10} width={210} height={320} label="Process: worker" tone="amber" />
          <DiagramGroupBox x={250} y={10} width={220} height={320} label="Process: api" tone="violet" />
          <DiagramGroupBox x={510} y={10} width={200} height={320} label="Browser" tone="blue" />

          <DiagramNode x={280} y={40} width={160} height={56} label="Connection registry" sublabel="Map<userId, res>" emoji="🗂️" tone="violet" state={step === 0 || step === 5 ? "active" : "normal"} />
          <DiagramNode x={540} y={40} width={140} height={56} label="EventSource" sublabel="kết nối mở" emoji="🖥️" tone="blue" state={step === 0 || step === 5 ? "active" : "normal"} />

          <DiagramNode x={280} y={120} width={160} height={56} label="PATCH tasks/:id" sublabel="route handler" emoji="✏️" tone="cyan" state={step === 1 ? "active" : "dimmed"} />
          <DiagramNode x={30} y={120} width={170} height={56} label="BullMQ job" sublabel="queue notifications" emoji="📮" tone="slate" state={step === 1 || step === 2 ? "active" : "dimmed"} />
          <DiagramNode x={30} y={200} width={170} height={56} label="INSERT notifications" sublabel="Postgres" emoji="🗄️" tone="green" state={step === 2 ? "active" : "dimmed"} />
          <DiagramNode x={30} y={270} width={170} height={56} label="redis.publish()" sublabel="notifications:&lt;userId&gt;" emoji="📣" tone="rose" state={step === 3 ? "active" : "dimmed"} />
          <DiagramNode x={280} y={200} width={160} height={56} label="redis.psubscribe()" sublabel="connection riêng, duplicate()" emoji="👂" tone="rose" state={step === 4 ? "active" : "dimmed"} />

          <DiagramArrow from={[200, 148]} to={[278, 148]} tone="cyan" animated={step === 1} dimmed={step !== 1} label="enqueue" />
          <DiagramArrow from={[115, 176]} to={[115, 198]} tone="slate" animated={step === 2} dimmed={step !== 2} />
          <DiagramArrow from={[115, 256]} to={[115, 268]} tone="green" animated={step === 3} dimmed={step !== 3} />
          <DiagramArrow from={[200, 296]} to={[356, 254]} tone="rose" animated={step === 4} dimmed={step !== 4} label="channel message" curve={-30} />
          <DiagramArrow from={[356, 198]} to={[356, 98]} tone="violet" animated={step === 5} dimmed={step !== 5} label="tra registry" />
          <DiagramArrow from={[440, 68]} to={[538, 68]} tone="blue" animated={step === 5} dimmed={step !== 5} label="data: {...}" />
        </>
      )}
    </StepDiagram>
  );
}
