"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type DepId = "postgres" | "jwt" | "clock" | "email" | "payment";

interface Dependency {
  label: string;
  x: number;
  y: number;
  verdict: "REAL" | "MOCK" | "TUỲ TEST";
  tone: DiagramTone;
  reason: string;
}

const deps: Record<DepId, Dependency> = {
  postgres: {
    label: "🐘 Postgres (test DB)",
    x: 30,
    y: 40,
    verdict: "REAL",
    tone: "green",
    reason: "DB không phải 'external ngoài tầm kiểm soát' — constraint, transaction, thứ tự lock chính là hành vi đang được test. Mock nó = chỉ test một cái mock tự bịa.",
  },
  jwt: {
    label: "🔑 @fastify/jwt (ký/verify)",
    x: 30,
    y: 210,
    verdict: "REAL",
    tone: "green",
    reason: "Ký và verify JWT là phép toán thuần (crypto), chạy trong process, không I/O mạng, không chậm — không có lý do gì để mock.",
  },
  clock: {
    label: "🕒 Đồng hồ hệ thống",
    x: 500,
    y: 40,
    verdict: "TUỲ TEST",
    tone: "amber",
    reason: "Bình thường dùng thời gian thật. Nhưng test 'access token hết hạn' hay 'refresh token quá 7 ngày' nên cố định thời gian (vi.useFakeTimers/truyền createdAt làm tham số) để không flaky theo đồng hồ máy chạy CI.",
  },
  email: {
    label: "📧 Email/SMTP provider",
    x: 500,
    y: 130,
    verdict: "MOCK",
    tone: "rose",
    reason: "Dịch vụ ngoài thật (sẽ xuất hiện ở module sau) — gọi thật sẽ gửi mail thật, tốn phí, có rate limit và độ trễ mạng không kiểm soát được. Đúng định nghĩa 'genuinely outside your control'.",
  },
  payment: {
    label: "💳 Payment gateway (PSP)",
    x: 500,
    y: 220,
    verdict: "MOCK",
    tone: "rose",
    reason: "Cùng lý do với email: tiền thật, phụ thuộc bên thứ ba, không nên chạy thật trong một test chạy hàng trăm lần mỗi ngày trên CI.",
  },
};

export function MockingBoundaryDiagram() {
  const [selected, setSelected] = useState<DepId>("postgres");
  const info = deps[selected];

  return (
    <DiagramFrame
      title="Ranh giới mock trong test của taskflow-api — bấm vào từng dependency"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                info.verdict === "REAL" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
                info.verdict === "MOCK" && "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
                info.verdict === "TUỲ TEST" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
              )}
            >
              {info.verdict}
            </span>
            <span className="font-semibold">{info.label}</span>
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">{info.reason}</p>
        </div>
      }
      caption="Nguyên tắc: chỉ mock thứ ngoài tầm kiểm soát của bạn (phí thật, mạng thật, không xác định). Postgres và code nội bộ luôn chạy thật trong integration test."
    >
      <DiagramNode x={270} y={120} width={180} height={70} label="🧵 taskflow-api" sublabel="code đang test" tone="blue" state="active" />

      {(Object.keys(deps) as DepId[]).map((id) => {
        const dep = deps[id];
        const active = selected === id;
        const nodeCenter: [number, number] = [dep.x + 100, dep.y + 27];
        const appCenter: [number, number] = [360, 155];
        return (
          <g key={id}>
            <DiagramArrow from={appCenter} to={nodeCenter} tone={dep.tone} dimmed={!active} curve={dep.x < 270 ? -30 : 30} />
            <DiagramNode
              x={dep.x}
              y={dep.y}
              width={200}
              height={54}
              label={dep.label}
              tone={dep.tone}
              state={active ? "active" : "normal"}
              onClick={() => setSelected(id)}
            />
          </g>
        );
      })}
    </DiagramFrame>
  );
}
