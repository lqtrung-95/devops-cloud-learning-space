"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "1. Request presign", description: "Client gửi `POST /api/v1/tasks/:id/attachments/presign` với metadata KHAI BÁO: `filename`, `mimeType`, `sizeBytes` — chưa gửi byte file nào." },
  { title: "2. Validate trước khi ký", description: "Server kiểm tra quyền (task thuộc tổ chức của user) và validate size/type bằng Zod. Sai → `400`, dừng ở đây, KHÔNG có URL nào được tạo." },
  { title: "3. Ký presigned URL", description: "Hợp lệ → server gọi `getSignedUrl(PutObjectCommand)` với endpoint public của MinIO — chữ ký chỉ có giá trị cho đúng `key` này, đúng method `PUT`, hết hạn sau 300 giây." },
  { title: "4. Trả URL về client", description: "Server trả `{ uploadUrl, key, expiresAt }`. Từ đây taskflow-api tạm 'quên' request này — không giữ kết nối, không chờ file." },
  { title: "5. Client PUT thẳng lên MinIO", description: "Client tự gửi `PUT uploadUrl` kèm đúng byte file và header `Content-Type` khớp lúc ký. Request này đi THẲNG tới MinIO, không qua taskflow-api." },
  { title: "6. Confirm & HEAD check", description: "Client gọi `POST /attachments/confirm` với `key`. Server gọi `HeadObjectCommand` lên MinIO lấy `ContentLength` THẬT, rồi mới insert row vào bảng `attachments`." },
];

export function PresignedUrlRequestSignConfirmDiagram() {
  return (
    <StepDiagram title="Presigned URL: request → sign → PUT → confirm" viewBox="0 0 720 320" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={16} y={30} width={150} height={68} label="Client" sublabel="script / browser" emoji="💻" tone="violet" />
          <DiagramNode x={286} y={30} width={150} height={68} label="taskflow-api" sublabel="Fastify" emoji="🛡️" tone="blue" state={step === 4 ? "dimmed" : "normal"} />
          <DiagramNode x={556} y={30} width={148} height={68} label="MinIO" sublabel="object storage" emoji="🗄️" tone="green" state={step === 1 ? "dimmed" : "normal"} />
          <DiagramNode x={286} y={230} width={150} height={64} label="attachments" sublabel="Postgres" emoji="🗒️" tone="slate" state={step === 5 ? "active" : "dimmed"} />

          {step === 0 && (
            <>
              <DiagramArrow from={[96, 100]} to={[360, 100]} tone="blue" animated label="POST /presign {filename, mimeType, sizeBytes}" />
            </>
          )}

          {step === 1 && (
            <>
              <DiagramNode x={230} y={130} width={260} height={56} label="size/type hợp lệ?" sublabel="Zod validate, chưa gọi S3" tone="amber" state="active" />
              <DiagramArrow from={[360, 190]} to={[96, 150]} tone="rose" label="400 VALIDATION_ERROR (nếu sai)" />
            </>
          )}

          {step === 2 && (
            <>
              <DiagramArrow from={[360, 90]} to={[556, 90]} tone="green" label="getSignedUrl(PutObjectCommand)" />
              <DiagramNode x={230} y={130} width={260} height={56} label="Ký chữ ký cho đúng key + PUT" sublabel="hết hạn sau 300s" tone="green" state="active" />
            </>
          )}

          {step === 3 && (
            <>
              <DiagramArrow from={[360, 100]} to={[96, 100]} tone="blue" animated label="{ uploadUrl, key, expiresAt }" />
            </>
          )}

          {step === 4 && (
            <>
              <DiagramArrow from={[96, 120]} to={[556, 90]} tone="green" curve={-30} animated label="PUT uploadUrl (byte file thật)" />
              <DiagramNode x={230} y={150} width={260} height={44} label="taskflow-api KHÔNG tham gia bước này" tone="slate" state="dimmed" />
            </>
          )}

          {step === 5 && (
            <>
              <DiagramArrow from={[96, 100]} to={[360, 100]} tone="amber" animated label="POST /confirm { key }" />
              <DiagramArrow from={[360, 90]} to={[556, 90]} tone="amber" animated label="HeadObjectCommand({ key })" />
              <DiagramArrow from={[556, 130]} to={[360, 130]} tone="green" label="ContentLength, ContentType thật" />
              <DiagramArrow from={[360, 240]} to={[286, 260]} tone="slate" label="insert attachments" />
            </>
          )}
        </>
      )}
    </StepDiagram>
  );
}
