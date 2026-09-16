"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "1. waiting",
    description:
      "`notificationsQueue.add(\"task-status-changed\", data)` đẩy job vào Redis. Job nằm trong danh sách `waiting` — chưa có worker nào cầm nó.",
  },
  {
    title: "2. active",
    description:
      "Một `Worker` rảnh rỗi lấy job ra khỏi hàng đợi và bắt đầu chạy hàm xử lý (`processor`). Job chuyển sang trạng thái `active` — đúng lúc này mới thật sự ghi `activity_logs`/`notifications`.",
  },
  {
    title: "3a. completed",
    description: "Processor chạy xong không lỗi → job chuyển `completed`. Mặc định BullMQ tự dọn job đã hoàn tất sau một thời gian (`removeOnComplete`).",
  },
  {
    title: "3b. failed (lần 1)",
    description: "Processor `throw` lỗi (ví dụ mất kết nối DB tạm thời) → job chuyển `failed`. BullMQ kiểm tra còn lượt `attempts` không.",
  },
  {
    title: "4. retry sau backoff",
    description:
      "Còn lượt thử → job quay lại hàng đợi nhưng phải đợi đúng khoảng `backoff` (ví dụ exponential: 1s, 2s, 4s...) trước khi được một worker lấy lại — không retry ngay lập tức.",
  },
  {
    title: "5. failed lần cuối → dead-letter",
    description:
      "Hết số `attempts` cho phép (ví dụ đã thử 3 lần) mà vẫn lỗi → job dừng hẳn ở `failed`, và code lắng nghe sự kiện `failed` ghi nó vào nơi lưu dead-letter (ví dụ một dòng `activity_logs` với action riêng) để con người xem lại thủ công.",
  },
];

export function JobLifecycleStateDiagram() {
  return (
    <StepDiagram title="Vòng đời một job trong BullMQ" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={16} y={30} width={140} height={60} label="waiting" sublabel="Redis list" emoji="🕒" tone="slate" state={step === 0 ? "active" : "dimmed"} />
          <DiagramNode x={220} y={30} width={140} height={60} label="active" sublabel="worker đang xử lý" emoji="⚙️" tone="blue" state={step === 1 ? "active" : "dimmed"} />
          <DiagramNode x={424} y={0} width={150} height={60} label="completed" sublabel="xong, không lỗi" emoji="✅" tone="green" state={step === 2 ? "active" : "dimmed"} />
          <DiagramNode x={424} y={80} width={150} height={60} label="failed" sublabel="processor throw" emoji="❌" tone="rose" state={step === 3 || step === 5 ? "active" : "dimmed"} />
          <DiagramNode x={220} y={180} width={200} height={60} label="đợi backoff rồi retry" sublabel="1s → 2s → 4s (exponential)" emoji="⏳" tone="amber" state={step === 4 ? "active" : "dimmed"} />
          <DiagramNode x={480} y={200} width={200} height={70} label="💀 dead-letter" sublabel="hết attempts — cần người xem" emoji="🪦" tone="rose" state={step === 5 ? "active" : "dimmed"} dashed />

          <DiagramArrow from={[156, 60]} to={[218, 60]} tone={step === 0 ? "slate" : "slate"} animated={step === 0} label="worker rảnh" />
          <DiagramArrow from={[360, 45]} to={[422, 30]} tone="green" animated={step === 2} dimmed={step !== 2} label="OK" />
          <DiagramArrow from={[360, 75]} to={[422, 100]} tone="rose" animated={step === 3} dimmed={step !== 3} label="throw" />
          <DiagramArrow from={[424, 120]} to={[320, 180]} curve={-20} tone="amber" animated={step === 4} dimmed={step !== 4} label="còn lượt attempts" />
          <DiagramArrow from={[320, 180]} to={[240, 90]} curve={20} tone="amber" animated={step === 4} dimmed={step !== 4} label="quay lại active" />
          <DiagramArrow from={[499, 140]} to={[560, 198]} tone="rose" animated={step === 5} dimmed={step !== 5} label="hết attempts" />
        </>
      )}
    </StepDiagram>
  );
}
