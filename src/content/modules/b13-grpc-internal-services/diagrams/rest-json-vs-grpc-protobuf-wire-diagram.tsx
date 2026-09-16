"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Mode = "rest" | "grpc";

const copy: Record<
  Mode,
  {
    bytesLabel: string;
    tone: "amber" | "green";
    frame: string;
    payload: string;
    verdict: string;
  }
> = {
  rest: {
    bytesLabel: "~180 bytes",
    tone: "amber",
    frame: "HTTP/1.1 text framing — header + body người đọc được",
    payload: '{"notificationId":"n_1","userId":"u_1","type":"task_status_changed","payloadJson":"{}"}',
    verdict:
      "JSON tự mô tả (key lặp lại trong mỗi request), HTTP/1.1 thường mở connection riêng mỗi lần gọi (hoặc dựa vào keep-alive). Dễ đọc bằng mắt, dễ `curl` tay — nhưng tốn byte hơn và không có contract bắt buộc (`api` gửi thiếu field, `notification-service` chỉ biết khi chạy).",
  },
  grpc: {
    bytesLabel: "~60 bytes",
    tone: "green",
    frame: "HTTP/2 binary framing — frame nhị phân, multiplex nhiều RPC trên 1 connection",
    payload: "0x0A 6E5F31 12 04 75 5F31 1A 14 ... (field number + wire type + giá trị, không kèm tên field)",
    verdict:
      "Protobuf mã hoá theo field NUMBER chứ không phải tên — không lặp lại chuỗi `\"notificationId\"` trong từng message. HTTP/2 cho phép nhiều RPC chạy song song trên cùng một connection (multiplexing). Chênh lệch byte ở 1 request nhỏ không quan trọng bằng thứ đứng sau: `.proto` là hợp đồng bắt buộc cả hai phía tuân theo.",
  },
};

/** Same internal call (worker → notification-service) encoded as REST/JSON vs gRPC/Protobuf. */
export function RestJsonVsGrpcProtobufWireDiagram() {
  const [mode, setMode] = useState<Mode>("rest");
  const scenario = copy[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["rest", "grpc"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "rest" ? "REST nội bộ (JSON qua HTTP/1.1)" : "gRPC nội bộ (Protobuf qua HTTP/2)"}
          </button>
        ))}
      </div>
      <DiagramFrame
        title={`worker gọi notification-service — cùng dữ liệu, ước lượng ${scenario.bytesLabel} trên dây`}
        viewBox="0 0 720 300"
        caption={scenario.verdict}
      >
        <DiagramNode x={16} y={110} width={140} height={70} label="worker" sublabel="taskflow-api" emoji="🧑‍🍳" tone="blue" state="active" />
        <DiagramNode x={290} y={110} width={150} height={70} label={mode === "rest" ? "HTTP/1.1" : "HTTP/2"} sublabel={scenario.frame} tone={scenario.tone} />
        <DiagramNode x={560} y={110} width={144} height={70} label="notification-service" sublabel="SendNotification" emoji="📨" tone="violet" />

        <DiagramArrow from={[156, 145]} to={[288, 145]} tone={scenario.tone} animated label="request" />
        <DiagramArrow from={[440, 145]} to={[558, 145]} tone={scenario.tone} animated />

        <DiagramLabel x={360} y={220} text="Payload thật gửi trên dây (rút gọn):" size={11.5} />
        <text x={360} y={245} textAnchor="middle" fontSize={10.5} className="fill-stone-700 dark:fill-stone-300">
          {scenario.payload.length > 70 ? `${scenario.payload.slice(0, 70)}…` : scenario.payload}
        </text>

        <DiagramArrow from={[560, 195]} to={[440, 195]} tone={scenario.tone} dimmed label="response" />
      </DiagramFrame>
    </div>
  );
}
