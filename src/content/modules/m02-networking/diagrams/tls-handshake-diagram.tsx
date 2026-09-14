"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";
import { SequenceMessageLanes, type SequenceMessage } from "./sequence-message-lanes";

type Mode = "http" | "https";

interface ModeScenario {
  messages: SequenceMessage[];
  steps: DiagramStep[];
  /** What a person sniffing Wi-Fi traffic can read at each step. */
  eavesdropper: string[];
  activeSides: ("left" | "right" | "both")[];
}

const scenarios: Record<Mode, ModeScenario> = {
  http: {
    activeSides: ["both", "left", "right"],
    messages: [
      { step: 0, direction: "right", label: "TCP SYN → SYN-ACK → ACK (cổng 80)", tone: "slate" },
      { step: 1, direction: "right", label: "POST /login  password=hunter2", tone: "rose" },
      { step: 2, direction: "left", label: "200 OK  Set-Cookie: session=abc123", tone: "rose" },
    ],
    eavesdropper: ["IP + cổng 80 của hai bên", "TOÀN BỘ: URL, header, mật khẩu hunter2 😱", "TOÀN BỘ: cookie session → giả mạo được bạn"],
    steps: [
      { title: "TCP handshake", description: "Sau khi DNS trả IP, client mở kết nối TCP tới cổng 80. Chưa có mã hoá nào cả." },
      { title: "Gửi request", description: "Request HTTP là văn bản thuần. Ai đứng giữa đường (Wi-Fi quán cà phê, router bị chiếm) đọc được cả URL, header và mật khẩu." },
      { title: "Nhận response", description: "Response cũng là văn bản thuần: kẻ nghe lén lấy được cookie session, thậm chí sửa nội dung trả về (chèn quảng cáo, mã độc)." },
    ],
  },
  https: {
    activeSides: ["both", "left", "right", "left", "left", "both"],
    messages: [
      { step: 0, direction: "right", label: "TCP handshake (cổng 443)", tone: "slate" },
      { step: 1, direction: "right", label: "ClientHello: TLS 1.3, SNI, key_share", tone: "violet" },
      { step: 2, direction: "left", label: "ServerHello + key_share", tone: "blue" },
      { step: 2, direction: "left", label: "🔒 Certificate, CertificateVerify, Finished", tone: "blue" },
      { step: 4, direction: "right", label: "🔒 Finished", tone: "green" },
      { step: 5, direction: "right", label: "🔒 POST /login (mã hoá)", tone: "green" },
      { step: 5, direction: "left", label: "🔒 200 OK (mã hoá)", tone: "green" },
    ],
    eavesdropper: [
      "IP + cổng 443",
      "Tên miền trong SNI (app.example.com) — chưa mã hoá",
      "Chỉ thấy dữ liệu đã mã hoá sau ServerHello",
      "Không thấy gì mới — client đang tự kiểm tra",
      "Không đọc được, không sửa được",
      "Thấy kích thước & thời điểm, KHÔNG thấy nội dung",
    ],
    steps: [
      { title: "TCP handshake", description: "Vẫn cần TCP 3-way handshake trước, lần này tới cổng 443." },
      { title: "ClientHello", description: "Client gửi: phiên bản TLS hỗ trợ, danh sách cipher suite, SNI (tên miền muốn vào — để server biết trả cert nào) và `key_share` (nửa khoá Diffie-Hellman)." },
      { title: "ServerHello + cert", description: "Server chọn cipher, gửi `key_share` của mình. Hai bên đã tính được khoá phiên chung — từ đây mọi thứ được mã hoá, kể cả certificate và chữ ký CertificateVerify." },
      { title: "Kiểm tra chain", description: "Client kiểm tra: cert có đúng tên miền không, còn hạn không, và được ký bởi intermediate → root CA nằm trong trust store của máy không. Sai một điểm là trình duyệt báo lỗi." },
      { title: "Finished", description: "Client gửi Finished để xác nhận handshake không bị ai chen vào sửa. TLS 1.3 chỉ tốn 1 vòng đi-về (1-RTT); TLS 1.2 cần 2." },
      { title: "HTTP qua TLS", description: "Request/response HTTP (thường HTTP/2, thoả thuận qua ALPN) đi trong đường hầm mã hoá. Kẻ nghe lén chỉ thấy các khối dữ liệu vô nghĩa." },
    ],
  },
};

export function TlsHandshakeDiagram() {
  const [mode, setMode] = useState<Mode>("https");
  const scenario = scenarios[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["http", "https"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "http" ? "📬 HTTP: bưu thiếp" : "🔐 HTTPS: phong bì niêm phong"}
          </button>
        ))}
      </div>
      <StepDiagram key={mode} title={mode === "https" ? "HTTPS: TLS 1.3 handshake rồi mới gửi HTTP" : "HTTP thuần: ai trên đường cũng đọc được"} viewBox="0 0 720 390" steps={scenario.steps}>
        {(step) => (
          <>
            <SequenceMessageLanes
              left={{ label: "Trình duyệt", sublabel: "client", emoji: "💻", tone: "violet" }}
              right={{ label: "app.example.com", sublabel: mode === "https" ? "Nginx :443" : "Nginx :80", emoji: "🖥️", tone: "blue" }}
              messages={scenario.messages}
              step={step}
              activeSide={scenario.activeSides[step]}
              height={300}
              firstMessageY={112}
              messageGap={30}
            />
            {mode === "https" && step === 3 && (
              <>
                <DiagramNode x={135} y={250} width={130} height={40} label="📄 Leaf cert" tone="green" state="active" />
                <DiagramNode x={295} y={250} width={130} height={40} label="🏢 Intermediate" tone="amber" state="active" />
                <DiagramNode x={455} y={250} width={130} height={40} label="🏛️ Root CA" tone="violet" state="active" />
                <DiagramLabel x={280} y={242} text="ký bởi →" size={11} />
                <DiagramLabel x={440} y={242} text="ký bởi →" size={11} />
              </>
            )}
            <DiagramNode
              x={10}
              y={316}
              width={700}
              height={62}
              label={`🕵️ Kẻ nghe lén thấy: ${scenario.eavesdropper[step]}`}
              sublabel={mode === "https" ? "TLS bảo vệ nội dung, không giấu IP/tên miền" : "HTTP = bưu thiếp, ai cầm cũng đọc"}
              tone={mode === "https" ? "green" : "rose"}
            />
          </>
        )}
      </StepDiagram>
    </div>
  );
}
