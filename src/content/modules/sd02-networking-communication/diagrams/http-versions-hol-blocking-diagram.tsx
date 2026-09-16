"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Protocol = "http1" | "http2" | "http3";

const resourceTone: Record<string, DiagramTone> = { A: "blue", B: "amber", C: "green" };

const lanes: Record<Protocol, { name: string; frames: string[] }[]> = {
  http1: [
    { name: "TCP #1", frames: ["A1", "A2", "B1", "B2"] },
    { name: "TCP #2", frames: ["C1", "C2"] },
  ],
  http2: [{ name: "1 TCP connection", frames: ["A1", "B1", "C1", "A2", "B2", "C2"] }],
  http3: [{ name: "1 QUIC connection (UDP)", frames: ["A1", "B1", "C1", "A2", "B2", "C2"] }],
};

const protocolLabels: Record<Protocol, string> = { http1: "HTTP/1.1", http2: "HTTP/2", http3: "HTTP/3" };

const explanations: Record<Protocol, { normal: string; loss: string }> = {
  http1: {
    normal: "Mỗi connection chỉ xử lý một request tại một thời điểm: B phải đợi A xong (HOL ở tầng HTTP). Trình duyệt bù lại bằng cách mở nhiều connection song song mỗi host (thường cỡ 6).",
    loss: "Mất gói A2: TCP #1 dừng chờ gửi lại, B vốn xếp hàng sau A cũng kẹt. C ở TCP #2 không bị ảnh hưởng — nhưng mỗi connection lại tốn thêm bắt tay TCP + TLS.",
  },
  http2: {
    normal: "Multiplexing: A, B, C được cắt thành frame và xen kẽ trên một TCP connection — hết HOL ở tầng HTTP, ít bắt tay, header được nén (HPACK).",
    loss: "Mất gói A2: TCP bắt buộc giao byte đúng thứ tự, nên B2 và C2 dù đã tới nơi vẫn bị giữ trong buffer tới khi A2 được gửi lại. HOL chuyển xuống tầng TCP và ảnh hưởng MỌI stream.",
  },
  http3: {
    normal: "QUIC chạy trên UDP, tự lo tin cậy và thứ tự theo TỪNG stream; TLS 1.3 tích hợp sẵn nên bắt tay gộp lại (có thể 0-RTT khi nối lại).",
    loss: "Mất gói A2: chỉ stream A chờ gửi lại. B2 và C2 được giao cho ứng dụng ngay — mạng di động mất gói nhiều là nơi HTTP/3 thể hiện rõ nhất.",
  },
};

function frameState(protocol: Protocol, frame: string, lossEnabled: boolean): "lost" | "blocked" | "ok" {
  if (!lossEnabled) return "ok";
  if (frame === "A2") return "lost";
  if (protocol === "http1" && frame.startsWith("B")) return "blocked";
  if (protocol === "http2" && (frame === "B2" || frame === "C2")) return "blocked";
  return "ok";
}

export function HttpVersionsHolBlockingDiagram() {
  const [protocol, setProtocol] = useState<Protocol>("http2");
  const [lossEnabled, setLossEnabled] = useState(false);
  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="Ba file A, B, C trên cùng một trang — đổi protocol, rồi làm mất một gói"
      viewBox="0 0 720 260"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(protocolLabels) as Protocol[]).map((key) => (
              <button key={key} type="button" onClick={() => setProtocol(key)} className={pill(key === protocol)}>
                {protocolLabels[key]}
              </button>
            ))}
            <button type="button" onClick={() => setLossEnabled(!lossEnabled)} className={pill(lossEnabled)}>
              {lossEnabled ? "💥 Đang mất gói A2" : "📶 Mạng tốt — bấm để mất gói A2"}
            </button>
          </div>
          <p aria-live="polite" className="leading-relaxed text-stone-700 dark:text-stone-300">
            {lossEnabled ? explanations[protocol].loss : explanations[protocol].normal}
          </p>
        </div>
      }
      caption="Head-of-line blocking = một phần tử đứng đầu hàng bị kẹt làm cả hàng phía sau phải chờ. Mỗi phiên bản HTTP dời nó xuống một tầng thấp hơn, và HTTP/3 chia hàng theo từng stream."
    >
      <DiagramNode x={10} y={80} width={100} height={90} label="Browser" emoji="🌐" tone="violet" />
      <DiagramNode x={610} y={80} width={100} height={90} label="Server" emoji="🖥️" tone="slate" />
      {lanes[protocol].map((lane, laneIndex) => {
        const laneCount = lanes[protocol].length;
        const y = laneCount === 1 ? 70 : 20 + laneIndex * 110;
        return (
          <DiagramGroupBox key={lane.name} x={125} y={y} width={470} height={100} label={lane.name} tone={protocol === "http3" ? "cyan" : "slate"}>
            {lane.frames.map((frame, index) => {
              const state = frameState(protocol, frame, lossEnabled);
              return (
                <g key={frame}>
                  <DiagramNode
                    x={140 + index * 74}
                    y={y + 36}
                    width={64}
                    height={40}
                    rounded={8}
                    label={state === "lost" ? `✗ ${frame}` : frame}
                    tone={state === "lost" ? "rose" : resourceTone[frame[0]]}
                    state={state === "blocked" ? "dimmed" : state === "lost" ? "active" : "normal"}
                    dashed={state === "lost"}
                  />
                  {state === "blocked" && <DiagramLabel x={172 + index * 74} y={y + 92} text="⏳ chờ" size={11} tone="amber" bold />}
                  {state === "lost" && <DiagramLabel x={172 + index * 74} y={y + 92} text="gửi lại" size={11} tone="rose" bold />}
                </g>
              );
            })}
          </DiagramGroupBox>
        );
      })}
      <DiagramLabel x={360} y={250} text="A = style.css · B = app.js · C = logo.png (mỗi file 2 frame/gói)" size={12} />
    </DiagramFrame>
  );
}
