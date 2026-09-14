"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "main" | "feature";

const scenarioSteps: Record<Scenario, DiagramStep[]> = {
  main: [
    { title: "Xin vé", description: "Job có `permissions: id-token: write` nên được phép xin token. Action `aws-actions/configure-aws-credentials` gọi OIDC provider của GitHub." },
    { title: "Nhận JWT", description: "GitHub ký một JWT sống vài phút, ghi rõ: `sub: repo:acme/api:ref:refs/heads/main`, `aud: sts.amazonaws.com`. Như vé có ảnh và tên — không làm giả được." },
    { title: "Đổi vé", description: "Action gửi JWT tới AWS STS: `AssumeRoleWithWebIdentity` cho role `gha-deploy`." },
    { title: "Soát vé", description: "AWS kiểm tra chữ ký JWT với OIDC provider đã đăng ký, rồi so trust policy của role: `aud` đúng, `sub` khớp `repo:acme/api:ref:refs/heads/main` → hợp lệ." },
    { title: "Credential tạm", description: "STS trả về access key TẠM THỜI (mặc định 1 giờ). Hết giờ tự vô hiệu — không có gì để lộ lâu dài." },
    { title: "Làm việc", description: "Các step sau dùng credential tạm để push ECR, deploy… với đúng quyền trong permission policy của role (least privilege)." },
  ],
  feature: [
    { title: "Xin vé", description: "Một workflow trên nhánh `feature/x` (hoặc từ repo khác) cũng xin OIDC token." },
    { title: "Nhận JWT", description: "GitHub ký JWT trung thực: `sub: repo:acme/api:ref:refs/heads/feature/x`. Không ai sửa được claim này." },
    { title: "Đổi vé", description: "Action gửi JWT tới STS xin assume role `gha-deploy`." },
    { title: "Từ chối ⛔", description: "Trust policy chỉ cho `sub` = nhánh main. Claim không khớp → `AccessDenied: Not authorized to perform sts:AssumeRoleWithWebIdentity`. Nhánh thử nghiệm không thể deploy production." },
  ],
};

export function OidcAwsFederationDiagram() {
  const [scenario, setScenario] = useState<Scenario>("main");
  const steps = scenarioSteps[scenario];
  const branch = scenario === "main" ? "refs/heads/main" : "refs/heads/feature/x";

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["main", "feature"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "main" ? "Job trên nhánh main" : "Job trên nhánh feature/x"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="OIDC: GitHub Actions vào AWS không cần access key" viewBox="0 0 720 320" steps={steps}>
        {(step) => {
          const denied = scenario === "feature" && step === 3;
          return (
            <>
              <DiagramGroupBox x={8} y={8} width={300} height={300} label="GitHub" tone="slate" />
              <DiagramGroupBox x={412} y={8} width={300} height={300} label="AWS account" tone="amber" />
              <DiagramNode x={28} y={40} width={260} height={70} label="Job: deploy" sublabel="permissions: id-token: write" emoji="⚙️" tone="violet" state={[0, 2, 5].includes(step) ? "active" : "normal"} />
              <DiagramNode x={28} y={180} width={260} height={70} label="GitHub OIDC provider" sublabel="token.actions.githubusercontent.com" emoji="🎫" tone="blue" state={step === 1 ? "active" : "normal"} />
              <DiagramNode x={432} y={40} width={260} height={70} label="AWS STS" sublabel="AssumeRoleWithWebIdentity" emoji="🛂" tone="cyan" state={[2, 4].includes(step) ? "active" : "normal"} />
              <DiagramNode
                x={432}
                y={140}
                width={260}
                height={70}
                label="IAM Role: gha-deploy"
                sublabel={denied ? "❌ sub không khớp trust policy" : "trust: sub = …:ref:refs/heads/main"}
                emoji={denied ? "⛔" : "📜"}
                tone={denied ? "rose" : "amber"}
                state={step === 3 ? "active" : "normal"}
              />
              <DiagramNode x={432} y={236} width={260} height={56} label="ECR / S3 / EC2…" sublabel="quyền theo permission policy" tone="green" state={step === 5 ? "active" : "dimmed"} />

              {step === 0 && <DiagramArrow from={[140, 114]} to={[140, 176]} tone="violet" animated label="xin token" />}
              {step === 1 && (
                <>
                  <DiagramArrow from={[200, 176]} to={[200, 114]} tone="blue" animated />
                  <DiagramLabel x={300} y={134} text={`JWT sub: …:${branch}`} anchor="end" tone="blue" bold size={11.5} />
                </>
              )}
              {step === 2 && <MovingPacket key="exchange" path="M 290 75 L 430 75" durationSeconds={1.4} tone="violet" label="JWT" repeat={false} />}
              {step === 2 && <DiagramArrow from={[290, 90]} to={[430, 90]} tone="violet" animated />}
              {step === 3 && <DiagramArrow from={[562, 114]} to={[562, 136]} tone={denied ? "rose" : "amber"} label={denied ? "không khớp" : "khớp ✓"} />}
              {step === 4 && <DiagramArrow from={[430, 95]} to={[290, 95]} tone="green" animated label="🔑 key tạm · 1h" />}
              {step === 5 && <DiagramArrow from={[290, 90]} to={[430, 262]} tone="green" animated label="docker push / deploy" />}
              {denied && <DiagramLabel x={360} y={300} text="AccessDenied" tone="rose" bold size={14} />}
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
