"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type TableId = "organizations" | "projects" | "tasks" | "comments";

interface TableInfo {
  label: string;
  tone: DiagramTone;
  x: number;
  columns: string[];
}

const tables: Record<TableId, TableInfo> = {
  organizations: {
    label: "organizations",
    tone: "violet",
    x: 10,
    columns: ["id — uuid, pk, default gen_random_uuid()", "name — text", "slug — text, unique", "created_at — timestamptz, default now()"],
  },
  projects: {
    label: "projects",
    tone: "blue",
    x: 195,
    columns: ["id — uuid, pk", "organization_id — uuid, fk → organizations.id", "name — text", "created_at — timestamptz"],
  },
  tasks: {
    label: "tasks",
    tone: "amber",
    x: 380,
    columns: [
      "id — uuid, pk",
      "project_id — uuid, fk → projects.id",
      "title — text, description — text",
      "status — text, check in (todo, in_progress, done)",
      "assignee_id — uuid, CHƯA có fk (users đến ở B05)",
      "created_at, updated_at — timestamptz",
    ],
  },
  comments: {
    label: "comments",
    tone: "cyan",
    x: 565,
    columns: ["id — uuid, pk", "task_id — uuid, fk → tasks.id", "author_id — uuid, CHƯA có fk (users đến ở B05)", "body — text", "created_at — timestamptz"],
  },
};

const order: TableId[] = ["organizations", "projects", "tasks", "comments"];
const nodeWidth = 145;
const nodeY = 30;
const nodeHeight = 80;
const centerY = nodeY + nodeHeight / 2;

export function SchemaRelationshipsDiagram() {
  const [selected, setSelected] = useState<TableId>("tasks");
  const info = tables[selected];

  return (
    <DiagramFrame
      title="4 bảng của B04 — bấm vào một bảng để xem cột"
      viewBox="0 0 720 200"
      caption={
        <div className="space-y-1.5">
          <p className="font-semibold text-stone-800 dark:text-stone-200">
            {info.label} — {info.columns.length} nhóm cột
          </p>
          <ul className="list-inside list-disc space-y-0.5">
            {info.columns.map((column) => (
              <li key={column} className="font-mono text-[13px]">
                {column}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      {order.slice(1).map((id, index) => {
        const child = tables[id];
        const parent = tables[order[index]];
        return (
          <DiagramArrow
            key={id}
            from={[child.x, centerY]}
            to={[parent.x + nodeWidth, centerY]}
            tone={selected === id || selected === order[index] ? child.tone : "slate"}
            label={`${order[index] === "organizations" ? "organization_id" : order[index] === "projects" ? "project_id" : "task_id"} →`}
          />
        );
      })}
      {order.map((id) => {
        const table = tables[id];
        return (
          <DiagramNode
            key={id}
            x={table.x}
            y={nodeY}
            width={nodeWidth}
            height={nodeHeight}
            label={table.label}
            sublabel={`${table.columns.length} nhóm cột`}
            tone={table.tone}
            state={selected === id ? "active" : "normal"}
            onClick={() => setSelected(id)}
          />
        );
      })}
    </DiagramFrame>
  );
}
