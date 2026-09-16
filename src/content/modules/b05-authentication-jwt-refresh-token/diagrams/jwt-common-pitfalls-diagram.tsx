"use client";

import { useState } from "react";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

interface Pitfall {
  id: string;
  title: string;
  bad: string;
  good: string;
}

const pitfalls: Pitfall[] = [
  {
    id: "payload",
    title: "Payload chứa gì",
    bad: '{ sub, email, "creditCard": "4111…" }',
    good: '{ sub, iat, exp } — chỉ đủ định danh',
  },
  {
    id: "expiry",
    title: "Thời hạn (exp)",
    bad: "Không set exp → token sống mãi mãi",
    good: "exp = 15 phút, luôn verify cả exp",
  },
  {
    id: "algorithm",
    title: "Thuật toán ký",
    bad: 'Chấp nhận alg: "none" từ client gửi lên',
    good: "Server tự chọn cứng alg (HS256), không tin client",
  },
  {
    id: "revocation",
    title: "Thu hồi khi cần",
    bad: "Tin access token tới khi hết hạn, không cách nào chặn sớm",
    good: "Refresh token lưu DB, revoke được — access token ngắn hạn để giảm rủi ro",
  },
];

export function JwtCommonPitfallsDiagram() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <DiagramFrame
      title="Bấm từng ô để xem sai lầm JWT thường gặp — và cách sửa"
      viewBox="0 0 720 260"
      caption="Bấm vào từng thẻ 'Sai' để lật sang cách làm đúng. Đây là 4 lỗi JWT phổ biến nhất trong review code thật."
    >
      {pitfalls.map((pitfall, index) => {
        const x = 16 + index * 176;
        const isRevealed = revealed[pitfall.id];
        return (
          <g key={pitfall.id}>
            <DiagramNode x={x} y={16} width={160} height={34} label={pitfall.title} tone="slate" />
            <DiagramNode
              x={x}
              y={60}
              width={160}
              height={90}
              label={isRevealed ? "✅ Đúng" : "❌ Sai — bấm để xem"}
              sublabel={isRevealed ? pitfall.good : pitfall.bad}
              tone={isRevealed ? "green" : "rose"}
              state="active"
              onClick={() => setRevealed((current) => ({ ...current, [pitfall.id]: !current[pitfall.id] }))}
            />
          </g>
        );
      })}
    </DiagramFrame>
  );
}
