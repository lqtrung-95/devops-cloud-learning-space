"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Protocol = "sse" | "websocket";

const copy: Record<
  Protocol,
  { title: string; caption: string; serverToClientLabel: string; clientToServerLabel?: string; connectionLabel: string }
> = {
  sse: {
    title: "SSE — `EventSource`: một chiều server → client",
    caption:
      "`api` liên tục đẩy `data: ...` xuống qua một kết nối HTTP/1.1 giữ mở. Client không có kênh nào để gửi ngược lại trên cùng kết nối này — nếu cần gửi gì lên, client gọi một request HTTP bình thường khác (ví dụ `POST /comments`), tách biệt hoàn toàn khỏi stream.",
    serverToClientLabel: "data: {...}\\n\\n",
    connectionLabel: "GET /notifications/stream (giữ mở)",
  },
  websocket: {
    title: "WebSocket: hai chiều, cả hai phía đều gửi được",
    caption:
      "Sau bắt tay `Upgrade: websocket`, cả `api` lẫn client đều có thể chủ động gửi frame bất cứ lúc nào trên cùng một kết nối — mạnh hơn SSE, nhưng notification một chiều không cần tới khả năng đó. Dùng WebSocket ở đây là dùng dư quyền lực chỉ vì nó quen thuộc.",
    serverToClientLabel: "frame: {...}",
    clientToServerLabel: "frame: ping / ack",
    connectionLabel: "Upgrade: websocket",
  },
};

export function SseVsWebsocketComparisonDiagram() {
  const [protocol, setProtocol] = useState<Protocol>("sse");
  const active = copy[protocol];
  const isWs = protocol === "websocket";

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["sse", "websocket"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setProtocol(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              protocol === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "sse" ? "SSE (EventSource)" : "WebSocket"}
          </button>
        ))}
      </div>
      <DiagramFrame title={active.title} viewBox="0 0 720 300" caption={active.caption}>
        <DiagramNode x={40} y={110} width={160} height={80} label="Browser" sublabel={isWs ? "new WebSocket(url)" : "new EventSource(url)"} emoji="🖥️" tone="blue" state="active" />
        <DiagramNode x={520} y={110} width={160} height={80} label="api" sublabel="Fastify instance" emoji="🛰️" tone="violet" state="active" />

        <DiagramLabel x={360} y={70} text={active.connectionLabel} bold />
        <DiagramArrow from={[200, 130]} to={[518, 130]} tone="slate" animated />

        <DiagramArrow from={[518, 165]} to={[200, 165]} tone="green" animated label={active.serverToClientLabel} curve={isWs ? -18 : 0} />

        {isWs && <DiagramArrow from={[200, 195]} to={[518, 195]} tone="amber" animated label={active.clientToServerLabel} curve={18} />}

        {!isWs && <DiagramLabel x={360} y={230} text="Không có chiều ngược lại trên cùng kết nối này" tone="rose" />}

        <DiagramNode
          x={230}
          y={0}
          width={260}
          height={46}
          label={isWs ? "Cần: ping/pong thủ công, tự viết reconnect" : "Có sẵn: auto-reconnect + Last-Event-ID"}
          tone={isWs ? "amber" : "cyan"}
          state="normal"
          dashed
        />
      </DiagramFrame>
    </div>
  );
}
