"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Scenario = "success" | "missing-folder";

const nodes: Record<string, { x: number; y: number; width: number; label: string; sublabel: string; tone: DiagramTone }> = {
  start: { x: 250, y: 10, width: 220, label: "▶ ./backup.sh", sublabel: "set -euo pipefail", tone: "violet" },
  check: { x: 240, y: 90, width: 240, label: "❓ Thư mục nguồn có tồn tại?", sublabel: 'if [[ -d "$SRC" ]]', tone: "amber" },
  archive: { x: 30, y: 180, width: 250, label: "📦 Nén thư mục", sublabel: "tar -czf backup-$(date +%F).tar.gz", tone: "blue" },
  cleanup: { x: 30, y: 262, width: 250, label: "🧹 Xoá bản cũ, giữ 7", sublabel: "ls -t | tail -n +8 | xargs rm", tone: "cyan" },
  done: { x: 320, y: 262, width: 150, label: "✅ exit 0", sublabel: "log: backup OK", tone: "green" },
  failure: { x: 460, y: 180, width: 240, label: "🚨 Báo lỗi & dừng", sublabel: "echo ... >&2; exit 1", tone: "rose" },
};

const scenarioPaths: Record<Scenario, { path: string[]; steps: DiagramStep[] }> = {
  success: {
    path: ["start", "check", "archive", "cleanup", "done"],
    steps: [
      { title: "Chạy script", description: "`set -euo pipefail` = dặn script: gặp lỗi là dừng ngay, không làm tiếp một cách mù quáng." },
      { title: "Kiểm tra", description: "Script hỏi: thư mục cần backup có tồn tại không? Có → đi nhánh trái." },
      { title: "Nén", description: "`tar` gom cả thư mục vào một file .tar.gz có ngày tháng trong tên — như đóng thùng hàng có dán nhãn ngày." },
      { title: "Dọn dẹp", description: "Chỉ giữ 7 bản mới nhất, xoá bản cũ để ổ đĩa không đầy." },
      { title: "Xong", description: "Script thoát với exit code 0 = thành công. Cron/systemd biết mọi thứ ổn." },
    ],
  },
  "missing-folder": {
    path: ["start", "check", "failure"],
    steps: [
      { title: "Chạy script", description: "Script bắt đầu như bình thường." },
      { title: "Kiểm tra", description: "Thư mục nguồn KHÔNG tồn tại (có thể bị xoá nhầm hoặc gõ sai đường dẫn)." },
      { title: "Dừng an toàn", description: "In lỗi ra stderr (`>&2`) và `exit 1`. Exit code khác 0 giúp hệ thống giám sát biết là có chuyện — thay vì âm thầm tạo file backup rỗng." },
    ],
  },
};

export function BackupScriptFlowDiagram() {
  const [scenario, setScenario] = useState<Scenario>("success");
  const { path, steps } = scenarioPaths[scenario];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["success", "missing-folder"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setScenario(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              scenario === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "success" ? "Kịch bản: mọi thứ ổn" : "Kịch bản: thiếu thư mục"}
          </button>
        ))}
      </div>
      <StepDiagram key={scenario} title="Luồng chạy của backup.sh" viewBox="0 0 720 330" steps={steps}>
        {(step) => (
          <>
            <DiagramArrow from={[360, 64]} to={[360, 86]} tone="slate" dimmed={step < 1} />
            <DiagramArrow from={[300, 144]} to={[160, 176]} tone="green" label="có" dimmed={!path.includes("archive") || step < 2} />
            <DiagramArrow from={[420, 144]} to={[570, 176]} tone="rose" label="không" dimmed={!path.includes("failure") || step < 2} />
            <DiagramArrow from={[155, 234]} to={[155, 258]} tone="slate" dimmed={!path.includes("cleanup") || step < 3} />
            <DiagramArrow from={[282, 290]} to={[316, 290]} tone="slate" dimmed={!path.includes("done") || step < 4} />
            {Object.entries(nodes).map(([id, node]) => {
              const position = path.indexOf(id);
              const state = position === step ? "active" : position !== -1 && position < step ? "normal" : "dimmed";
              return <DiagramNode key={id} x={node.x} y={node.y} width={node.width} height={54} label={node.label} sublabel={node.sublabel} tone={node.tone} state={state} />;
            })}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
