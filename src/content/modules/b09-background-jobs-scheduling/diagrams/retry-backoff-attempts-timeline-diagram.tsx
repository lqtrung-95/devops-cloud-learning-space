"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "Attempt 1 — t=0s",
    description: "Job chạy lần đầu ngay khi tới lượt. Processor `throw` (ví dụ DB tạm thời không kết nối được). `attemptsMade = 1`.",
  },
  {
    title: "Backoff 1s",
    description: "`backoff: { type: \"exponential\", delay: 1000 }` → lần retry đầu đợi `1000ms`. Job không bị mất — nó chờ trong Redis rồi mới quay lại `waiting`.",
  },
  {
    title: "Attempt 2 — t≈1s",
    description: "Retry lần 2, vẫn lỗi. `attemptsMade = 2`. Vẫn còn dưới `attempts: 3` đã cấu hình nên BullMQ tiếp tục lên lịch retry.",
  },
  {
    title: "Backoff 2s (nhân đôi)",
    description: "Exponential nghĩa là delay nhân đôi mỗi lần: `1000ms → 2000ms`. Nếu dùng backoff cố định (fixed) thì mỗi lần đều đợi đúng 1000ms — không tăng dần để giảm áp lực lên hệ thống đang gặp sự cố.",
  },
  {
    title: "Attempt 3 — t≈3s",
    description: "Lần thử cuối cùng cho phép (`attempts: 3`). Nếu vẫn lỗi, `attemptsMade` đã bằng `attempts` — không còn lượt retry nào nữa.",
  },
  {
    title: "Dead-letter",
    description: "Listener `worker.on(\"failed\", ...)` kiểm tra `job.attemptsMade >= (job.opts.attempts ?? 1)`, ghi lại job này vào nơi lưu dead-letter để người vận hành xem thủ công — BullMQ không tự retry thêm nữa.",
  },
];

export function RetryBackoffAttemptsTimelineDiagram() {
  return (
    <StepDiagram title="3 lần thử, backoff exponential có trần, rồi dead-letter" viewBox="0 0 720 260" steps={steps}>
      {(step) => (
        <>
          <DiagramLabel x={30} y={20} text="thời gian →" anchor="start" size={11} />
          <DiagramArrow from={[20, 30]} to={[700, 30]} tone="slate" dimmed />

          <DiagramNode x={16} y={60} width={130} height={60} label="Attempt 1" sublabel="t = 0s" emoji="1️⃣" tone={step >= 0 ? "rose" : "slate"} state={step === 0 ? "active" : step > 0 ? "normal" : "dimmed"} />
          <DiagramNode x={190} y={60} width={130} height={60} label="+1s backoff" sublabel="chờ, không mất job" emoji="⏳" tone="amber" state={step === 1 ? "active" : step > 1 ? "normal" : "dimmed"} />
          <DiagramNode x={364} y={60} width={130} height={60} label="Attempt 2" sublabel="t ≈ 1s" emoji="2️⃣" tone={step >= 2 ? "rose" : "slate"} state={step === 2 ? "active" : step > 2 ? "normal" : "dimmed"} />
          <DiagramNode x={16} y={150} width={130} height={60} label="+2s backoff" sublabel="delay × 2 (exponential)" emoji="⏳" tone="amber" state={step === 3 ? "active" : step > 3 ? "normal" : "dimmed"} />
          <DiagramNode x={190} y={150} width={130} height={60} label="Attempt 3" sublabel="t ≈ 3s (cuối cùng)" emoji="3️⃣" tone={step >= 4 ? "rose" : "slate"} state={step === 4 ? "active" : step > 4 ? "normal" : "dimmed"} />
          <DiagramNode x={364} y={150} width={200} height={70} label="💀 Dead-letter" sublabel="hết attempts, cần người xem" emoji="🪦" tone="rose" state={step === 5 ? "active" : "dimmed"} dashed />

          <DiagramArrow from={[146, 90]} to={[188, 90]} tone="amber" dimmed={step < 1} animated={step === 1} />
          <DiagramArrow from={[320, 90]} to={[362, 90]} tone="rose" dimmed={step < 2} animated={step === 2} />
          <DiagramArrow from={[364, 120]} to={[146, 148]} curve={0} tone="amber" dimmed={step < 3} animated={step === 3} />
          <DiagramArrow from={[146, 180]} to={[188, 180]} tone="rose" dimmed={step < 4} animated={step === 4} />
          <DiagramArrow from={[320, 180]} to={[362, 180]} tone="rose" dimmed={step < 5} animated={step === 5} label="hết attempts" />
        </>
      )}
    </StepDiagram>
  );
}
