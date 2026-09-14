"use client";

import clsx from "clsx";
import { useState } from "react";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";
import { SequenceMessageLanes, type SequenceMessage } from "./sequence-message-lanes";

type Protocol = "tcp" | "udp";

interface ProtocolScenario {
  clientLabel: string;
  serverLabel: string;
  clientStates: string[];
  serverStates: string[];
  activeSides: ("left" | "right" | "both")[];
  messages: SequenceMessage[];
  steps: DiagramStep[];
}

const scenarios: Record<Protocol, ProtocolScenario> = {
  tcp: {
    clientLabel: "10.0.1.5:51514",
    serverLabel: "10.0.1.25:443",
    clientStates: ["CLOSED", "SYN_SENT", "SYN_SENT", "ESTABLISHED", "ESTABLISHED", "FIN_WAIT → CLOSED"],
    serverStates: ["LISTEN", "LISTEN", "SYN_RECEIVED", "ESTABLISHED", "ESTABLISHED", "CLOSE_WAIT → CLOSED"],
    activeSides: ["right", "left", "right", "left", "both", "both"],
    messages: [
      { step: 1, direction: "right", label: "SYN  seq=100", tone: "violet" },
      { step: 2, direction: "left", label: "SYN-ACK  seq=300 ack=101", tone: "blue" },
      { step: 3, direction: "right", label: "ACK  ack=301", tone: "green" },
      { step: 4, direction: "right", label: "dữ liệu: GET / (seq=101)", tone: "amber" },
      { step: 4, direction: "left", label: "ACK + dữ liệu trả về", tone: "amber" },
      { step: 5, direction: "right", label: "FIN", tone: "rose" },
      { step: 5, direction: "left", label: "ACK, FIN (rồi client ACK lần cuối)", tone: "rose" },
    ],
    steps: [
      { title: "Server lắng nghe", description: "Server đã `listen` ở cổng 443 (trạng thái LISTEN). Client được hệ điều hành cấp một cổng tạm (ephemeral port) 51514 — như số phòng tạm để nhận thư trả lời." },
      { title: "SYN", description: "Client gửi SYN kèm số thứ tự ngẫu nhiên seq=100: 'Alo, nghe rõ không? Tôi sẽ đánh số từ 100'." },
      { title: "SYN-ACK", description: "Server trả SYN-ACK: 'Nghe rõ (ack=101 = tôi chờ byte tiếp theo là 101), tôi đánh số từ 300'." },
      { title: "ACK → ESTABLISHED", description: "Client gửi ACK ack=301. Xong 3-way handshake: hai bên đã thống nhất số thứ tự, kết nối ESTABLISHED." },
      { title: "Truyền dữ liệu", description: "Mỗi đoạn dữ liệu đều được đánh số và phải được ACK. Gói nào mất (không thấy ACK) sẽ được gửi lại — nên TCP đảm bảo đủ và đúng thứ tự." },
      { title: "Đóng kết nối", description: "Bên muốn đóng gửi FIN, bên kia ACK rồi cũng gửi FIN của mình. Thực tế là 4 gói (FIN, ACK, FIN, ACK); bên đóng trước còn chờ TIME_WAIT một lúc." },
    ],
  },
  udp: {
    clientLabel: "10.0.1.5:40213",
    serverLabel: "10.0.0.2:53",
    clientStates: ["không có kết nối", "đã gửi, chờ", "hết thời gian chờ", "đã gửi lại", "nhận được ✅"],
    serverStates: ["chờ ở cổng 53", "…", "…", "xử lý truy vấn", "đã trả lời"],
    activeSides: ["right", "left", "left", "left", "right"],
    messages: [
      { step: 1, direction: "right", label: "Query: app.example.com A? (gói bị mất ✗)", tone: "rose" },
      { step: 3, direction: "right", label: "Query lần 2 (app tự gửi lại)", tone: "violet" },
      { step: 4, direction: "left", label: "Answer: 203.0.113.10", tone: "green" },
    ],
    steps: [
      { title: "Không bắt tay", description: "UDP không có handshake, không có trạng thái kết nối. Client chỉ việc 'ném' datagram tới IP:port đích." },
      { title: "Gửi datagram", description: "Client gửi truy vấn DNS qua UDP cổng 53. Không may gói này bị rơi trên đường." },
      { title: "UDP không báo gì", description: "UDP không ACK, không gửi lại. Tầng UDP im lặng — chính ứng dụng (DNS client) phải tự đếm thời gian chờ." },
      { title: "App tự thử lại", description: "Hết timeout, DNS client tự gửi lại truy vấn. Logic 'thử lại' nằm ở ứng dụng, không nằm ở giao thức." },
      { title: "Nhận trả lời", description: "Lần này trả lời về tới nơi. Đổi lại việc 'không đảm bảo', UDP nhẹ và nhanh — hợp với DNS, video call, game, và QUIC (HTTP/3)." },
    ],
  },
};

export function TcpVsUdpHandshakeDiagram() {
  const [protocol, setProtocol] = useState<Protocol>("tcp");
  const scenario = scenarios[protocol];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["tcp", "udp"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setProtocol(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              protocol === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "tcp" ? "📞 TCP: gọi điện có xác nhận" : "📮 UDP: ném thư không cần hồi âm"}
          </button>
        ))}
      </div>
      <StepDiagram key={protocol} title={protocol === "tcp" ? "TCP 3-way handshake & truyền dữ liệu" : "UDP: gửi thẳng, mất thì ứng dụng tự lo"} viewBox="0 0 720 350" steps={scenario.steps}>
        {(step) => (
          <SequenceMessageLanes
            left={{ label: `Client ${scenario.clientLabel}`, sublabel: scenario.clientStates[step], emoji: "💻", tone: "violet" }}
            right={{ label: `Server ${scenario.serverLabel}`, sublabel: scenario.serverStates[step], emoji: "🖥️", tone: "blue" }}
            messages={scenario.messages}
            step={step}
            activeSide={scenario.activeSides[step]}
            height={350}
          />
        )}
      </StepDiagram>
    </div>
  );
}
