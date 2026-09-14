"use client";

import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode, MovingPacket } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  { title: "Bếp lớn", description: "`FROM node:22 AS build` — stage đầu dùng image đầy đủ công cụ (Debian, compiler, npm). To nhưng tiện để build." },
  { title: "Cài & copy", description: "`RUN npm ci` cài CẢ devDependencies (TypeScript, test runner…), rồi `COPY . .` đưa source vào." },
  { title: "Build", description: "`RUN npm run build` biên dịch TypeScript ra `dist/`. Đây là 'hộp cơm' duy nhất ta cần mang đi." },
  { title: "Bếp gọn", description: "`FROM node:22-alpine AS runtime` — bắt đầu một stage MỚI, sạch trơn, base nhỏ. Không thừa hưởng gì từ stage trước." },
  { title: "Chỉ lấy thứ cần", description: "`RUN npm ci --omit=dev` chỉ cài dependency production, rồi `COPY --from=build /app/dist ./dist` lấy đúng thư mục build." },
  { title: "Khoá an toàn", description: "`USER node` để không chạy bằng root, `HEALTHCHECK` để Docker biết app còn khoẻ, `CMD` dạng exec form để nhận tín hiệu tắt đúng." },
  { title: "Kết quả", description: "Image cuối = CHỈ stage cuối cùng. Stage build bị bỏ lại (vẫn nằm trong cache để lần sau build nhanh). Kích thước minh hoạ — số thật tuỳ app." },
];

interface Block {
  label: string;
  sublabel: string;
  tone: DiagramTone;
  /** First step at which the block appears. */
  from: number;
  y: number;
}

const buildBlocks: Block[] = [
  { label: "node:22 (Debian)", sublabel: "npm, gcc, python…", tone: "slate", from: 0, y: 212 },
  { label: "node_modules", sublabel: "cả devDependencies", tone: "amber", from: 1, y: 160 },
  { label: "src/ + tsconfig", sublabel: "source code", tone: "blue", from: 1, y: 108 },
  { label: "dist/ ✨", sublabel: "code đã build", tone: "green", from: 2, y: 56 },
];

const runtimeBlocks: Block[] = [
  { label: "node:22-alpine", sublabel: "base nhỏ", tone: "cyan", from: 3, y: 212 },
  { label: "node_modules", sublabel: "chỉ production", tone: "amber", from: 4, y: 160 },
  { label: "dist/", sublabel: "COPY --from=build", tone: "green", from: 4, y: 108 },
  { label: "USER node", sublabel: "HEALTHCHECK · CMD", tone: "violet", from: 5, y: 56 },
];

function blockState(block: Block, step: number): "active" | "normal" | "dimmed" {
  if (step < block.from) return "dimmed";
  return step === block.from ? "active" : "normal";
}

export function MultiStageBuildDiagram() {
  return (
    <StepDiagram title="Multi-stage build: nấu ở bếp lớn, chỉ mang hộp cơm đi giao" viewBox="0 0 720 340" steps={steps}>
      {(step) => (
        <>
          <DiagramGroupBox x={14} y={20} width={240} height={256} label={step === 6 ? "Stage build 🗑️ bị bỏ lại" : "Stage: build"} tone={step === 6 ? "slate" : "amber"} />
          <DiagramGroupBox x={330} y={20} width={240} height={256} label="Stage: runtime → image cuối" tone="green" />
          {buildBlocks.map((block) => (
            <DiagramNode
              key={`build-${block.label}`}
              x={34}
              y={block.y}
              width={200}
              height={46}
              label={block.label}
              sublabel={block.sublabel}
              tone={block.tone}
              rounded={8}
              state={step === 6 ? "dimmed" : blockState(block, step)}
            />
          ))}
          {runtimeBlocks.map((block) => (
            <DiagramNode key={`runtime-${block.label}`} x={350} y={block.y} width={200} height={46} label={block.label} sublabel={block.sublabel} tone={block.tone} rounded={8} state={blockState(block, step)} />
          ))}
          <DiagramArrow from={[236, 79]} to={[346, 131]} tone="green" label="COPY --from" dimmed={step < 4} animated={step === 4} />
          {step === 4 && <MovingPacket key="copy-dist" path="M 236 79 L 346 131" durationSeconds={1.4} tone="green" label="dist/" repeat={false} />}

          <DiagramLabel x={600} y={44} text="Kích thước" anchor="start" bold />
          <DiagramNode x={590} y={60} width={120} height={50} label="1 stage" sublabel="≈ 1.2 GB" tone="rose" state={step === 6 ? "active" : "dimmed"} />
          <DiagramNode x={590} y={124} width={120} height={50} label="multi-stage" sublabel="≈ 180 MB" tone="green" state={step === 6 ? "active" : "dimmed"} />
          <rect x={20} y={298} width={step === 6 ? 520 : 0} height={12} rx={6} className="fill-rose-400/70 transition-all duration-700 dark:fill-rose-500/60" />
          <rect x={20} y={316} width={step === 6 ? 78 : 0} height={12} rx={6} className="fill-emerald-500/80 transition-all duration-700 dark:fill-emerald-400/70" />
          {step === 6 && <DiagramLabel x={560} y={322} text="nhỏ hơn ~85%, ít CVE hơn" anchor="start" tone="green" bold />}
        </>
      )}
    </StepDiagram>
  );
}
