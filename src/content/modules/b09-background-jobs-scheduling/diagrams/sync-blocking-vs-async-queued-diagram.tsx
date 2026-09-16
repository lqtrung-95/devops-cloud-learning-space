"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Mode = "blocking" | "queued";

const copy: Record<
  Mode,
  { latency: string; tone: "rose" | "green"; verdict: string; workLabel: string }
> = {
  blocking: {
    latency: "~230ms",
    tone: "rose",
    workLabel: "Ghi activity_logs + tạo notification NGAY trong request",
    verdict:
      "Client phải đợi đủ: update task + insert activity_logs + insert notifications rồi mới nhận response. Nếu bước ghi notification chậm (email, push...), toàn bộ request chậm theo.",
  },
  queued: {
    latency: "~12ms",
    tone: "green",
    workLabel: "Chỉ enqueue một job rồi trả response ngay",
    verdict:
      "Client nhận response ngay sau khi update task + đẩy job vào Redis (rất nhanh). Việc ghi activity_logs/notifications xảy ra sau đó, trong process `worker` riêng — client không biết và không cần biết.",
  },
};

/** Toggle between handling a task-status-change request synchronously vs. via a queue. */
export function SyncBlockingVsAsyncQueuedDiagram() {
  const [mode, setMode] = useState<Mode>("blocking");
  const scenario = copy[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["blocking", "queued"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "blocking" ? "Xử lý đồng bộ (blocking)" : "Đẩy vào hàng đợi (queued)"}
          </button>
        ))}
      </div>
      <DiagramFrame title={`PATCH /api/v1/tasks/:id — response mất ${scenario.latency}`} viewBox="0 0 720 280" caption={scenario.verdict}>
        <DiagramNode x={16} y={100} width={140} height={70} label="Client" sublabel="curl / app" emoji="💻" tone="violet" />
        <DiagramNode x={220} y={100} width={170} height={70} label="taskflow-api" sublabel="Fastify handler" emoji="🛡️" tone="blue" state="active" />

        {mode === "blocking" ? (
          <>
            <DiagramNode x={460} y={20} width={230} height={60} label="UPDATE tasks SET status" sublabel="Postgres" tone="blue" />
            <DiagramNode x={460} y={100} width={230} height={60} label={scenario.workLabel} sublabel="chạy tuần tự, cùng request" tone="rose" state="active" />
            <DiagramNode x={460} y={180} width={230} height={60} label="📧 Gửi email/notification" sublabel="I/O chậm, không kiểm soát được" tone="rose" />
            <DiagramArrow from={[156, 130]} to={[218, 130]} tone="violet" animated label="PATCH status=done" />
            <DiagramArrow from={[390, 60]} to={[458, 60]} curve={0} tone="blue" label="1" />
            <DiagramArrow from={[390, 130]} to={[458, 130]} tone="rose" label="2" />
            <DiagramArrow from={[390, 130]} to={[458, 210]} curve={30} tone="rose" label="3" />
            <DiagramArrow from={[218, 245]} to={[156, 245]} tone="rose" label={`response sau ${scenario.latency}`} />
          </>
        ) : (
          <>
            <DiagramNode x={460} y={20} width={230} height={60} label="UPDATE tasks SET status" sublabel="Postgres" tone="blue" />
            <DiagramNode x={460} y={100} width={230} height={60} label={scenario.workLabel} sublabel="jobsQueue.add(...) — không await" tone="green" state="active" />
            <DiagramNode x={460} y={180} width={230} height={60} label="🧑‍🍳 worker xử lý sau" sublabel="process riêng, đọc job từ Redis" tone="amber" dashed />
            <DiagramArrow from={[156, 130]} to={[218, 130]} tone="violet" animated label="PATCH status=done" />
            <DiagramArrow from={[390, 60]} to={[458, 60]} tone="blue" label="1" />
            <DiagramArrow from={[390, 130]} to={[458, 130]} tone="green" label="2 (nhanh, chỉ ghi Redis)" />
            <DiagramArrow from={[218, 245]} to={[156, 245]} tone="green" animated label={`response sau ${scenario.latency}`} />
            <DiagramArrow from={[575, 160]} to={[575, 178]} tone="amber" dimmed label="job chạy sau, không chặn response" />
          </>
        )}
      </DiagramFrame>
    </div>
  );
}
