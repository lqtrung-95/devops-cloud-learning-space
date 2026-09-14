"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "main-branch" | "pull-request";

const sharedSteps: DiagramStep[] = [
  {
    title: "Chuẩn bị (1 lần)",
    description:
      "Trong IAM: tạo OIDC identity provider `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`) và role `github-deploy` có trust policy chỉ tin repo `trung/devops-app` nhánh `main`.",
  },
  {
    title: "Xin token",
    description:
      "Job khai báo `permissions: id-token: write` rồi xin GitHub một JWT ngắn hạn. Token ghi rõ: repo nào, nhánh/sự kiện nào (`sub`), dành cho ai (`aud`).",
  },
  {
    title: "Gọi STS",
    description: "Action `aws-actions/configure-aws-credentials` gửi JWT + ARN của role tới STS bằng `AssumeRoleWithWebIdentity`. Không có access key nào trong GitHub Secrets.",
  },
];

const scenarioSteps: Record<Scenario, DiagramStep[]> = {
  "main-branch": [
    ...sharedSteps,
    { title: "Kiểm tra trust", description: "STS xác minh chữ ký JWT với OIDC provider, rồi so `aud = sts.amazonaws.com` và `sub = repo:trung/devops-app:ref:refs/heads/main` với trust policy → khớp ✅." },
    { title: "Credential tạm", description: "STS trả access key + secret + session token tạm thời (mặc định 1 giờ, chỉnh bằng max session duration của role). Hết hạn là vô dụng." },
    { title: "Deploy", description: "Các bước sau (`aws s3 sync`, `aws ecs update-service`…) chạy với quyền của role — chỉ đúng những gì permissions policy cho phép." },
  ],
  "pull-request": [
    ...sharedSteps,
    { title: "Trust không khớp", description: "Workflow chạy từ sự kiện pull request nên `sub = repo:trung/devops-app:pull_request`. Trust policy chỉ chấp nhận `ref:refs/heads/main` → STS từ chối." },
    { title: "AccessDenied", description: "Job nhận lỗi `Not authorized to perform sts:AssumeRoleWithWebIdentity`. Code chưa review không thể deploy lên prod — đúng như thiết kế." },
  ],
};

export function GithubOidcRoleAssumptionDiagram() {
  const [scenario, setScenario] = useState<Scenario>("main-branch");
  const steps = scenarioSteps[scenario];
  const isFailure = scenario === "pull-request";

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["main-branch", "pull-request"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "main-branch" ? "Kịch bản: push lên main" : "Kịch bản: pull request"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="GitHub Actions lấy quyền AWS bằng OIDC (không cần access key)" viewBox="0 0 720 300" steps={steps}>
        {(step) => (
          <>
            <DiagramNode x={20} y={16} width={180} height={64} label="🎫 GitHub OIDC" sublabel="phát JWT ngắn hạn" tone="violet" state={step === 1 ? "active" : "normal"} />
            <DiagramNode
              x={20}
              y={130}
              width={180}
              height={80}
              label="⚙️ GitHub Actions"
              sublabel={isFailure ? "job từ pull request" : "job deploy · main"}
              tone="blue"
              state={[1, 2].includes(step) || (!isFailure && step === 5) ? "active" : "normal"}
            />
            <DiagramNode
              x={280}
              y={16}
              width={190}
              height={64}
              label="🎭 IAM Role"
              sublabel="trust: sub = …:main"
              tone={isFailure && step >= 3 ? "rose" : "green"}
              state={step === 0 || step === 3 ? "active" : "normal"}
            />
            <DiagramNode x={280} y={130} width={190} height={80} label="🏛️ AWS STS" sublabel="AssumeRoleWithWebIdentity" tone="amber" state={[2, 3, 4].includes(step) ? "active" : "normal"} />
            <DiagramNode
              x={540}
              y={130}
              width={160}
              height={80}
              label={isFailure && step >= 4 ? "⛔ AccessDenied" : "🪣 S3 / ECS"}
              sublabel={isFailure ? "không deploy được" : "môi trường prod"}
              tone={isFailure && step >= 4 ? "rose" : "cyan"}
              state={!isFailure && step === 5 ? "active" : isFailure && step === 4 ? "active" : "dimmed"}
            />

            {step === 1 && <DiagramArrow from={[110, 126]} to={[110, 84]} tone="violet" animated bidirectional label="JWT" />}
            {step === 2 && <MovingPacket key="jwt" path="M 200 170 L 280 170" durationSeconds={1.2} tone="amber" label="JWT" />}
            {step >= 2 && <DiagramArrow from={[202, 160]} to={[276, 160]} tone="amber" animated={step === 2} dimmed={step > 2} />}
            {step === 3 && <DiagramArrow from={[375, 126]} to={[375, 84]} tone={isFailure ? "rose" : "green"} animated bidirectional label={isFailure ? "sub ✗" : "sub ✓"} />}
            {!isFailure && step === 4 && <DiagramArrow from={[276, 190]} to={[202, 190]} tone="green" animated label="🔑 credential tạm" />}
            {!isFailure && step === 5 && <DiagramArrow from={[110, 212]} to={[620, 214]} curve={60} tone="cyan" animated label="aws s3 sync" />}
            {isFailure && step === 4 && <DiagramArrow from={[276, 190]} to={[202, 190]} tone="rose" animated label="❌ từ chối" />}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
