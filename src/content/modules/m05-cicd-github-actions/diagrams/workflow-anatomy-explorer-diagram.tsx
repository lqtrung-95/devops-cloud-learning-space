"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { InlineCodeText } from "@/components/ui/inline-code-text";

interface Part {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  tone: DiagramTone;
  info: string;
  yaml: string;
}

const parts: Part[] = [
  { id: "push", x: 10, y: 40, width: 130, height: 52, label: "⚡ push", sublabel: "branches: [main]", tone: "amber", info: "Event (trigger) = chuông báo có việc. `push` kêu khi có commit được đẩy lên nhánh khớp bộ lọc.", yaml: "on:\n  push:\n    branches: [main]" },
  { id: "pull_request", x: 10, y: 120, width: 130, height: 52, label: "⚡ pull_request", sublabel: "mở / cập nhật PR", tone: "amber", info: "Chạy khi PR được mở hoặc có commit mới. Workflow chạy trên merge commit giả định giữa nhánh PR và nhánh đích — kiểm tra trước khi merge.", yaml: "on:\n  pull_request:\n    branches: [main]" },
  { id: "dispatch", x: 10, y: 200, width: 130, height: 52, label: "⚡ workflow_dispatch", sublabel: "bấm tay", tone: "amber", info: "Nút 'Run workflow' trên tab Actions, có thể nhận input. Hữu ích cho deploy thủ công hoặc chạy lại job bảo trì.", yaml: "on:\n  workflow_dispatch:\n    inputs:\n      environment:\n        type: choice\n        options: [staging, production]" },
  { id: "workflow", x: 170, y: 8, width: 540, height: 22, label: "📄 Workflow: .github/workflows/ci.yml", tone: "slate", info: "Workflow = một file YAML trong `.github/workflows/`. Một repo có thể có nhiều workflow; mỗi workflow gồm một hoặc nhiều job.", yaml: "name: CI\non: [push, pull_request]\npermissions:\n  contents: read\njobs:\n  lint: ...\n  test: ...\n  build: ..." },
  { id: "lint", x: 192, y: 56, width: 160, height: 60, label: "🧹 Job: lint", sublabel: "runs-on: ubuntu-latest", tone: "blue", info: "Job = một nhóm step chạy trên CÙNG một runner. Mặc định các job chạy SONG SONG với nhau.", yaml: "lint:\n  runs-on: ubuntu-latest\n  steps:\n    - uses: actions/checkout@v5\n    - run: npm ci && npm run lint" },
  { id: "test", x: 192, y: 140, width: 160, height: 60, label: "🧪 Job: test", sublabel: "runs-on: ubuntu-latest", tone: "blue", info: "lint và test chạy song song trên hai máy khác nhau — không chia sẻ file với nhau (muốn chia sẻ phải dùng artifact).", yaml: "test:\n  runs-on: ubuntu-latest\n  steps:\n    - uses: actions/checkout@v5\n    - run: npm ci && npm test" },
  { id: "runner", x: 192, y: 238, width: 160, height: 66, label: "🖥️ Runner", sublabel: "VM mới cho mỗi job", tone: "cyan", info: "Runner = máy chạy job. GitHub-hosted runner là VM sạch, dùng xong xoá. Self-hosted runner là máy của bạn — cần tự bảo trì và cẩn thận với repo public.", yaml: "runs-on: ubuntu-latest   # GitHub-hosted\n# runs-on: [self-hosted, linux, x64]" },
  { id: "build", x: 392, y: 40, width: 316, height: 272, label: "Job: build", tone: "violet", info: "`needs: [lint, test]` biến song song thành tuần tự: build chỉ chạy khi cả lint và test thành công. Bấm từng step bên trong để xem.", yaml: "build:\n  needs: [lint, test]\n  if: github.event_name == 'push'\n  runs-on: ubuntu-latest\n  steps: ..." },
  { id: "checkout", x: 410, y: 70, width: 280, height: 42, label: "① uses: actions/checkout@v5", tone: "green", info: "Step dạng `uses` = gọi một action có sẵn (như thuê dịch vụ đóng gói). Runner mới tinh không có code — bước đầu tiên gần như luôn là checkout.", yaml: "- uses: actions/checkout@v5" },
  { id: "setup", x: 410, y: 122, width: 280, height: 42, label: "② uses: actions/setup-node@v5", tone: "green", info: "Action nhận tham số qua `with:`. Số version (@v5) là tag của action — thay đổi theo thời gian, repo quan trọng nên pin theo commit SHA.", yaml: "- uses: actions/setup-node@v5\n  with:\n    node-version: 22\n    cache: npm" },
  { id: "run", x: 410, y: 174, width: 280, height: 42, label: "③ run: npm ci && npm run build", tone: "green", info: "Step dạng `run` = chạy lệnh shell trên runner. Các step trong một job chạy TUẦN TỰ và dùng chung filesystem.", yaml: "- name: Build\n  run: |\n    npm ci\n    npm run build" },
  { id: "expr", x: 410, y: 226, width: 280, height: 42, label: "④ env từ secrets & context", tone: "green", info: "Biểu thức `${{ ... }}` đọc context: `github.sha`, `secrets.X`, `env.Y`. Secret tự được che thành *** trong log.", yaml: "- run: ./scripts/upload.sh\n  env:\n    SHA: ${{ github.sha }}\n    API_TOKEN: ${{ secrets.API_TOKEN }}" },
];

const byId = new Map(parts.map((part) => [part.id, part]));

export function WorkflowAnatomyExplorerDiagram() {
  const [selectedId, setSelectedId] = useState("build");
  const selected = byId.get(selectedId)!;

  return (
    <DiagramFrame
      title="Giải phẫu một workflow — bấm vào từng thành phần"
      viewBox="0 0 720 320"
      controls={
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-semibold">{selected.label}:</span> <InlineCodeText text={selected.info} />
          </p>
          <pre className="overflow-x-auto rounded-xl bg-stone-900 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-stone-100">{selected.yaml}</pre>
        </div>
      }
      caption="Event bấm chuông → workflow bắt đầu → các job chạy trên runner riêng (song song hoặc theo needs) → mỗi job chạy các step tuần tự."
    >
      {["push", "pull_request", "dispatch"].map((id) => {
        const part = byId.get(id)!;
        return <DiagramArrow key={`trigger-${id}`} from={[142, part.y + 26]} to={[188, id === "dispatch" ? 170 : part.y + 36]} tone="amber" animated={selectedId === id} />;
      })}
      <DiagramArrow from={[354, 86]} to={[390, 120]} tone="violet" label="needs" />
      <DiagramArrow from={[354, 170]} to={[390, 150]} tone="violet" />
      <DiagramArrow from={[272, 234]} to={[272, 204]} tone="cyan" dimmed={selectedId !== "runner"} />
      {parts.map((part) =>
        part.id === "build" ? (
          <g key={part.id} onClick={() => setSelectedId(part.id)} className="cursor-pointer">
            <rect x={part.x} y={part.y} width={part.width} height={part.height} rx={16} fill="transparent" />
            <DiagramGroupBox x={part.x} y={part.y} width={part.width} height={part.height} label={`${part.label} · needs: [lint, test]${selectedId === "build" ? " ◀" : ""}`} tone="violet" />
          </g>
        ) : (
          <DiagramNode
            key={part.id}
            x={part.x}
            y={part.y}
            width={part.width}
            height={part.height}
            label={part.label}
            sublabel={part.sublabel}
            tone={part.tone}
            rounded={part.id === "workflow" ? 6 : 10}
            state={part.id === selectedId ? "active" : "normal"}
            onClick={() => setSelectedId(part.id)}
          />
        ),
      )}
    </DiagramFrame>
  );
}
