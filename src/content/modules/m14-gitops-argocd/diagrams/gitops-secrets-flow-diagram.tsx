"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Mode = "eso" | "sealed";

const stepsByMode: Record<Mode, DiagramStep[]> = {
  eso: [
    { title: "Secret nằm ngoài Git", description: "DB password thật chỉ tồn tại trong AWS Secrets Manager. Git chỉ commit một object `ExternalSecret` — nói 'lấy secret tên gì, để vào đâu', KHÔNG chứa giá trị thật." },
    { title: "Argo CD sync ExternalSecret", description: "Argo CD apply object `ExternalSecret` vào cluster như mọi resource khác — bản thân object này an toàn để commit vì không có giá trị nhạy cảm." },
    { title: "Operator gọi AWS", description: "External Secrets Operator (dùng Pod Identity, M13 — không có access key) gọi AWS Secrets Manager `GetSecretValue` theo đúng quyền least-privilege." },
    { title: "Secret Kubernetes được tạo", description: "Operator tạo/cập nhật Secret Kubernetes `postgres-auth` với giá trị thật. Pod đọc Secret này bình thường như mọi Secret khác." },
    { title: "Tự làm mới", description: "Đổi password trong AWS Secrets Manager → Operator tự đồng bộ lại theo `refreshInterval` (không cần commit gì vào Git)." },
  ],
  sealed: [
    { title: "Mã hoá trước khi commit", description: "Dev dùng CLI `kubeseal` + public key của cluster để mã hoá secret ngay trên máy mình. Kết quả là một `SealedSecret` — dữ liệu đã mã hoá, an toàn để commit thẳng vào Git." },
    { title: "Commit vào Git", description: "`SealedSecret` (đã mã hoá) được commit vào config repo. Ai đọc được Git cũng không giải mã được — chỉ private key trong cluster đích mới giải mã nổi." },
    { title: "Argo CD sync SealedSecret", description: "Argo CD apply object `SealedSecret` vào cluster như một resource bình thường." },
    { title: "Controller giải mã", description: "Sealed Secrets controller (giữ private key riêng của cluster đó) tự động giải mã và tạo ra Secret Kubernetes thật." },
    { title: "Đổi secret = mã hoá lại", description: "Muốn đổi giá trị: chạy lại `kubeseal` với giá trị mới, commit `SealedSecret` mới. Không có 'nguồn ngoài' để tự động lấy lại — mọi thay đổi đều qua Git." },
  ],
};

export function GitopsSecretsFlowDiagram() {
  const [mode, setMode] = useState<Mode>("eso");
  const steps = stepsByMode[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["eso", "sealed"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "eso" ? "External Secrets Operator" : "Sealed Secrets"}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title="Secret không bao giờ nằm plaintext trong Git" viewBox="0 0 720 300" steps={steps}>
        {(step) => (
          <>
            <DiagramGroupBox x={16} y={16} width={200} height={260} label="Git (config repo)" tone="violet">
              <DiagramNode
                x={32}
                y={110}
                width={168}
                height={70}
                label={mode === "eso" ? "ExternalSecret" : "SealedSecret"}
                sublabel={mode === "eso" ? "chỉ tham chiếu, không có giá trị" : "dữ liệu đã mã hoá"}
                tone="violet"
                state={step === 0 || step === 1 ? "active" : "normal"}
              />
            </DiagramGroupBox>

            {mode === "sealed" && step === 0 && (
              <>
                <DiagramNode x={16} y={230} width={200} height={50} label="kubeseal (dev máy)" sublabel="mã hoá bằng public key" tone="amber" state="active" />
              </>
            )}

            <DiagramArrow from={[220, 145]} to={[264, 145]} tone="blue" animated={step === 1 || step === 2} />
            <DiagramNode x={270} y={110} width={180} height={70} label="Argo CD" sublabel="apply như resource thường" tone="blue" state={step === 1 ? "active" : "normal"} />

            <DiagramArrow from={[450, 145]} to={[494, 145]} tone="cyan" animated={step === 2} />
            <DiagramNode
              x={500}
              y={40}
              width={200}
              height={64}
              label={mode === "eso" ? "External Secrets Operator" : "Sealed Secrets controller"}
              sublabel={mode === "eso" ? "gọi AWS qua Pod Identity" : "giữ private key của cluster"}
              tone="cyan"
              state={step === 2 || step === 3 ? "active" : "normal"}
            />

            {mode === "eso" && (
              <>
                <DiagramArrow from={[700, 72]} to={[700, 40]} tone="amber" animated={step === 2} dimmed={step !== 2} curve={0} />
                <DiagramLabel x={700} y={30} text="AWS Secrets Manager" tone="amber" size={11} />
              </>
            )}

            <DiagramArrow from={[600, 104]} to={[600, 150]} tone="green" animated={step === 3} dimmed={step !== 3} />
            <DiagramNode x={500} y={154} width={200} height={60} label="Secret (Kubernetes)" sublabel="giá trị thật, dùng bởi pod" tone="green" state={step === 3 || step === 4 ? "active" : "normal"} />

            {step === 4 && (
              <DiagramLabel
                x={360}
                y={260}
                text={mode === "eso" ? "Đổi ở AWS → tự đồng bộ theo refreshInterval, không cần commit" : "Đổi giá trị → phải mã hoá lại + commit SealedSecret mới"}
                tone="slate"
                size={12}
              />
            )}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
