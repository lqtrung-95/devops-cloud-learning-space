"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "happy" | "checkov" | "drift";

const COL_X = [10, 152, 294, 436, 578];
const ROW_Y = [16, 122, 228];
const WIDTH = 132;
const HEIGHT = 62;

// Grid position [column, row] for each pipeline stage.
const nodes: Record<string, { col: number; row: number; label: string; sublabel: string; tone: DiagramTone }> = {
  pr: { col: 0, row: 0, label: "🔀 Mở PR", sublabel: "sửa infra/*.tf", tone: "violet" },
  lint: { col: 1, row: 0, label: "🧹 Lint", sublabel: "fmt·validate·tflint", tone: "blue" },
  scan: { col: 2, row: 0, label: "🛡️ Scan", sublabel: "checkov / trivy", tone: "blue" },
  plan: { col: 3, row: 0, label: "📋 plan", sublabel: "OIDC role chỉ đọc", tone: "cyan" },
  comment: { col: 4, row: 0, label: "💬 Comment", sublabel: "plan vào PR", tone: "cyan" },
  review: { col: 4, row: 1, label: "👀 Review", sublabel: "đọc +/~/- & approve", tone: "amber" },
  merge: { col: 4, row: 2, label: "✅ Merge", sublabel: "vào main", tone: "green" },
  apply: { col: 3, row: 2, label: "🚀 apply", sublabel: "environment approval", tone: "green" },
  state: { col: 2, row: 2, label: "📒 State", sublabel: "S3 cập nhật", tone: "amber" },
  blocked: { col: 2, row: 1, label: "❌ CI đỏ", sublabel: "chặn merge", tone: "rose" },
  cron: { col: 0, row: 1, label: "⏰ Cron đêm", sublabel: "schedule", tone: "slate" },
  drift: { col: 0, row: 2, label: "🔍 plan", sublabel: "-detailed-exitcode", tone: "cyan" },
  issue: { col: 1, row: 2, label: "🚨 exit 2", sublabel: "mở issue drift", tone: "rose" },
};

const scenarios: Record<Scenario, { label: string; path: string[]; steps: DiagramStep[] }> = {
  happy: {
    label: "PR hợp lệ",
    path: ["pr", "lint", "scan", "plan", "comment", "review", "merge", "apply", "state"],
    steps: [
      { title: "PR", description: "Không ai bấm Console. Mọi thay đổi hạ tầng bắt đầu bằng một Pull Request sửa file `.tf`." },
      { title: "Lint", description: "`terraform fmt -check`, `terraform validate` và `tflint` bắt lỗi cú pháp, biến thừa, instance type không tồn tại… trong vài giây." },
      { title: "Scan", description: "`checkov -d .` hoặc `trivy config .` quét cấu hình bảo mật: bucket public, security group mở 0.0.0.0/0, RDS không mã hoá." },
      { title: "plan", description: "Workflow lấy credentials tạm qua OIDC (không có access key lưu trong GitHub), role chỉ có quyền đọc, chạy `terraform plan`." },
      { title: "Comment", description: "Kết quả plan được comment vào PR để reviewer thấy chính xác cái gì sẽ `+` tạo, `~` sửa, `-` xoá." },
      { title: "Review", description: "Con người đọc plan. Dòng `-/+` trên database hay `destroy` bất ngờ là tín hiệu dừng lại hỏi." },
      { title: "Merge", description: "Approve xong mới merge vào `main` (branch protection bắt buộc CI xanh + ít nhất 1 approve)." },
      { title: "apply", description: "Job apply chạy trong GitHub `environment` có required reviewers, assume role có quyền ghi, chạy `terraform apply`." },
      { title: "State", description: "State trên S3 được cập nhật (có locking). Git history giờ là nhật ký thay đổi hạ tầng: ai, khi nào, vì sao." },
    ],
  },
  checkov: {
    label: "Scan bắt lỗi",
    path: ["pr", "lint", "scan", "blocked"],
    steps: [
      { title: "PR", description: "Một PR thêm S3 bucket cho ảnh sản phẩm." },
      { title: "Lint", description: "Cú pháp đúng, tflint không kêu gì." },
      { title: "Scan", description: "Checkov báo `CKV2_AWS_6: Ensure that S3 bucket has a Public Access Block` bị FAILED." },
      { title: "Chặn", description: "Job đỏ → branch protection chặn merge. Sửa code (thêm `aws_s3_bucket_public_access_block`) hoặc ghi rõ lý do skip. Lỗi bị bắt trước khi lên AWS." },
    ],
  },
  drift: {
    label: "Drift hằng đêm",
    path: ["cron", "drift", "issue"],
    steps: [
      { title: "Cron", description: "Một workflow `schedule` chạy mỗi đêm, không cần ai mở PR." },
      { title: "plan", description: "`terraform plan -detailed-exitcode`: exit 0 = khớp, 1 = lỗi, 2 = có khác biệt giữa code và thực tế." },
      { title: "Issue", description: "Exit 2 → ai đó đã sửa tay trên Console. Workflow mở issue kèm plan. Team chọn: `apply` để đưa về như code, hoặc cập nhật code cho khớp thực tế." },
    ],
  },
};

const box = (id: string) => ({ x: COL_X[nodes[id].col], y: ROW_Y[nodes[id].row] });

// Arrow between two grid-adjacent nodes: horizontal uses side edges, vertical uses top/bottom edges.
function edge(fromId: string, toId: string): { from: [number, number]; to: [number, number] } {
  const a = box(fromId);
  const b = box(toId);
  if (nodes[fromId].row === nodes[toId].row) {
    const leftToRight = a.x < b.x;
    return {
      from: [leftToRight ? a.x + WIDTH + 2 : a.x - 2, a.y + HEIGHT / 2],
      to: [leftToRight ? b.x - 4 : b.x + WIDTH + 4, b.y + HEIGHT / 2],
    };
  }
  const downward = a.y < b.y;
  return {
    from: [a.x + WIDTH / 2, downward ? a.y + HEIGHT + 2 : a.y - 2],
    to: [b.x + WIDTH / 2, downward ? b.y - 4 : b.y + HEIGHT + 4],
  };
}

export function TerraformPrPipelineDiagram() {
  const [scenario, setScenario] = useState<Scenario>("happy");
  const { path, steps } = scenarios[scenario];

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
      <StepDiagram key={scenario} title="Pipeline Terraform: PR → plan → review → apply" viewBox="0 0 720 306" steps={steps} autoPlayMs={3000}>
        {(step) => (
          <>
            {path.slice(1).map((id, index) => {
              const { from, to } = edge(path[index], id);
              return <DiagramArrow key={`${path[index]}-${id}`} from={from} to={to} tone={nodes[id].tone} animated={index + 1 === step} dimmed={index + 1 > step} />;
            })}
            {Object.entries(nodes).map(([id, node]) => {
              const position = path.indexOf(id);
              const state = position === step ? "active" : position !== -1 && position < step ? "normal" : "dimmed";
              const { x, y } = box(id);
              return <DiagramNode key={id} x={x} y={y} width={WIDTH} height={HEIGHT} label={node.label} sublabel={node.sublabel} tone={node.tone} state={state} />;
            })}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
