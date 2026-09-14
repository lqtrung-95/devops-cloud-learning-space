"use client";

import { DiagramArrow, DiagramGroupBox, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "Xin phép upload",
    description: "Người dùng đã đăng nhập bấm 'Tải ảnh'. Trình duyệt gọi API của bạn: `POST /uploads` kèm tên file và content-type. Chưa có byte ảnh nào được gửi.",
  },
  {
    title: "API ký URL",
    description: "Backend kiểm tra user, tự đặt key `uploads/u-42/7f3c.jpg`, rồi dùng SDK ký một URL cho `PutObject`, hết hạn sau 5 phút. Việc ký là phép tính cục bộ bằng credentials của IAM role — không cần gọi S3.",
  },
  {
    title: "Trả URL cho trình duyệt",
    description: "API trả về URL chứa `X-Amz-Expires=300` và `X-Amz-Signature=…`. URL này giống 'phiếu gửi hàng có chữ ký' — chỉ đúng key đó, đúng thao tác đó, trong 5 phút.",
  },
  {
    title: "PUT thẳng lên S3",
    description: "Trình duyệt gửi file trực tiếp tới S3 bằng `PUT`. File 50 MB không đi qua server của bạn → server nhẹ, không tốn băng thông, không bị timeout.",
  },
  {
    title: "S3 kiểm tra chữ ký ✅",
    description: "S3 kiểm tra chữ ký, thời hạn và quyền `s3:PutObject` của role đã ký. Hợp lệ → `200 OK`. Bucket vẫn private, Block Public Access vẫn bật.",
  },
  {
    title: "Hết hạn ⛔",
    description: "Sau 5 phút, dùng lại URL → `403 AccessDenied` (Request has expired). Nếu role ký URL bị thu hồi quyền, URL cũng mất hiệu lực.",
  },
];

export function S3PresignedUrlUploadDiagram() {
  return (
    <StepDiagram title="Upload file bằng pre-signed URL" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode
            x={20}
            y={110}
            width={160}
            height={90}
            label="Trình duyệt"
            sublabel={step === 5 ? "403 hết hạn" : "user u-42"}
            emoji="🧑‍💻"
            tone={step === 5 ? "rose" : "violet"}
            state={[0, 3, 5].includes(step) ? "active" : "normal"}
          />
          <DiagramNode
            x={280}
            y={16}
            width={170}
            height={86}
            label="App API"
            sublabel="IAM role · SDK ký URL"
            emoji="⚙️"
            tone="blue"
            state={[1, 2].includes(step) ? "active" : step >= 3 ? "dimmed" : "normal"}
          />
          <DiagramGroupBox x={500} y={130} width={210} height={150} label="S3 (private bucket)" tone="green">
            <DiagramNode
              x={525}
              y={165}
              width={160}
              height={96}
              label="shop-uploads"
              sublabel={step >= 4 ? "uploads/u-42/7f3c.jpg" : "Block Public Access"}
              emoji="🪣"
              tone={step === 5 ? "rose" : "green"}
              state={[4, 5].includes(step) ? "active" : "normal"}
            />
          </DiagramGroupBox>

          {step === 0 && <DiagramArrow from={[150, 106]} to={[276, 62]} tone="violet" animated label="POST /uploads" />}
          {step === 1 && (
            <text x={365} y={124} textAnchor="middle" fontSize={12} className="fill-stone-700 dark:fill-stone-300">
              ✍️ ký PutObject · hết hạn 300s
            </text>
          )}
          {step === 2 && <DiagramArrow from={[276, 80]} to={[160, 118]} tone="blue" animated label="URL đã ký" />}
          {step === 3 && (
            <>
              <DiagramArrow from={[184, 170]} to={[520, 210]} tone="violet" animated label="PUT ảnh (bytes)" />
              <MovingPacket key="put" path="M 184 170 L 520 210" durationSeconds={1.6} tone="violet" label="📷" />
            </>
          )}
          {step === 4 && <DiagramArrow from={[520, 230]} to={[184, 186]} tone="green" label="200 OK" />}
          {step === 5 && <DiagramArrow from={[520, 230]} to={[184, 186]} tone="rose" label="403 AccessDenied" />}
          {step >= 3 && (
            <text x={365} y={124} textAnchor="middle" fontSize={11.5} className="fill-stone-500 dark:fill-stone-400">
              server không chạm vào file
            </text>
          )}
        </>
      )}
    </StepDiagram>
  );
}
