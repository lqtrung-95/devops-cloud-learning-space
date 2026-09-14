"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Signal = "latency" | "traffic" | "errors" | "saturation";

const signals: { key: Signal; label: string; emoji: string; tone: DiagramTone }[] = [
  { key: "latency", label: "Latency", emoji: "⏱️", tone: "blue" },
  { key: "traffic", label: "Traffic", emoji: "🚦", tone: "cyan" },
  { key: "errors", label: "Errors", emoji: "💥", tone: "rose" },
  { key: "saturation", label: "Saturation", emoji: "🫙", tone: "amber" },
];

// Each RED/USE letter lights up when the chosen golden signal maps onto it.
const redLetters: { text: string; signal: Signal }[] = [
  { text: "R · Rate", signal: "traffic" },
  { text: "E · Errors", signal: "errors" },
  { text: "D · Duration", signal: "latency" },
];
const useLetters: { text: string; signal: Signal }[] = [
  { text: "U · Utilization", signal: "saturation" },
  { text: "S · Saturation", signal: "saturation" },
  { text: "E · Errors", signal: "errors" },
];

const symptoms: { label: string; signal: Signal; why: string; query: string }[] = [
  {
    label: "Khách than 'app quay vòng mãi'",
    signal: "latency",
    why: "Cảm nhận 'chậm' = độ trễ. Nhìn p95/p99 chứ không nhìn trung bình — trung bình che mất nhóm khách chờ lâu.",
    query: "histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))",
  },
  {
    label: "Lượng request giảm 70% lúc 20h",
    signal: "traffic",
    why: "Traffic tụt bất thường thường nghĩa là khách không vào được (DNS, load balancer, app mobile lỗi) — lỗi lại không hiện ở service.",
    query: "sum(rate(http_requests_total[5m]))",
  },
  {
    label: "Nút 'Thanh toán' báo lỗi",
    signal: "errors",
    why: "Tỉ lệ request thất bại (5xx, timeout, hoặc 200 nhưng sai nội dung) trên tổng request.",
    query: 'sum(rate(http_requests_total{code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))',
  },
  {
    label: "Node sắp đầy disk / CPU bị throttle",
    signal: "saturation",
    why: "Saturation = 'cái bình đã đầy tới đâu', hàng đợi đang dài ra. Đây là tín hiệu báo trước khi latency và errors bùng nổ.",
    query: "rate(container_cpu_cfs_throttled_periods_total[5m]) / rate(container_cpu_cfs_periods_total[5m])",
  },
];

export function SymptomToSignalPickerDiagram() {
  const [symptomIndex, setSymptomIndex] = useState(0);
  const symptom = symptoms[symptomIndex];

  return (
    <DiagramFrame
      title="Chọn một triệu chứng — tín hiệu nào lên tiếng?"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {symptoms.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setSymptomIndex(index)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  index === symptomIndex ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">{symptom.why}</p>
          <p className="overflow-x-auto rounded-xl bg-stone-900 px-4 py-2 font-mono text-[12px] text-emerald-400">{symptom.query}</p>
        </div>
      }
      caption="Four Golden Signals (Google SRE) dùng cho mọi hệ thống hướng người dùng. RED là bản rút gọn cho service; USE dành cho tài nguyên."
    >
      <DiagramLabel x={14} y={30} text="Four Golden Signals" anchor="start" bold size={13} />
      {signals.map((signal, index) => {
        const active = signal.key === symptom.signal;
        return (
          <DiagramNode
            key={signal.key}
            x={14 + index * 176}
            y={44}
            width={160}
            height={84}
            label={signal.label}
            emoji={signal.emoji}
            tone={signal.tone}
            state={active ? "active" : "dimmed"}
          />
        );
      })}
      <DiagramGroupBox x={14} y={146} width={336} height={124} label="RED — cho service (API)" tone="violet">
        {redLetters.map((letter, index) => {
          const lit = letter.signal === symptom.signal;
          return <DiagramLabel key={letter.text} x={40} y={190 + index * 26} text={`${lit ? "👉 " : ""}${letter.text}`} anchor="start" size={13} bold={lit} tone={lit ? "violet" : "slate"} />;
        })}
      </DiagramGroupBox>
      <DiagramGroupBox x={370} y={146} width={336} height={124} label="USE — cho tài nguyên (CPU, disk…)" tone="green">
        {useLetters.map((letter, index) => {
          const lit = letter.signal === symptom.signal;
          return <DiagramLabel key={letter.text} x={396} y={190 + index * 26} text={`${lit ? "👉 " : ""}${letter.text}`} anchor="start" size={13} bold={lit} tone={lit ? "green" : "slate"} />;
        })}
      </DiagramGroupBox>
    </DiagramFrame>
  );
}
