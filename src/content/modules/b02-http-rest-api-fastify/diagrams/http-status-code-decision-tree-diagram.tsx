"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

/**
 * Decision tree for "PATCH /api/v1/projects/:id" (áp dụng tương tự cho các endpoint CRUD khác):
 * body thiếu field -> 400, resource không tồn tại -> 404, trạng thái xung đột -> 409, còn lại -> 200/201/204.
 */

type Scenario = "success" | "missing-field" | "not-found" | "conflict";

const scenarios: Record<Scenario, { label: string; finalNode: string; tone: DiagramTone; status: string; note: string }> = {
  success: {
    label: "Request hợp lệ",
    finalNode: "ok",
    tone: "green",
    status: "200 / 201 / 204",
    note: "Body đủ field, resource tồn tại, trạng thái không xung đột → xử lý và trả kết quả (201 khi tạo mới kèm header Location, 204 khi xoá không có body).",
  },
  "missing-field": {
    label: "Thiếu field bắt buộc",
    finalNode: "bad-request",
    tone: "amber",
    status: "400 Bad Request",
    note: "Ví dụ POST /projects thiếu `name`. Lỗi này do client gửi sai — dừng ngay từ bước kiểm tra input, chưa cần đụng tới dữ liệu.",
  },
  "not-found": {
    label: "Không tìm thấy resource",
    finalNode: "not-found",
    tone: "rose",
    status: "404 Not Found",
    note: "Ví dụ PATCH /projects/:id với `id` không có trong Map. Khác với 400: request hợp lệ về hình thức, chỉ là resource không tồn tại.",
  },
  conflict: {
    label: "Trạng thái xung đột",
    finalNode: "conflict",
    tone: "violet",
    status: "409 Conflict",
    note: "Ví dụ DELETE /projects/:id khi project vẫn còn task bên trong. Resource CÓ tồn tại (khác 404) nhưng thao tác này phá vỡ một ràng buộc trạng thái.",
  },
};

export function HttpStatusCodeDecisionTreeDiagram() {
  const [scenario, setScenario] = useState<Scenario>("success");
  const current = scenarios[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(Object.keys(scenarios) as Scenario[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setScenario(key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {scenarios[key].label}
          </button>
        ))}
      </div>
      <DiagramFrame
        title="Cây quyết định status code cho PATCH /api/v1/projects/:id"
        viewBox="0 0 720 300"
        caption={
          <>
            <strong>{current.status}</strong> — {current.note}
          </>
        }
      >
        <DiagramNode x={280} y={10} width={160} height={50} label="Request đến" sublabel="PATCH /projects/:id" tone="slate" state="active" />

        <DiagramNode x={260} y={90} width={200} height={50} label="Đủ field bắt buộc?" tone="slate" state={scenario === "missing-field" ? "active" : "normal"} />
        <DiagramArrow from={[360, 60]} to={[360, 88]} tone="slate" animated />
        <DiagramArrow from={[280, 140]} to={[110, 168]} tone="amber" label="không" animated={scenario === "missing-field"} dimmed={scenario !== "missing-field"} />
        <DiagramNode x={20} y={168} width={180} height={54} label="400 Bad Request" sublabel="thiếu field bắt buộc" tone="amber" state={scenario === "missing-field" ? "active" : "dimmed"} />

        <DiagramArrow from={[440, 140]} to={[440, 168]} tone="slate" label="có" animated={scenario !== "missing-field"} dimmed={scenario === "missing-field"} />
        <DiagramNode x={340} y={168} width={200} height={50} label="Resource tồn tại?" tone="slate" state={scenario === "not-found" ? "active" : scenario === "missing-field" ? "dimmed" : "normal"} />

        <DiagramArrow from={[360, 218]} to={[240, 240]} tone="rose" label="không" animated={scenario === "not-found"} dimmed={scenario !== "not-found"} />
        <DiagramNode x={220} y={240} width={190} height={50} label="404 Not Found" sublabel="id không có trong Map" tone="rose" state={scenario === "not-found" ? "active" : "dimmed"} />

        <DiagramArrow from={[500, 218]} to={[560, 90]} tone="violet" curve={-70} label="có nhưng xung đột" animated={scenario === "conflict"} dimmed={scenario !== "conflict"} />
        <DiagramNode x={540} y={30} width={170} height={54} label="409 Conflict" sublabel="vi phạm ràng buộc trạng thái" tone="violet" state={scenario === "conflict" ? "active" : "dimmed"} />

        <DiagramArrow from={[500, 218]} to={[560, 240]} tone="green" label="hợp lệ, không xung đột" animated={scenario === "success"} dimmed={scenario !== "success"} />
        <DiagramNode x={540} y={240} width={170} height={50} label="200 / 201 / 204" sublabel="xử lý & trả kết quả" tone="green" state={scenario === "success" ? "active" : "dimmed"} />

        <DiagramLabel x={360} y={295} text="Thứ tự kiểm tra: hình thức request (400) → resource có tồn tại (404) → trạng thái có hợp lệ để thao tác (409)" size={11.5} />
      </DiagramFrame>
    </div>
  );
}
