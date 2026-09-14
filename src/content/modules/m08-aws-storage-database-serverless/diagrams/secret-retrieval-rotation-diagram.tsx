"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "App khởi động",
    description: "Container không chứa mật khẩu: không có trong image, không có trong `.env` commit lên Git. Nó chỉ có IAM role (ECS task role / EC2 instance profile) với credentials tạm thời.",
  },
  {
    title: "Gọi GetSecretValue",
    description: "SDK gọi `secretsmanager:GetSecretValue` cho secret `prod/shop/db`, request được ký bằng credentials tạm của role.",
  },
  {
    title: "IAM kiểm tra quyền",
    description: "Policy của role phải cho phép `secretsmanager:GetSecretValue` trên đúng ARN secret đó (và `kms:Decrypt` nếu secret mã hoá bằng customer managed key). Thiếu quyền → `AccessDeniedException`.",
  },
  {
    title: "KMS giải mã",
    description: "Secret được lưu mã hoá bằng KMS. Secrets Manager giải mã rồi trả về JSON `username`/`password`/`host` qua TLS.",
  },
  {
    title: "Kết nối RDS",
    description: "App dùng mật khẩu để kết nối Postgres và cache secret trong bộ nhớ một lúc — đỡ gọi API liên tục (mỗi lần gọi đều tính phí và có quota).",
  },
  {
    title: "Rotation 🔄",
    description: "Theo lịch, rotation (Lambda hoặc managed rotation) đổi mật khẩu trên RDS và cập nhật secret: bản mới thành `AWSCURRENT`. App gặp lỗi xác thực → xoá cache, lấy lại secret. Không ai phải sửa file cấu hình.",
  },
];

export function SecretRetrievalRotationDiagram() {
  return (
    <StepDiagram title="App lấy DB password từ Secrets Manager" viewBox="0 0 720 300" steps={steps}>
      {(step) => (
        <>
          <DiagramNode x={20} y={105} width={170} height={90} label="App (ECS task)" sublabel="task role · không có .env" emoji="📦" tone="violet" state={[0, 4].includes(step) ? "active" : "normal"} />
          <DiagramNode x={285} y={12} width={160} height={62} label="IAM" sublabel="policy của role" emoji="🛂" tone="amber" state={step === 2 ? "active" : "dimmed"} />
          <DiagramNode
            x={275}
            y={115}
            width={180}
            height={80}
            label="Secrets Manager"
            sublabel={step === 5 ? "AWSCURRENT = v2" : "prod/shop/db"}
            emoji="🔐"
            tone="green"
            state={[1, 3, 5].includes(step) ? "active" : "normal"}
          />
          <DiagramNode x={545} y={12} width={155} height={62} label="KMS" sublabel="khoá mã hoá" emoji="🗝️" tone="cyan" state={step === 3 ? "active" : "dimmed"} />
          <DiagramNode x={545} y={125} width={155} height={70} label="RDS Postgres" sublabel={step === 5 ? "mật khẩu mới" : "private subnet"} emoji="🐘" tone="blue" state={[4, 5].includes(step) ? "active" : "normal"} />
          <DiagramNode x={275} y={228} width={180} height={58} label="Rotation" sublabel="Lambda / managed" emoji="🔄" tone="rose" state={step === 5 ? "active" : "dimmed"} />

          {step === 1 && <DiagramArrow from={[194, 150]} to={[271, 150]} tone="violet" animated label="GetSecretValue" />}
          {step === 2 && <DiagramArrow from={[365, 111]} to={[365, 78]} tone="amber" animated label="allow?" />}
          {step === 3 && (
            <>
              <DiagramArrow from={[459, 130]} to={[560, 78]} tone="cyan" animated label="Decrypt" />
              <DiagramArrow from={[271, 170]} to={[194, 170]} tone="green" animated label="JSON secret" />
            </>
          )}
          {step === 4 && <DiagramArrow from={[194, 125]} to={[541, 150]} curve={-60} tone="blue" animated label="connect :5432" />}
          {step === 5 && (
            <>
              <DiagramArrow from={[365, 224]} to={[365, 199]} tone="rose" animated label="put v2" />
              <DiagramArrow from={[459, 257]} to={[600, 199]} tone="rose" animated label="ALTER USER" />
            </>
          )}
        </>
      )}
    </StepDiagram>
  );
}
