"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "1. File đã nằm trong MinIO", description: "Client PUT xong, gọi `POST /confirm`. Tại thời điểm này, server mới chỉ biết `key` — chưa biết file thật sự là gì." },
  { title: "2. HEAD check ngay lập tức (đồng bộ)", description: "Server gọi `HeadObjectCommand` — biết được `ContentLength` và `ContentType` THẬT mà MinIO ghi nhận lúc PUT. Đây là sự thật về kích thước, nhưng `ContentType` vẫn là header client tự gửi lúc PUT, không phải nội dung thật." },
  { title: "3. Ghi attachments với dữ liệu đã xác thực", description: "Insert row `attachments` dùng `size_bytes` từ HEAD check (không phải từ lời khai lúc presign). Learner tới đây coi như 'an toàn đủ dùng' cho B08 — nhưng còn một lỗ hổng." },
  { title: "4. Điều HEAD check KHÔNG chứng minh được", description: "`ContentType: image/png` chỉ là header, không phải bằng chứng nội dung file thật là ảnh PNG hợp lệ. Một file `.exe` đổi tên + khai `Content-Type: image/png` vẫn qua được bước này y hệt." },
  { title: "5. Bước thật sự đóng vai trò lưới an toàn (B09)", description: "Job bất đồng bộ đọc byte đầu file (magic bytes) hoặc chạy virus scanner, cập nhật trạng thái `attachments` (`pending` → `clean`/`quarantined`) sau khi xử lý xong — không chặn response của client lúc confirm." },
];

export function PostUploadVerificationSafetyNetDiagram() {
  return (
    <StepDiagram title="Sau upload: HEAD check ngay, quét nội dung thật thì để sau (B09)" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={16} y={30} width={150} height={64} label="MinIO" sublabel="object đã lưu" emoji="🗄️" tone="green" />
          <DiagramNode x={286} y={30} width={150} height={64} label="taskflow-api" sublabel="/confirm" emoji="🛡️" tone="blue" />
          <DiagramNode x={556} y={30} width={148} height={64} label="attachments" sublabel="Postgres" emoji="🗒️" tone="slate" state={step >= 2 ? "active" : "dimmed"} />
          <DiagramNode x={556} y={210} width={148} height={64} label="scan queue (B09)" sublabel="chưa build ở B08" tone="amber" state={step === 4 ? "active" : "dimmed"} dashed={step !== 4} />

          {step === 0 && <DiagramArrow from={[96, 94]} to={[360, 94]} tone="blue" animated label="POST /confirm { key }" />}

          {step === 1 && (
            <>
              <DiagramArrow from={[360, 70]} to={[96, 70]} tone="amber" animated label="HeadObjectCommand({ key })" />
              <DiagramNode x={230} y={140} width={260} height={54} label="ContentLength thật ✓ · ContentType = header client gửi" tone="amber" state="active" />
            </>
          )}

          {step === 2 && (
            <>
              <DiagramArrow from={[360, 94]} to={[556, 94]} tone="green" label="insert size_bytes = ContentLength thật" />
              <DiagramNode x={230} y={140} width={260} height={40} label="✅ Đủ cho tiêu chí đạt của B08" tone="green" state="active" />
            </>
          )}

          {step === 3 && (
            <DiagramNode
              x={180}
              y={110}
              width={380}
              height={70}
              label="ContentType chỉ là lời khai lúc PUT, không phải nội dung thật"
              sublabel="file .exe đổi tên + khai image/png vẫn qua HEAD check"
              tone="rose"
              state="active"
            />
          )}

          {step === 4 && (
            <>
              <DiagramArrow from={[360, 110]} to={[556, 220]} tone="amber" animated label="enqueue job quét nội dung (async)" />
              <DiagramNode x={180} y={140} width={340} height={40} label="Không chặn response /confirm — job chạy nền" tone="slate" state="active" />
            </>
          )}
        </>
      )}
    </StepDiagram>
  );
}
