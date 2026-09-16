"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "naive" | "dataloader";
type Actor = "project" | "tasks" | "comments" | "author";

interface FlowStep extends DiagramStep {
  active: Actor;
  arrow: { from: [number, number]; to: [number, number]; tone: DiagramTone; label: string };
  count: number;
  authorLabel: string;
  authorTone: DiagramTone;
}

const scenarioLabels: Record<Scenario, string> = {
  naive: "Chưa có DataLoader (naive)",
  dataloader: "Đã có DataLoader cho author",
};

function countTone(count: number): DiagramTone {
  if (count <= 2) return "green";
  if (count <= 5) return "amber";
  return "rose";
}

const naiveSteps: FlowStep[] = [
  { title: "Query.project", description: "1 câu SQL lấy project theo id.", active: "project", arrow: { from: [40, 150], to: [140, 150], tone: "blue", label: "SELECT project" }, count: 1, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "Project.tasks", description: "1 câu SQL lấy toàn bộ task theo project_id.", active: "tasks", arrow: { from: [140, 150], to: [280, 150], tone: "blue", label: "SELECT tasks" }, count: 2, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "Task 1 → comments", description: "Resolver Task.comments tự chạy 1 query RIÊNG cho task này.", active: "comments", arrow: { from: [280, 128], to: [420, 128], tone: "amber", label: "SELECT comments (task 1)" }, count: 3, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "Task 2 → comments", description: "Lại thêm 1 query riêng — resolver không biết task 1 vừa hỏi rồi.", active: "comments", arrow: { from: [280, 150], to: [420, 150], tone: "amber", label: "SELECT comments (task 2)" }, count: 4, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "Task 3 → comments", description: "Query thứ 3 cho comments — đúng 3 task, đúng 3 query riêng lẻ.", active: "comments", arrow: { from: [280, 172], to: [420, 172], tone: "amber", label: "SELECT comments (task 3)" }, count: 5, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "Comment 1 → author", description: "Resolver Comment.author chạy 1 query riêng cho comment này.", active: "author", arrow: { from: [420, 100], to: [560, 100], tone: "rose", label: "SELECT user (c1)" }, count: 6, authorLabel: "1/6 query", authorTone: "rose" },
  { title: "Comment 2 → author", description: "Query riêng tiếp theo — không hề gộp với comment 1.", active: "author", arrow: { from: [420, 118], to: [560, 118], tone: "rose", label: "SELECT user (c2)" }, count: 7, authorLabel: "2/6 query", authorTone: "rose" },
  { title: "Comment 3 → author", description: "Tiếp tục nổ số — mỗi comment một query author riêng.", active: "author", arrow: { from: [420, 136], to: [560, 136], tone: "rose", label: "SELECT user (c3)" }, count: 8, authorLabel: "3/6 query", authorTone: "rose" },
  { title: "Comment 4 → author", description: "Chưa có gì gom lại cả.", active: "author", arrow: { from: [420, 154], to: [560, 154], tone: "rose", label: "SELECT user (c4)" }, count: 9, authorLabel: "4/6 query", authorTone: "rose" },
  { title: "Comment 5 → author", description: "Còn 1 comment nữa.", active: "author", arrow: { from: [420, 172], to: [560, 172], tone: "rose", label: "SELECT user (c5)" }, count: 10, authorLabel: "5/6 query", authorTone: "rose" },
  { title: "Comment 6 → author", description: "Tổng cộng 11 câu SQL cho đúng 1 query GraphQL — đây là N+1.", active: "author", arrow: { from: [420, 190], to: [560, 190], tone: "rose", label: "SELECT user (c6)" }, count: 11, authorLabel: "6/6 query", authorTone: "rose" },
];

const dataloaderSteps: FlowStep[] = [
  { title: "Query.project", description: "Không đổi — vẫn 1 query.", active: "project", arrow: { from: [40, 150], to: [140, 150], tone: "blue", label: "SELECT project" }, count: 1, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "Project.tasks", description: "Không đổi — vẫn 1 query.", active: "tasks", arrow: { from: [140, 150], to: [280, 150], tone: "blue", label: "SELECT tasks" }, count: 2, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "Task 1 → comments", description: "Chưa thêm DataLoader cho comments trong bài này — vẫn 3 query riêng như cũ.", active: "comments", arrow: { from: [280, 128], to: [420, 128], tone: "amber", label: "SELECT comments (task 1)" }, count: 3, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "Task 2 → comments", description: "Vẫn N+1 ở tầng này — DataLoader trong bài chỉ áp cho field author.", active: "comments", arrow: { from: [280, 150], to: [420, 150], tone: "amber", label: "SELECT comments (task 2)" }, count: 4, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "Task 3 → comments", description: "3/3 — không khác gì kịch bản naive ở tầng comments.", active: "comments", arrow: { from: [280, 172], to: [420, 172], tone: "amber", label: "SELECT comments (task 3)" }, count: 5, authorLabel: "chưa chạy", authorTone: "slate" },
  { title: "6 comment cùng gọi .load(authorId)", description: "Cả 6 resolver Comment.author gọi `userLoader.load(id)` trong CÙNG một tick — chưa có query nào chạy, DataLoader đang gom key.", active: "author", arrow: { from: [420, 150], to: [560, 150], tone: "amber", label: "6× .load() — đang gom" }, count: 5, authorLabel: "6 key đang gom, 0 query", authorTone: "amber" },
  { title: "Hết tick — DataLoader phát 1 query gộp", description: "`SELECT * FROM users WHERE id IN (id1, ..., id6)` — đúng 1 câu SQL cho cả 6 key.", active: "author", arrow: { from: [420, 150], to: [560, 150], tone: "green", label: "SELECT users WHERE id IN (...)" }, count: 6, authorLabel: "1 query gộp cho 6 key", authorTone: "green" },
];

export function NestedResolverNPlusOneAndDataloaderDiagram() {
  const [scenario, setScenario] = useState<Scenario>("naive");
  const steps = scenario === "naive" ? naiveSteps : dataloaderSteps;

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarioLabels) as Scenario[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarioLabels[option]}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Đếm SQL thật khi resolver lồng 3 cấp tự bắn query" viewBox="0 0 680 260" steps={steps}>
        {(stepIndex) => {
          const step = steps[stepIndex];
          return (
            <>
              <DiagramNode x={40} y={112} width={100} height={76} label="Project" emoji="📁" tone="blue" state={step.active === "project" ? "active" : "normal"} />
              <DiagramNode x={180} y={112} width={100} height={76} label="Tasks ×3" emoji="🗂️" tone="blue" state={step.active === "tasks" ? "active" : "normal"} />
              <DiagramNode x={320} y={112} width={100} height={76} label="Comments ×3" sublabel="1 resolver/task" emoji="💬" tone="amber" state={step.active === "comments" ? "active" : "normal"} />
              <DiagramNode
                x={460}
                y={100}
                width={140}
                height={100}
                label="Author"
                sublabel={step.authorLabel}
                emoji="👤"
                tone={step.authorTone}
                state={step.active === "author" ? "active" : "normal"}
              />
              <DiagramNode x={40} y={210} width={560} height={40} label={`Tổng số câu SQL tính đến bước này: ${step.count}`} tone={countTone(step.count)} />
              <DiagramArrow {...step.arrow} animated />
            </>
          );
        }}
      </StepDiagram>
    </div>
  );
}
