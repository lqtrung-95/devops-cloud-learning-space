"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Backend = "aws" | "vault";

const backends: Record<Backend, { title: string; store: string; storeSub: string; auth: string; authSub: string; rotate: string }> = {
  aws: {
    title: "AWS Secrets Manager",
    store: "Secrets Manager",
    storeSub: "mật khẩu RDS mã hoá bằng KMS",
    auth: "IAM Role (Pod Identity)",
    authSub: "pod xin quyền qua IAM, không key tĩnh",
    rotate: "Lambda rotation có sẵn cho RDS: tạo mật khẩu mới, đổi trên RDS, cập nhật secret — không downtime nếu dùng đúng chiến lược 2 user luân phiên.",
  },
  vault: {
    title: "HashiCorp Vault",
    store: "Vault (Dynamic Secrets Engine)",
    storeSub: "sinh credential RDS mới cho MỖI request",
    auth: "Kubernetes Auth Method",
    authSub: "pod xác thực bằng ServiceAccount token",
    rotate: "Credential có TTL ngắn (vd 1 giờ), tự hết hạn — không cần 'rotation job' riêng vì mỗi lần cấp đã là credential mới.",
  },
};

export function SecretsManagerRotationDiagram() {
  const [backend, setBackend] = useState<Backend>("aws");
  const config = backends[backend];

  return (
    <DiagramFrame
      title="Secret đi từ đâu tới app — so sánh 2 mô hình"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(["aws", "vault"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setBackend(option)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  backend === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {backends[option].title}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">{config.rotate}</p>
        </div>
      }
      caption="Không có secret nào nằm trong Git, ConfigMap hay biến môi trường plain text — pod luôn XIN quyền, không bao giờ TỰ CHỨA sẵn credential dài hạn."
    >
      <DiagramGroupBox x={8} y={16} width={260} height={248} label="Kubernetes namespace: shop" tone="slate">
        <DiagramNode x={30} y={60} width={200} height={80} label="checkout pod" sublabel="không có secret trong image" emoji="🛒" tone="green" />
        <DiagramNode x={30} y={170} width={200} height={70} label={config.auth} sublabel={config.authSub} emoji="🪪" tone="blue" />
      </DiagramGroupBox>
      <DiagramNode x={310} y={90} width={190} height={100} label={config.store} sublabel={config.storeSub} emoji="🔐" tone="violet" state="active" />
      <DiagramNode x={550} y={40} width={150} height={80} label="RDS PostgreSQL" sublabel="mật khẩu được đổi định kỳ" emoji="🗄️" tone="cyan" />
      <DiagramNode x={550} y={180} width={150} height={80} label="AWS KMS" sublabel="mã hoá secret khi lưu" emoji="🔑" tone="amber" />

      <DiagramArrow from={[130, 140]} to={[130, 166]} tone="blue" />
      <DiagramArrow from={[230, 200]} to={[306, 150]} tone="blue" label="xin credential" animated />
      <DiagramArrow from={[500, 120]} to={[546, 80]} tone="violet" label="cấp/đổi mật khẩu" animated />
      <DiagramArrow from={[500, 150]} to={[546, 200]} tone="amber" label="mã hoá bằng" />
      <DiagramLabel x={370} y={230} text="Không secret nào nằm trong Git / ConfigMap" tone="rose" bold size={12} />
    </DiagramFrame>
  );
}
