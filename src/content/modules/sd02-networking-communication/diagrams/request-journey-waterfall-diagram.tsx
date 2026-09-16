"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type ConnectionMode = "new" | "reused";

const rttOptions = [
  { ms: 5, label: "5ms · cùng region" },
  { ms: 40, label: "40ms · VN → Singapore" },
  { ms: 160, label: "160ms · VN → châu Âu" },
];

const DNS_MS = 30; // giả định: resolver chưa có trong cache
const SERVER_MS = 20; // giả định: thời gian app xử lý
const CHART_X = 200;
const CHART_WIDTH = 500;
const MAX_MS = 560;

interface Phase {
  label: string;
  detail: string;
  ms: number;
  tone: DiagramTone;
}

function buildPhases(mode: ConnectionMode, rtt: number): Phase[] {
  const request: Phase = { label: "HTTP request → TTFB", detail: `1 RTT + ${SERVER_MS}ms xử lý`, ms: rtt + SERVER_MS, tone: "green" };
  if (mode === "reused") return [request];
  return [
    { label: "DNS lookup", detail: "hỏi resolver (cache miss)", ms: DNS_MS, tone: "violet" },
    { label: "TCP handshake", detail: "SYN, SYN-ACK, ACK: 1 RTT", ms: rtt, tone: "blue" },
    { label: "TLS 1.3 handshake", detail: "Hello, trao khoá: 1 RTT", ms: rtt, tone: "amber" },
    request,
  ];
}

export function RequestJourneyWaterfallDiagram() {
  const [mode, setMode] = useState<ConnectionMode>("new");
  const [rtt, setRtt] = useState(rttOptions[1].ms);
  const phases = buildPhases(mode, rtt);
  const total = phases.reduce((sum, phase) => sum + phase.ms, 0);
  const newTotal = buildPhases("new", rtt).reduce((sum, phase) => sum + phase.ms, 0);
  const toX = (ms: number) => CHART_X + (ms / MAX_MS) * CHART_WIDTH;

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="Waterfall một request HTTPS — đổi RTT và bật keep-alive"
      viewBox="0 0 720 290"
      controls={
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("new")} className={pill(mode === "new")}>
              🆕 Kết nối mới
            </button>
            <button type="button" onClick={() => setMode("reused")} className={pill(mode === "reused")}>
              ♻️ Tái dùng (keep-alive / pool)
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {rttOptions.map((option) => (
              <button key={option.ms} type="button" onClick={() => setRtt(option.ms)} className={pill(rtt === option.ms)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      }
      caption={`Giả định: DNS ${DNS_MS}ms khi chưa cache, app xử lý ${SERVER_MS}ms, TLS 1.3 (TLS 1.2 cần 2 RTT). RTT càng lớn, phần bắt tay càng áp đảo — keep-alive tiết kiệm đúng phần đó.`}
    >
      {[0, 100, 200, 300, 400, 500].map((ms) => (
        <g key={ms}>
          <line x1={toX(ms)} y1={20} x2={toX(ms)} y2={220} strokeDasharray="3 4" className="stroke-stone-300 dark:stroke-stone-700" />
          <DiagramLabel x={toX(ms)} y={236} text={`${ms}ms`} size={11} />
        </g>
      ))}
      {phases.map((phase, index) => {
        const start = phases.slice(0, index).reduce((sum, item) => sum + item.ms, 0);
        const y = 28 + index * 48;
        return (
          <g key={phase.label}>
            <DiagramLabel x={186} y={y + 16} text={phase.label} anchor="end" size={12} bold />
            <DiagramLabel x={186} y={y + 32} text={phase.detail} anchor="end" size={11} />
            <DiagramNode
              x={toX(start)}
              y={y + 4}
              width={Math.max((phase.ms / MAX_MS) * CHART_WIDTH, 44)}
              height={30}
              rounded={6}
              label={`${phase.ms}ms`}
              tone={phase.tone}
              state="active"
            />
          </g>
        );
      })}
      <DiagramLabel x={20} y={266} text={`Tổng tới byte đầu tiên: ~${total}ms`} anchor="start" size={14} tone="green" bold />
      {mode === "reused" && (
        <DiagramLabel x={700} y={266} text={`tiết kiệm ~${newTotal - total}ms mỗi request (${Math.round(((newTotal - total) / newTotal) * 100)}%)`} anchor="end" size={13} tone="amber" bold />
      )}
    </DiagramFrame>
  );
}
