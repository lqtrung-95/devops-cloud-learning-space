"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Mode = "unary" | "streaming";

const copy: Record<Mode, { title: string; verdict: string }> = {
  unary: {
    title: "SendNotification — unary RPC: 1 request → đúng 1 response",
    verdict:
      "`rpc SendNotification (SendNotificationRequest) returns (SendNotificationResponse)` — giống một hàm gọi bình thường: gửi 1 message, đợi đúng 1 message trả về rồi kết thúc. Đây là hình dạng RPC phổ biến nhất, tương đương REST request/response.",
  },
  streaming: {
    title: "StreamNotifications — server-streaming RPC: 1 request → NHIỀU response",
    verdict:
      "`rpc StreamNotifications (StreamNotificationsRequest) returns (stream Notification)` — client gửi 1 request duy nhất (ví dụ `userId`), nhưng connection giữ mở và server đẩy nhiều `Notification` xuống theo thời gian, cho tới khi server tự đóng stream. Đây là ý tưởng đứng sau việc đẩy notification realtime (khái niệm liên quan tới SSE ở B11) — module này chỉ định nghĩa RPC, chưa nối vào SSE thật.",
  },
};

/** Toggle between the request/response shape of a unary RPC and a server-streaming RPC. */
export function UnaryVsServerStreamingRpcShapeDiagram() {
  const [mode, setMode] = useState<Mode>("unary");
  const scenario = copy[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["unary", "streaming"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "unary" ? "Unary — SendNotification" : "Server-streaming — StreamNotifications"}
          </button>
        ))}
      </div>
      <DiagramFrame title={scenario.title} viewBox="0 0 720 300" caption={scenario.verdict}>
        <DiagramNode x={20} y={120} width={150} height={70} label="worker (client)" tone="blue" state="active" />
        <DiagramNode x={550} y={120} width={150} height={70} label="notification-service" tone="violet" />

        {mode === "unary" ? (
          <>
            <DiagramArrow from={[172, 145]} to={[548, 145]} tone="blue" animated label="1× SendNotificationRequest" />
            <DiagramArrow from={[548, 175]} to={[172, 175]} tone="green" animated label="1× SendNotificationResponse" />
            <DiagramLabel x={360} y={230} text="Connection đóng ngay sau khi có response — giống 1 lần gọi hàm." size={12} />
          </>
        ) : (
          <>
            <DiagramArrow from={[172, 145]} to={[548, 145]} tone="blue" animated label="1× StreamNotificationsRequest" />
            <DiagramArrow from={[548, 190]} to={[172, 190]} tone="green" animated label="Notification #1" />
            <DiagramArrow from={[548, 215]} to={[172, 215]} tone="green" animated label="Notification #2" />
            <DiagramArrow from={[548, 240]} to={[172, 240]} tone="green" dimmed label="Notification #N … tới khi server đóng stream" />
            <DiagramLabel x={360} y={278} text="Một connection HTTP/2 duy nhất, giữ mở, nhiều message chảy theo 1 chiều." size={12} />
          </>
        )}
      </DiagramFrame>
    </div>
  );
}
