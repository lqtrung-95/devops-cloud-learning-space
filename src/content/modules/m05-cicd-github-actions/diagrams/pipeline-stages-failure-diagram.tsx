"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "green" | "test-fail" | "cve";

const stages = [
  { id: "lint", label: "Lint", emoji: "🧹", seconds: 25, description: "`npm run lint` — kiểm tra style và lỗi hiển nhiên trong vài giây. Rẻ nhất nên chạy đầu tiên." },
  { id: "test", label: "Unit test", emoji: "🧪", seconds: 90, description: "`npm test -- --coverage` — chạy unit test, xuất coverage report. Test fail = code chưa đúng." },
  { id: "sast", label: "SAST", emoji: "🕵️", seconds: 60, description: "Quét source code tìm lỗi bảo mật (CodeQL, Semgrep) và dependency có CVE (`npm audit`, Dependabot alerts)." },
  { id: "build", label: "Build image", emoji: "🔨", seconds: 80, description: "`docker/build-push-action` build image, dùng cache để nhanh. Chưa push — mới nằm trên runner." },
  { id: "scan", label: "Image scan", emoji: "🔍", seconds: 40, description: "Trivy quét image vừa build: lỗ hổng OS package, thư viện, secret lọt vào layer." },
  { id: "push", label: "Push", emoji: "📤", seconds: 20, description: "Chỉ image đã qua mọi cổng mới được push lên GHCR với tag `sha-<commit>`." },
  { id: "deploy", label: "Deploy", emoji: "🚀", seconds: 60, description: "Triển khai image lên staging/production (job riêng, thường gắn `environment` có người duyệt)." },
];

const scenarios: Record<Scenario, { label: string; failAt: number; failure: string }> = {
  green: { label: "✅ Mọi thứ ổn", failAt: -1, failure: "" },
  "test-fail": { label: "❌ Test fail", failAt: 1, failure: "`expect(total).toBe(120)` nhận 100 → job test thất bại (exit code 1). Các bước sau bị SKIP, PR hiện dấu ❌ và nút Merge bị chặn bởi required check. Phát hiện sau ~2 phút thay vì khi khách hàng báo lỗi." },
  cve: { label: "🚨 Image có CVE CRITICAL", failAt: 4, failure: "Trivy thấy CVE CRITICAL có bản vá trong base image → `exit-code: 1` → dừng. Image lỗi KHÔNG bao giờ được push, nên không thể bị deploy nhầm." },
};

const NODE_WIDTH = 92;
const stageX = (index: number) => 8 + index * 101;

export function PipelineStagesFailureDiagram() {
  const [scenario, setScenario] = useState<Scenario>("green");
  const { failAt, failure } = scenarios[scenario];
  const lastIndex = failAt === -1 ? stages.length - 1 : failAt;
  const steps: DiagramStep[] = stages.slice(0, lastIndex + 1).map((stage, index) => ({
    title: stage.label,
    description: index === failAt ? failure : stage.description,
  }));

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarios) as Scenario[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarios[option].label}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Pipeline chuẩn: mỗi trạm là một cổng chặn" viewBox="0 0 720 270" steps={steps}>
        {(step) => {
          const elapsed = stages.slice(0, step + 1).reduce((sum, stage) => sum + stage.seconds, 0);
          const failedNow = failAt !== -1 && step === failAt;
          const finishedGreen = failAt === -1 && step === stages.length - 1;
          return (
            <>
              {stages.map((stage, index) => {
                const done = index < step || (index === step && !failedNow);
                const skipped = failedNow && index > failAt;
                const tone = index === step && failedNow ? "rose" : done ? "green" : skipped ? "slate" : "blue";
                return (
                  <g key={stage.id}>
                    {index > 0 && <DiagramArrow from={[stageX(index - 1) + NODE_WIDTH + 1, 82]} to={[stageX(index) - 2, 82]} tone={index <= step ? "green" : "slate"} dimmed={index > step} animated={index === step && !failedNow} />}
                    <DiagramNode
                      x={stageX(index)}
                      y={36}
                      width={NODE_WIDTH}
                      height={92}
                      label={stage.label}
                      sublabel={index === step && failedNow ? "❌ failed" : skipped ? "⏭ skipped" : done ? "✓ passed" : "…"}
                      emoji={stage.emoji}
                      tone={tone}
                      state={index === step ? "active" : index > step ? "dimmed" : "normal"}
                    />
                  </g>
                );
              })}
              <DiagramLabel x={8} y={22} text="CI (mọi PR)" anchor="start" tone="blue" bold />
              <DiagramLabel x={320} y={22} text="Chỉ khi merge vào main" anchor="start" tone="violet" bold />
              <DiagramNode
                x={40}
                y={160}
                width={300}
                height={80}
                label={failedNow ? "❌ Some checks were not successful" : finishedGreen ? "✅ All checks have passed" : "🟡 Checks đang chạy…"}
                sublabel={failedNow ? (failAt < 3 ? "Merge bị chặn (required status check)" : "Workflow đỏ: không push, không deploy") : finishedGreen ? "Sẵn sàng merge / đã deploy" : "Trang PR hiển thị trạng thái từng job"}
                tone={failedNow ? "rose" : finishedGreen ? "green" : "amber"}
                state="active"
              />
              <DiagramNode
                x={380}
                y={160}
                width={300}
                height={80}
                label={`⏱ Đã chạy ≈ ${Math.floor(elapsed / 60)}m${String(elapsed % 60).padStart(2, "0")}s`}
                sublabel={failedNow ? "Fail sớm = tiết kiệm phút runner" : "Mục tiêu: merge → image mới dưới 10 phút"}
                tone={elapsed > 600 ? "rose" : "cyan"}
              />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
