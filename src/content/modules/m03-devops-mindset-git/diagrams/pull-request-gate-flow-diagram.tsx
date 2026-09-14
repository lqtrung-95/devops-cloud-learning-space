"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "happy" | "ci-fail" | "direct-push";
type NodeId = "branch" | "commit" | "pr" | "ci" | "review" | "gate" | "merge" | "release";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 64;

const layout: Record<NodeId, { x: number; y: number; label: string; sublabel: string; tone: DiagramTone }> = {
  branch: { x: 10, y: 20, label: "🌱 Tạo nhánh", sublabel: "feat/healthz", tone: "violet" },
  commit: { x: 195, y: 20, label: "✍️ Commit", sublabel: "feat(api): add /healthz", tone: "blue" },
  pr: { x: 380, y: 20, label: "📬 Mở PR", sublabel: "gh pr create", tone: "blue" },
  ci: { x: 560, y: 20, label: "🤖 CI checks", sublabel: "lint + test ✅", tone: "green" },
  review: { x: 560, y: 180, label: "👀 Review", sublabel: "CODEOWNERS approve", tone: "cyan" },
  gate: { x: 380, y: 180, label: "🛡️ Cổng bảo vệ", sublabel: "branch protection ✅", tone: "green" },
  merge: { x: 195, y: 180, label: "🔀 Squash merge", sublabel: "vào main", tone: "violet" },
  release: { x: 10, y: 180, label: "🏷️ Release", sublabel: "v1.5.0 + changelog", tone: "amber" },
};

const scenarios: Record<Scenario, { path: NodeId[]; overrides: Partial<Record<NodeId, { sublabel: string; tone: DiagramTone }>>; steps: DiagramStep[] }> = {
  happy: {
    path: ["branch", "commit", "pr", "ci", "review", "gate", "merge", "release"],
    overrides: {},
    steps: [
      { title: "Nhánh ngắn", description: "`git switch -c feat/healthz` từ main mới nhất. Một nhánh = một thay đổi nhỏ, review được trong 15 phút." },
      { title: "Commit chuẩn", description: "Pre-commit hook chạy lint/format/quét secret trước khi commit. Message theo Conventional Commits: `feat(api): add /healthz endpoint`." },
      { title: "Mở PR", description: "`gh pr create --fill`: mô tả vì sao thay đổi, cách test. PR là nơi thảo luận và để lại lịch sử quyết định." },
      { title: "CI tự chạy", description: "GitHub Actions chạy lint + unit test trên chính commit của PR. Kết quả hiện thành status check ngay trên PR." },
      { title: "Review", description: "File CODEOWNERS tự gán reviewer đúng người phụ trách (vd `/infra/ @org/platform-team`). Reviewer approve." },
      { title: "Cổng kiểm soát", description: "Branch protection trên `main` kiểm tra: đủ approval, status check bắt buộc xanh, nhánh đã cập nhật với main. Đủ hết → nút Merge mới sáng." },
      { title: "Merge", description: "Squash merge: cả PR thành 1 commit gọn trên main, message giữ chuẩn Conventional Commits. Nhánh được xoá." },
      { title: "Release", description: "Công cụ release đọc commit `feat:` → bump MINOR, tạo tag `v1.5.0` + changelog. Pipeline CD deploy (M05)." },
    ],
  },
  "ci-fail": {
    path: ["branch", "commit", "pr", "ci", "gate"],
    overrides: { ci: { sublabel: "test ❌ 2 failed", tone: "rose" }, gate: { sublabel: "⛔ Merge bị khoá", tone: "rose" } },
    steps: [
      { title: "Nhánh ngắn", description: "Tạo nhánh như bình thường." },
      { title: "Commit", description: "Commit qua được pre-commit (lint ổn) nhưng có một bug logic." },
      { title: "Mở PR", description: "Mở PR và nhờ review." },
      { title: "CI đỏ", description: "Unit test fail. Status check `test` báo ❌ ngay trên PR — lỗi bị bắt trong vài phút, trước khi chạm tới main." },
      { title: "Bị chặn", description: "Kể cả khi đã có approval, branch protection không cho merge vì check bắt buộc đang đỏ. Sửa code, push thêm commit → CI chạy lại → xanh mới merge được." },
    ],
  },
  "direct-push": {
    path: ["commit", "gate"],
    overrides: { commit: { sublabel: "git push origin main", tone: "rose" }, gate: { sublabel: "⛔ push bị từ chối", tone: "rose" } },
    steps: [
      { title: "Push thẳng main", description: "Ai đó commit trên main ở local và `git push origin main` cho nhanh — bỏ qua PR, CI và review." },
      { title: "Bị từ chối", description: "GitHub trả `remote: error: GH006: Protected branch update failed for refs/heads/main.` Main chỉ nhận thay đổi qua PR — kể cả admin nếu bật tuỳ chọn áp dụng cho admin." },
    ],
  },
};

const center = (id: NodeId): [number, number] => [layout[id].x + NODE_WIDTH / 2, layout[id].y + NODE_HEIGHT / 2];

function edgePoints(from: NodeId, to: NodeId): [[number, number], [number, number]] {
  const [fx, fy] = center(from);
  const [tx, ty] = center(to);
  if (fy === ty) {
    const direction = tx > fx ? 1 : -1;
    return [[fx + (direction * NODE_WIDTH) / 2 + direction * 2, fy], [tx - (direction * NODE_WIDTH) / 2 - direction * 4, ty]];
  }
  const direction = ty > fy ? 1 : -1;
  return [[fx, fy + (direction * NODE_HEIGHT) / 2 + direction * 2], [tx, ty - (direction * NODE_HEIGHT) / 2 - direction * 4]];
}

export function PullRequestGateFlowDiagram() {
  const [scenario, setScenario] = useState<Scenario>("happy");
  const { path, overrides, steps } = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["happy", "ci-fail", "direct-push"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx("rounded-full px-3 py-1.5 text-sm font-medium", scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
          >
            {option === "happy" ? "✅ PR suôn sẻ" : option === "ci-fail" ? "❌ CI đỏ" : "🚫 Push thẳng main"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Hành trình một thay đổi vào main" viewBox="0 0 720 270" steps={steps}>
        {(step) => (
          <>
            {path.slice(1).map((id, index) => {
              const [from, to] = edgePoints(path[index], id);
              const isFailure = Boolean(overrides[id]) && overrides[id]?.tone === "rose";
              return <DiagramArrow key={`${path[index]}-${id}`} from={from} to={to} tone={isFailure ? "rose" : "green"} animated={index + 1 === step} dimmed={index + 1 > step} curve={path[index] === "commit" && id === "gate" ? -40 : 0} />;
            })}
            {(Object.keys(layout) as NodeId[]).map((id) => {
              const node = { ...layout[id], ...overrides[id] };
              const position = path.indexOf(id);
              const state = position === step ? "active" : position !== -1 && position < step ? "normal" : "dimmed";
              return <DiagramNode key={id} x={node.x} y={node.y} width={NODE_WIDTH} height={NODE_HEIGHT} label={node.label} sublabel={node.sublabel} tone={node.tone} state={state} />;
            })}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
