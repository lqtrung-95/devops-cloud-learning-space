"use client";

import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

const nodeOrder = ["schema", "generate", "sqlfile", "apply", "db"] as const;
type NodeId = (typeof nodeOrder)[number];

const nodes: Record<NodeId, { x: number; y: number; width: number; label: string; sublabel: string; tone: DiagramTone }> = {
  schema: { x: 10, y: 30, width: 150, label: "schema.ts", sublabel: "pgTable(...)", tone: "violet" },
  generate: { x: 195, y: 30, width: 165, label: "drizzle-kit generate", sublabel: "so sánh với snapshot cũ", tone: "blue" },
  sqlfile: { x: 400, y: 30, width: 190, label: "drizzle/0000_xxx.sql", sublabel: "migration file, versioned", tone: "amber" },
  apply: { x: 195, y: 155, width: 210, label: "drizzle-kit migrate / push", sublabel: "áp file SQL vào Postgres", tone: "green" },
  db: { x: 460, y: 155, width: 200, label: "Postgres (taskflow)", sublabel: "4 bảng đã tồn tại", tone: "slate" },
};

const steps: DiagramStep[] = [
  {
    title: "Viết schema.ts",
    description: "Khai báo `pgTable` cho `organizations`/`projects`/`tasks`/`comments` — đây chỉ là code TypeScript, chưa chạm gì tới Postgres.",
  },
  {
    title: "drizzle-kit generate",
    description: "Đọc `schema.ts`, so sánh với snapshot lần trước, rồi sinh ra một file `.sql` mới trong thư mục `drizzle/`.",
  },
  {
    title: "Đọc file SQL trước khi áp",
    description: "File migration là SQL thật (`CREATE TABLE`, `ALTER TABLE`...). Luôn đọc qua — đặc biệt các lệnh `DROP`/`ALTER` có thể mất dữ liệu.",
  },
  {
    title: "Áp migration",
    description:
      "CI/production dùng `drizzle-kit migrate` — chạy đúng file `.sql` đã review, có lịch sử rõ ràng. Local dev có thể dùng `drizzle-kit push` để bỏ qua bước sinh file, áp thẳng schema hiện tại — nhanh nhưng không để lại lịch sử migration.",
  },
  {
    title: "Postgres cập nhật",
    description: "Bảng thật xuất hiện trong `taskflow` database. `docker compose exec postgres psql -U taskflow -d taskflow -c '\\dt'` sẽ liệt kê đủ 4 bảng.",
  },
];

export function MigrationLifecycleDiagram() {
  return (
    <StepDiagram title="Vòng đời một migration Drizzle" viewBox="0 0 720 260" steps={steps}>
      {(step) => {
        const activeId = nodeOrder[Math.min(step, nodeOrder.length - 1)];
        const stateOf = (id: NodeId) => {
          const position = nodeOrder.indexOf(id);
          if (position === step) return "active" as const;
          return position < step ? ("normal" as const) : ("dimmed" as const);
        };
        return (
          <>
            <DiagramArrow from={[160, 70]} to={[193, 70]} tone="slate" dimmed={step < 1} />
            <DiagramArrow from={[360, 70]} to={[398, 70]} tone="slate" dimmed={step < 2} />
            <DiagramArrow from={[475, 106]} to={[350, 153]} tone="slate" dimmed={step < 3} />
            <DiagramArrow from={[405, 189]} to={[458, 189]} tone="slate" dimmed={step < 4} />
            {nodeOrder.map((id) => {
              const node = nodes[id];
              return (
                <DiagramNode
                  key={id}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={64}
                  label={node.label}
                  sublabel={node.sublabel}
                  tone={node.tone}
                  state={stateOf(id)}
                />
              );
            })}
            <text x={10} y={250} fontSize={11} className="fill-stone-500 dark:fill-stone-500">
              Bước hiện tại: {nodes[activeId].label}
            </text>
          </>
        );
      }}
    </StepDiagram>
  );
}
