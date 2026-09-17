"use client";

import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const steps: DiagramStep[] = [
  {
    title: "1. Stage builder",
    description:
      "`FROM node:22-slim AS builder` cài `npm ci` (đủ cả `dependencies` lẫn `devDependencies` — cần `typescript`, `@types/*`, `vitest` để build), copy toàn bộ source `.ts`, rồi `npm run build` ra `dist/`. Stage này nặng nhưng KHÔNG phải thứ sẽ chạy production.",
  },
  {
    title: "2. Loại bỏ ở stage runtime",
    description:
      "Stage thứ hai `FROM node:22-slim` bắt đầu lại từ đầu — hoàn toàn TRẮNG, không kế thừa gì từ builder trừ khi dùng `COPY --from=builder`. Toàn bộ devDependencies, source `.ts`, test file của stage 1 bị bỏ lại, không lọt sang stage này.",
  },
  {
    title: "3. Chỉ mang đúng thứ cần",
    description:
      "`COPY --from=builder /app/dist ./dist` lấy đúng JS đã biên dịch; `RUN npm ci --omit=dev` chỉ cài `dependencies` production (fastify, drizzle-orm, ioredis...). Không `tsc`, không `vitest`, không file `.ts` gốc nào trong image này.",
  },
  {
    title: "4. Non-root user",
    description: "Thêm `USER node` trước `CMD` — image `node:22-slim` đã có sẵn user `node` (uid 1000), không cần tự tạo user mới.",
  },
  {
    title: "5. So sánh kích thước",
    description:
      "Stage builder (không bao giờ ship) có thể nặng ~350MB vì cõng theo compiler + devDependencies. Image runtime cuối cùng — thứ THẬT SỰ chạy ở production — nhỏ hơn nhiều vì chỉ có Node runtime + dependencies production + `dist/` đã biên dịch.",
  },
];

/** Stage graph: builder (nặng, có devDependencies) -> runtime (nhẹ, chỉ prod deps) -> bar so sánh kích thước image. */
export function DockerfileStageSizeComparisonDiagram() {
  return (
    <StepDiagram title="Multi-stage build: builder bị bỏ lại, chỉ runtime được ship" viewBox="0 0 720 320" steps={steps}>
      {(step) => {
        const showRuntimeStripped = step >= 1;
        const showNonRoot = step >= 3;
        const showBars = step >= 4;

        return (
          <>
            {/* Stage 1: builder */}
            <DiagramNode
              x={30}
              y={20}
              width={280}
              height={110}
              label="🏗️ Stage builder"
              sublabel="node:22-slim AS builder"
              tone="amber"
              state={step === 0 ? "active" : "dimmed"}
            />
            <DiagramLabel x={170} y={55} text="npm ci (full)" size={11} />
            <DiagramLabel x={170} y={72} text="src/*.ts + devDependencies" size={11} />
            <DiagramLabel x={170} y={89} text="npm run build → dist/" size={11} />
            <DiagramLabel x={170} y={106} text="⚠️ không bao giờ ship" size={10.5} tone="rose" />

            <DiagramArrow from={[310, 75]} to={[400, 75]} label="COPY --from=builder" tone="blue" animated />

            {/* Stage 2: runtime */}
            <DiagramNode
              x={410}
              y={20}
              width={280}
              height={110}
              label="🚢 Stage runtime"
              sublabel="node:22-slim (mới, sạch)"
              tone="green"
              state={showRuntimeStripped ? "active" : "normal"}
            />
            <DiagramLabel x={550} y={55} text="chỉ /app/dist" size={11} />
            <DiagramLabel x={550} y={72} text="npm ci --omit=dev" size={11} />
            {showNonRoot && <DiagramLabel x={550} y={89} text="USER node (non-root)" size={11} tone="green" bold />}

            {/* Discarded pile from builder */}
            {showRuntimeStripped && (
              <DiagramNode
                x={70}
                y={160}
                width={200}
                height={60}
                label="🗑️ Bị bỏ lại"
                sublabel="devDependencies, *.ts, test/"
                tone="rose"
                state="dimmed"
              />
            )}

            {showBars && (
              <>
                <DiagramLabel x={360} y={225} text="So sánh kích thước image" size={13} bold />
                {/* Builder bar (wide) — chỉ để so sánh, image này không bao giờ ship */}
                <DiagramNode x={110} y={236} width={280} height={30} label="builder ~350MB" tone="amber" rounded={6} />
                {/* Runtime bar (narrow) — image thật sự chạy production */}
                <DiagramNode x={110} y={274} width={110} height={30} label="runtime ~140MB" tone="green" rounded={6} state="active" />
              </>
            )}
          </>
        );
      }}
    </StepDiagram>
  );
}
