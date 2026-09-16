"use client";

import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

interface RouteInfo {
  id: string;
  method: string;
  path: string;
  x: number;
  y: number;
  tone: DiagramTone;
  meaning: string;
  parent?: string;
}

const routes: RouteInfo[] = [
  { id: "list-projects", method: "GET", path: "/api/v1/projects", x: 30, y: 20, tone: "blue", meaning: "Danh sách tất cả project — số nhiều, không có động từ trong URL." },
  { id: "create-project", method: "POST", path: "/api/v1/projects", x: 30, y: 90, tone: "green", meaning: "Tạo project mới. Trả 201 kèm header `Location: /api/v1/projects/:id`.", parent: "list-projects" },
  { id: "get-project", method: "GET", path: "/api/v1/projects/:id", x: 300, y: 20, tone: "blue", meaning: "Một project cụ thể — `:id` xác định đúng 1 resource trong collection.", parent: "list-projects" },
  { id: "delete-project", method: "DELETE", path: "/api/v1/projects/:id", x: 300, y: 90, tone: "rose", meaning: "Xoá project. 204 nếu project không còn task; 409 nếu vẫn còn task bên trong.", parent: "get-project" },
  {
    id: "list-tasks-nested",
    method: "GET",
    path: "/api/v1/projects/:id/tasks",
    x: 300,
    y: 170,
    tone: "amber",
    meaning: "Nested resource: task LUÔN thuộc về một project — URL thể hiện đúng quan hệ cha-con đó.",
    parent: "get-project",
  },
  {
    id: "create-task-nested",
    method: "POST",
    path: "/api/v1/projects/:id/tasks",
    x: 300,
    y: 240,
    tone: "green",
    meaning: "Tạo task mới trong đúng project `:id` này — `projectId` lấy từ URL, không lấy từ body.",
    parent: "list-tasks-nested",
  },
  {
    id: "get-task-flat",
    method: "GET",
    path: "/api/v1/tasks/:id",
    x: 545,
    y: 170,
    tone: "cyan",
    meaning: "Thao tác trực tiếp trên 1 task khi đã biết id — không cần lồng lại `projectId` vì id đã đủ định danh duy nhất.",
    parent: "list-tasks-nested",
  },
  {
    id: "update-task-flat",
    method: "PATCH",
    path: "/api/v1/tasks/:id",
    x: 545,
    y: 240,
    tone: "violet",
    meaning: "Đổi `status`/`assigneeId`. Dùng route phẳng vì sửa 1 task không cần biết lại project cha.",
    parent: "get-task-flat",
  },
];

export function RestNestedResourceRoutingDiagram() {
  const [selectedId, setSelectedId] = useState("list-tasks-nested");
  const selected = routes.find((route) => route.id === selectedId)!;
  const byId = new Map(routes.map((route) => [route.id, route]));

  return (
    <DiagramFrame
      title="Route phẳng vs route lồng — bấm để xem lý do thiết kế"
      viewBox="0 0 780 300"
      controls={
        <div className="text-sm leading-relaxed">
          <p className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
            {selected.method} {selected.path}
          </p>
          <p className="text-stone-700 dark:text-stone-300">{selected.meaning}</p>
        </div>
      }
      caption="Quy tắc chung: lồng resource khi con luôn cần cha để xác định phạm vi (tạo/liệt kê); dùng route phẳng khi id đã đủ định danh duy nhất (đọc/sửa/xoá 1 resource)."
    >
      {routes
        .filter((route) => route.parent)
        .map((route) => {
          const parent = byId.get(route.parent!)!;
          return (
            <DiagramArrow
              key={`arrow-${route.id}`}
              from={[parent.x + 110, parent.y + 30]}
              to={[route.x, route.y + 30]}
              tone={route.id === selectedId ? route.tone : "slate"}
              animated={route.id === selectedId}
              dimmed={route.id !== selectedId}
            />
          );
        })}
      {routes.map((route) => (
        <DiagramNode
          key={route.id}
          x={route.x}
          y={route.y}
          width={220}
          height={60}
          label={`${route.method} ${route.path}`}
          tone={route.tone}
          state={route.id === selectedId ? "active" : "normal"}
          onClick={() => setSelectedId(route.id)}
        />
      ))}
    </DiagramFrame>
  );
}
