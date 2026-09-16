"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Mode = "sync" | "async";

const copy: Record<
  Mode,
  { latency: string; coupling: string; tone: "rose" | "green"; verdict: string }
> = {
  sync: {
    latency: "phụ thuộc notification-service",
    coupling: "chặt (tight coupling)",
    tone: "rose",
    verdict:
      "`POST comment` chỉ trả response SAU KHI gRPC `SendNotification` trả lời. Nếu `notification-service` down hoặc chậm, request tạo comment — chức năng chính người dùng đang chờ — cũng chậm/lỗi theo, dù việc tạo comment tự nó chẳng liên quan gì tới việc gửi thông báo.",
  },
  async: {
    latency: "~2 giây (chu kỳ poll relay)",
    coupling: "lỏng (loose coupling qua outbox)",
    tone: "green",
    verdict:
      "`POST comment` trả response ngay sau khi transaction Postgres commit — không biết và không quan tâm `notification-service` có đang sống hay không. Relay gửi đi sau, độc lập, với độ trễ nhỏ đổi lại được sự chịu lỗi.",
  },
};

/** Compare request/response (direct gRPC call in the request) vs event-driven (outbox + relay) for the comment-notification use case. */
export function EventDrivenVsRequestResponseDiagram() {
  const [mode, setMode] = useState<Mode>("sync");
  const scenario = copy[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["sync", "async"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "sync" ? "Request/response (gRPC trực tiếp)" : "Event-driven (outbox + relay)"}
          </button>
        ))}
      </div>
      <DiagramFrame
        title={`Độ trễ notification: ${scenario.latency} · Coupling: ${scenario.coupling}`}
        viewBox="0 0 720 260"
        caption={scenario.verdict}
      >
        <DiagramNode x={16} y={100} width={130} height={60} label="Client" sublabel="tạo comment" emoji="💻" tone="violet" />
        <DiagramNode x={200} y={100} width={160} height={60} label="api" sublabel="POST .../comments" tone="blue" state="active" />

        {mode === "sync" ? (
          <>
            <DiagramNode x={420} y={20} width={210} height={60} label="notification-service" sublabel="gRPC SendNotification" emoji="📡" tone="rose" />
            <DiagramArrow from={[146, 130]} to={[198, 130]} tone="violet" animated label="tạo comment" />
            <DiagramArrow from={[360, 110]} to={[418, 60]} tone="rose" animated label="gọi gRPC, ĐỢI trả lời" />
            <DiagramArrow from={[418, 70]} to={[360, 120]} tone="rose" dimmed label="chậm/lỗi → kéo theo request chính" />
            <DiagramArrow from={[200, 190]} to={[146, 190]} tone="rose" label={`response sau khi biết kết quả gRPC`} />
          </>
        ) : (
          <>
            <DiagramNode x={420} y={20} width={210} height={60} label="Postgres: outbox" sublabel="published_at = NULL" tone="green" state="active" />
            <DiagramNode x={420} y={110} width={210} height={50} label="🚚 relay (worker)" sublabel="poll độc lập" tone="amber" />
            <DiagramNode x={420} y={190} width={210} height={55} label="notification-service" sublabel="nhận sau ~2s" emoji="📬" tone="green" />
            <DiagramArrow from={[146, 130]} to={[198, 130]} tone="violet" animated label="tạo comment" />
            <DiagramArrow from={[360, 110]} to={[418, 50]} tone="green" animated label="cùng transaction" />
            <DiagramArrow from={[200, 190]} to={[146, 190]} tone="green" animated label="response ngay, không đợi notification" />
            <DiagramArrow from={[525, 80]} to={[525, 108]} tone="amber" animated />
            <DiagramArrow from={[525, 160]} to={[525, 188]} tone="green" animated />
          </>
        )}
      </DiagramFrame>
    </div>
  );
}
