"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Mode = "pod-identity" | "irsa";

const stepsByMode: Record<Mode, DiagramStep[]> = {
  "pod-identity": [
    { title: "Association", description: "Admin tạo `EKS Pod Identity Association`: ServiceAccount `report-reader` trong namespace `shop` ↔ IAM role `s3-read-role`. Giống đăng ký trước ở quầy bảo vệ: 'nhân viên đeo thẻ X được vào phòng Y'." },
    { title: "Pod khởi động", description: "Pod dùng ServiceAccount `report-reader`. Agent `eks-pod-identity-agent` (chạy trên mỗi node dưới dạng DaemonSet) tự tiêm một token ngắn hạn vào pod — không cần bạn cấu hình gì trong Deployment ngoài `serviceAccountName`." },
    { title: "Đổi thẻ", description: "AWS SDK trong container gọi Agent (qua địa chỉ nội bộ trên node), Agent gọi EKS Auth API để đổi token đó lấy **AWS credentials tạm thời** (access key, secret key, session token) đúng theo `s3-read-role`." },
    { title: "Gọi S3", description: "SDK dùng credentials tạm thời gọi `s3:GetObject`. IAM đánh giá policy của role — chỉ cho phép đúng bucket đã khai. Credentials tự hết hạn và được Agent tự làm mới, không ai phải xoay tay." },
  ],
  irsa: [
    { title: "OIDC provider", description: "Cluster có một **OIDC identity provider** đăng ký sẵn trong IAM (một lần khi tạo cluster). Đây là 'cơ quan cấp giấy tờ' mà AWS tin tưởng." },
    { title: "ServiceAccount có annotation", description: "ServiceAccount `report-reader` được gắn annotation `eks.amazonaws.com/role-arn: arn:aws:iam::...:role/s3-read-role`. Webhook admission tiêm biến môi trường `AWS_ROLE_ARN` và mount một **token JWT** (`AWS_WEB_IDENTITY_TOKEN_FILE`) vào pod." },
    { title: "AssumeRoleWithWebIdentity", description: "AWS SDK trong container tự gọi STS `AssumeRoleWithWebIdentity`, gửi kèm token JWT. STS kiểm tra chữ ký token với OIDC provider, và kiểm tra trust policy của role có điều kiện khớp `sub: system:serviceaccount:shop:report-reader`." },
    { title: "Gọi S3", description: "STS trả về credentials tạm thời, SDK dùng để gọi `s3:GetObject`. Cơ chế cũ hơn Pod Identity, cần đúng OIDC provider + trust policy chính xác." },
  ],
};

export function PodIdentityCredentialExchangeDiagram() {
  const [mode, setMode] = useState<Mode>("pod-identity");
  const steps = stepsByMode[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["pod-identity", "irsa"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "pod-identity" ? "EKS Pod Identity (khuyến nghị)" : "IRSA (cơ chế cũ hơn)"}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title="Pod đổi thẻ lấy quyền AWS — không có access key nào nằm trong cluster" viewBox="0 0 720 300" steps={steps}>
        {(step) => (
          <>
            <DiagramGroupBox x={16} y={16} width={300} height={260} label="EKS cluster" tone="blue" />
            <DiagramNode x={36} y={40} width={260} height={54} label="ServiceAccount report-reader" sublabel="namespace: shop" tone="blue" state={step === 0 || step === 1 ? "active" : "normal"} />
            <DiagramNode x={36} y={110} width={260} height={64} label="Pod (aws-cli / api)" sublabel={mode === "pod-identity" ? "Agent tiêm token" : "JWT mount vào pod"} tone="violet" state={step === 1 ? "active" : "normal"} />
            <DiagramNode x={36} y={196} width={260} height={56} label={mode === "pod-identity" ? "eks-pod-identity-agent" : "OIDC provider (IAM)"} sublabel={mode === "pod-identity" ? "DaemonSet trên node" : "đăng ký khi tạo cluster"} tone="cyan" state={step === 0 || step === 2 ? "active" : "normal"} />

            <DiagramArrow from={[300, 90]} to={[420, 90]} tone="violet" animated={step === 2} dimmed={step !== 2} label="đổi token" />
            <DiagramNode x={430} y={60} width={260} height={64} label={mode === "pod-identity" ? "EKS Auth API" : "AWS STS"} sublabel={mode === "pod-identity" ? "kiểm tra association" : "AssumeRoleWithWebIdentity"} tone="amber" state={step === 2 ? "active" : "normal"} />

            <DiagramArrow from={[560, 124]} to={[560, 166]} tone="amber" animated={step === 2} dimmed={step !== 2} label="credentials tạm" />
            <DiagramNode x={430} y={170} width={260} height={54} label="IAM role s3-read-role" sublabel="policy: s3:GetObject trên 1 bucket" tone="green" state={step === 2 || step === 3 ? "active" : "normal"} />

            <DiagramArrow from={[560, 224]} to={[560, 250]} tone="green" animated={step === 3} dimmed={step !== 3} />
            <DiagramNode x={430} y={252} width={260} height={40} label="Amazon S3" sublabel="chỉ bucket được phép" tone="green" state={step === 3 ? "active" : "normal"} />
          </>
        )}
      </StepDiagram>
    </div>
  );
}
