"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Focus = "v1" | "v2";

const captions: Record<Focus, string> = {
  v1: "Client v1 gọi `/api/v1/tasks` → route v1 gọi `listTasksByProject()` (hàm service DUY NHẤT, không đổi từ B04) → nhận hàng thô từ Postgres → `serializeTaskV1` giữ nguyên `status` là string `\"todo\"`. Client cũ không thấy gì khác so với trước B18.",
  v2: "Client v2 gọi `/api/v2/tasks` → route v2 gọi LẠI ĐÚNG `listTasksByProject()` — cùng một hàm, cùng một dòng dữ liệu trong Postgres — chỉ khác bước cuối: `serializeTaskV2` bọc `status` thành `{ value: \"todo\", label: \"Cần làm\" }`. Không có bảng dữ liệu thứ hai nào cả.",
};

/**
 * Side-by-side: v1 client and v2 client both call the same tasks-service / same
 * Postgres row, and only diverge at the serializer step. Toggle highlights one flow
 * at a time so learners see the shared middle node never changes.
 */
export function V1V2SharedDataDiagram() {
  const [focus, setFocus] = useState<Focus>("v1");

  const dim = (side: Focus) => focus !== side;

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["v1", "v2"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFocus(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              focus === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "v1" ? "Theo dõi client v1" : "Theo dõi client v2"}
          </button>
        ))}
      </div>
      <DiagramFrame title="Cùng một dữ liệu, hai cách trình bày" viewBox="0 0 720 320" caption={captions[focus]}>
        {/* v1 side */}
        <DiagramNode x={20} y={24} width={150} height={54} label="Client v1" sublabel="app cũ, chưa migrate" emoji="💻" tone="blue" state={dim("v1") ? "dimmed" : "active"} />
        <DiagramNode x={20} y={130} width={150} height={54} label="/api/v1/tasks" sublabel="serializeTaskV1" tone="blue" state={dim("v1") ? "dimmed" : "active"} />
        <DiagramLabel x={95} y={205} text={'status: "todo"'} tone="blue" size={11} />

        {/* v2 side */}
        <DiagramNode x={550} y={24} width={150} height={54} label="Client v2" sublabel="app mới" emoji="📱" tone="green" state={dim("v2") ? "dimmed" : "active"} />
        <DiagramNode x={550} y={130} width={150} height={54} label="/api/v2/tasks" sublabel="serializeTaskV2" tone="green" state={dim("v2") ? "dimmed" : "active"} />
        <DiagramLabel x={625} y={205} text="status: { value, label }" tone="green" size={11} />

        {/* shared middle */}
        <DiagramNode x={285} y={130} width={150} height={54} label="tasks-service" sublabel="listTasksByProject()" emoji="🧩" tone="violet" state="active" />
        <DiagramNode x={285} y={230} width={150} height={54} label="Postgres" sublabel="bảng tasks (1 dòng)" emoji="🗄️" tone="slate" />

        <DiagramArrow from={[95, 78]} to={[95, 128]} tone="blue" animated={!dim("v1")} dimmed={dim("v1")} />
        <DiagramArrow from={[625, 78]} to={[625, 128]} tone="green" animated={!dim("v2")} dimmed={dim("v2")} />
        <DiagramArrow from={[170, 155]} to={[283, 155]} tone="blue" animated={!dim("v1")} dimmed={dim("v1")} label="gọi chung" />
        <DiagramArrow from={[550, 155]} to={[437, 155]} tone="green" animated={!dim("v2")} dimmed={dim("v2")} label="gọi chung" />
        <DiagramArrow from={[360, 186]} to={[360, 228]} tone="violet" animated bidirectional label="SELECT ... FROM tasks" />
      </DiagramFrame>
    </div>
  );
}
