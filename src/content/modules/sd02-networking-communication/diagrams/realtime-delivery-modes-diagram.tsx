"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { InlineCodeText } from "@/components/ui/inline-code-text";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Mode = "polling" | "long-polling" | "sse" | "websocket";

const EVENTS = [1.5, 4.2, 8.2]; // thời điểm server có giá mới (giây)
const DURATION = 12;
const X0 = 130;
const X1 = 690;
const SERVER_Y = 58;
const CLIENT_Y = 196;
const x = (seconds: number) => X0 + (seconds / DURATION) * (X1 - X0);

interface ModeInfo {
  label: string;
  /** Request ticks (polling) or held request spans (long polling). */
  requests: [number, number][];
  deliveries: [number, number][];
  metrics: string;
  note: string;
}

const modes: Record<Mode, ModeInfo> = {
  polling: {
    label: "🔁 Short polling (3s)",
    requests: [0, 3, 6, 9, 12].map((t): [number, number] => [t, t]),
    deliveries: [[1.5, 3], [4.2, 6], [8.2, 9]],
    metrics: "5 HTTP request · 2 response rỗng · trễ trung bình ~1,4s",
    note: "Đơn giản nhất, chạy qua mọi proxy/cache. Nhưng độ trễ = tới lần hỏi kế tiếp, và phần lớn request trả về 'không có gì mới'. Giảm interval ⇒ nhiều request hơn tuyến tính.",
  },
  "long-polling": {
    label: "⏳ Long polling",
    requests: [[0, 1.5], [1.5, 4.2], [4.2, 8.2], [8.2, 12]],
    deliveries: [[1.5, 1.5], [4.2, 4.2], [8.2, 8.2]],
    metrics: "4 HTTP request · gần như không rỗng · trễ ~0 (+ thời gian mở request mới)",
    note: "Server giữ request tới khi có dữ liệu (hoặc timeout) rồi mới trả; client lập tức hỏi lại. Trễ thấp, vẫn là HTTP thường — nhưng mỗi update tốn một request và server phải giữ nhiều request treo.",
  },
  sse: {
    label: "📻 Server-Sent Events",
    requests: [[0, 12]],
    deliveries: [[1.5, 1.5], [4.2, 4.2], [8.2, 8.2]],
    metrics: "1 HTTP response kéo dài · trễ ~0 · một chiều server → client",
    note: "Một response `text/event-stream` không bao giờ đóng; server ghi `data: ...` mỗi khi có tin. Trình duyệt (EventSource) tự nối lại và gửi `Last-Event-ID`. Client muốn gửi gì thì dùng request HTTP riêng.",
  },
  websocket: {
    label: "📞 WebSocket",
    requests: [[0, 12]],
    deliveries: [[1.5, 1.5], [4.2, 4.2], [8.2, 8.2]],
    metrics: "1 HTTP Upgrade rồi 1 kết nối full-duplex · trễ ~0 · hai chiều",
    note: "Bắt đầu bằng HTTP `Upgrade: websocket`, sau đó cả hai bên gửi message bất cứ lúc nào (mũi tên tím: client đổi mã theo dõi). Phải tự lo reconnect, heartbeat, ack — và load balancer phải hỗ trợ kết nối lâu.",
  },
};

export function RealtimeDeliveryModesDiagram() {
  const [mode, setMode] = useState<Mode>("polling");
  const info = modes[mode];

  return (
    <DiagramFrame
      title="Server có giá mới 3 lần trong 12 giây — client nhận được lúc nào, tốn bao nhiêu request?"
      viewBox="0 0 720 270"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(modes) as Mode[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  key === mode ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {modes[key].label}
              </button>
            ))}
          </div>
          <p className="font-semibold text-indigo-700 dark:text-indigo-300">{info.metrics}</p>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300"><InlineCodeText text={info.note} /></p>
        </div>
      }
      caption="Mũi tên xanh lá = lúc client thực sự nhận giá mới. Khoảng lệch ngang giữa chấm cam (server có tin) và đầu mũi tên chính là độ trễ nhận update."
    >
      <DiagramNode x={10} y={SERVER_Y - 24} width={100} height={48} label="Server" tone="slate" />
      <DiagramNode x={10} y={CLIENT_Y - 24} width={100} height={48} label="Client" tone="violet" />
      <line x1={X0} y1={SERVER_Y} x2={X1} y2={SERVER_Y} strokeWidth={2} className="stroke-stone-300 dark:stroke-stone-700" />
      <line x1={X0} y1={CLIENT_Y} x2={X1} y2={CLIENT_Y} strokeWidth={2} className="stroke-stone-300 dark:stroke-stone-700" />
      {[0, 3, 6, 9, 12].map((t) => (
        <DiagramLabel key={t} x={x(t)} y={258} text={`${t}s`} size={11} />
      ))}

      {EVENTS.map((t) => (
        <g key={t}>
          <circle cx={x(t)} cy={SERVER_Y} r={8} className="fill-amber-500 dark:fill-amber-400" />
          <DiagramLabel x={x(t)} y={SERVER_Y - 16} text="giá mới" size={11} tone="amber" bold />
        </g>
      ))}

      {mode === "polling" &&
        info.requests.map(([t]) => {
          const hasData = info.deliveries.some(([, delivered]) => delivered === t);
          return (
            <g key={t}>
              <DiagramArrow from={[x(t) - 6, CLIENT_Y - 10]} to={[x(t) - 6, SERVER_Y + 12]} tone="slate" />
              {!hasData && <DiagramLabel x={x(t) + 4} y={CLIENT_Y - 40} text="rỗng" anchor="start" size={11} tone="rose" />}
            </g>
          );
        })}

      {mode === "long-polling" &&
        info.requests.map(([start, end]) => (
          <DiagramNode key={start} x={x(start) + 2} y={112} width={x(end) - x(start) - 4} height={30} rounded={6} label="chờ…" tone="slate" dashed />
        ))}

      {(mode === "sse" || mode === "websocket") && (
        <DiagramNode
          x={X0}
          y={112}
          width={X1 - X0}
          height={30}
          rounded={6}
          label={mode === "sse" ? "1 response stream mở: text/event-stream" : "1 kết nối WebSocket full-duplex"}
          tone={mode === "sse" ? "cyan" : "blue"}
        />
      )}
      {mode === "websocket" && <DiagramArrow from={[x(6), CLIENT_Y - 10]} to={[x(6), 146]} tone="violet" label="subscribe FPT" />}

      {info.deliveries.map(([eventTime, deliveredAt]) => (
        <DiagramArrow key={eventTime} from={[x(deliveredAt) + 6, SERVER_Y + 12]} to={[x(deliveredAt) + 6, CLIENT_Y - 10]} tone="green" animated />
      ))}
    </DiagramFrame>
  );
}
