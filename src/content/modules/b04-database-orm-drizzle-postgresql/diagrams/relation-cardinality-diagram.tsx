"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Mode = "one-to-many" | "many-to-many";

const captions: Record<Mode, string> = {
  "one-to-many":
    "1 tổ chức (organizations) có nhiều project. Foreign key nằm ở bảng 'nhiều' (projects.organization_id) — đúng như organizations/projects/tasks/comments trong B04.",
  "many-to-many":
    "Ví dụ minh hoạ — taskflow-api KHÔNG có bảng này ở B04. Một task có thể gắn nhiều tag, một tag gắn nhiều task ⇒ cần bảng nối. Pattern giống hệt memberships (user ↔ organization) sẽ xuất hiện ở B05.",
};

export function RelationCardinalityDiagram() {
  const [mode, setMode] = useState<Mode>("one-to-many");

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["one-to-many", "many-to-many"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "one-to-many" ? "1-n: organizations → projects" : "n-n: tasks ↔ tags (minh hoạ)"}
          </button>
        ))}
      </div>
      <DiagramFrame title="Cardinality: 1-n vs n-n" viewBox="0 0 720 240" caption={captions[mode]}>
        {mode === "one-to-many" ? (
          <>
            <DiagramNode x={40} y={90} width={180} height={70} label="organizations" sublabel="(1) một tổ chức" tone="violet" />
            <DiagramArrow from={[220, 125]} to={[330, 125]} tone="blue" label="organization_id" />
            <DiagramNode x={340} y={70} width={150} height={50} label="project A" tone="blue" />
            <DiagramNode x={340} y={130} width={150} height={50} label="project B" tone="blue" />
            <DiagramNode x={340} y={190} width={150} height={50} label="project C" tone="blue" />
            <DiagramLabel x={500} y={40} text="(n) nhiều project cùng trỏ về 1 organization" size={12} />
          </>
        ) : (
          <>
            <DiagramNode x={20} y={95} width={140} height={60} label="tasks" sublabel="(n)" tone="amber" />
            <DiagramNode x={290} y={95} width={140} height={60} label="task_tags" sublabel="bảng nối (fk + fk)" tone="slate" dashed />
            <DiagramNode x={560} y={95} width={140} height={60} label="tags" sublabel="(n)" tone="cyan" />
            <DiagramArrow from={[160, 125]} to={[288, 125]} tone="amber" label="task_id" />
            <DiagramArrow from={[560, 125]} to={[432, 125]} tone="cyan" label="tag_id" />
            <DiagramLabel x={360} y={190} text="⚠️ Chưa có trong taskflow-api — chỉ để hiểu khái niệm n-n" tone="rose" size={12} />
          </>
        )}
      </DiagramFrame>
    </div>
  );
}
