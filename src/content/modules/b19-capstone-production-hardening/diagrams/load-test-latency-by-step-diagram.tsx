"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses } from "@/components/diagrams/diagram-tones";

interface JourneyStep {
  id: string;
  label: string;
  /** Minh hoạ (ms) — số liệu ví dụ suy luận từ đặc điểm CPU-bound/I-O-bound của từng bước, KHÔNG phải số đo thật. */
  p50: number;
  p95: number;
  p99: number;
  reasoning: string;
}

const steps: JourneyStep[] = [
  {
    id: "login",
    label: "Đăng nhập",
    p50: 60,
    p95: 180,
    p99: 620,
    reasoning:
      "argon2id hash (B05) là việc CPU-bound, chạy đồng bộ trên event loop của Node. Khi nhiều VU đăng nhập cùng lúc, request phải xếp hàng chờ CPU rảnh — p99 vọt lên xa nhất trong 5 bước. Đây là ứng viên số 1 cho 'bottleneck đầu tiên'.",
  },
  {
    id: "create-project",
    label: "Tạo project",
    p50: 25,
    p95: 60,
    p99: 110,
    reasoning: "Chủ yếu là một lệnh INSERT (I/O-bound, chờ Postgres trả lời). Node xử lý được nhiều request song song trong lúc chờ I/O nên latency tăng chậm hơn nhiều so với đăng nhập.",
  },
  {
    id: "create-task",
    label: "Tạo task",
    p50: 22,
    p95: 55,
    p99: 95,
    reasoning: "Tương tự tạo project — một INSERT vào bảng `tasks`. Không có phần CPU-bound nào chen vào nên đường p50/p95/p99 gần như song song, không doãng ra khi tải tăng.",
  },
  {
    id: "comment",
    label: "Comment",
    p50: 18,
    p95: 45,
    p99: 80,
    reasoning: "Bước nhẹ nhất trong hành trình: một INSERT nhỏ vào bảng `comments`, không kèm side-effect nào khác. Latency thấp và ổn định ở mọi mức tải trong ví dụ này.",
  },
  {
    id: "upload-attachment",
    label: "Upload file",
    p50: 90,
    p95: 220,
    p99: 340,
    reasoning:
      "Gồm việc lấy presigned URL (B08) rồi PUT file lên MinIO — chờ I/O mạng nhiều hơn, nên latency cao hơn các bước CRUD thường nhưng vẫn tăng có kiểm soát theo tải, không vọt bất thường như bước đăng nhập.",
  },
];

const maxVal = 650;
const chartTop = 26;
const chartBottom = 250;
const chartHeight = chartBottom - chartTop;
const groupSpacing = 130;
const startX = 55;
const barWidth = 18;
const slaThresholdMs = 300;

function barHeight(value: number): number {
  return (value / maxVal) * chartHeight;
}

/** Bấm vào một bước để xem lý do tại sao p95/p99 của bước đó cao hay thấp — dữ liệu là ví dụ minh hoạ suy luận từ đặc điểm CPU-bound/I-O-bound, hãy chạy k6 thật để có số đo của bạn. */
export function LoadTestLatencyByStepDiagram() {
  const [selectedId, setSelectedId] = useState("login");
  const current = steps.find((step) => step.id === selectedId)!;
  const slaY = chartBottom - (slaThresholdMs / maxVal) * chartHeight;

  return (
    <DiagramFrame
      title="p50 / p95 / p99 theo từng bước hành trình (ví dụ minh hoạ) — bấm một bước để xem lý do"
      viewBox="0 0 720 300"
      caption={
        <div>
          <p className="font-semibold text-stone-800 dark:text-stone-200">
            {current.label}: p50={current.p50}ms · p95={current.p95}ms · p99={current.p99}ms
          </p>
          <p className="mt-1">{current.reasoning}</p>
        </div>
      }
    >
      <line x1={40} y1={slaY} x2={700} y2={slaY} strokeDasharray="5 5" className="stroke-stone-400 dark:stroke-stone-600" strokeWidth={1.5} />
      <DiagramLabel x={700} y={slaY - 6} text={`ngưỡng ví dụ ${slaThresholdMs}ms`} anchor="end" size={10.5} tone="slate" />
      <line x1={40} y1={chartBottom} x2={700} y2={chartBottom} className="stroke-stone-400 dark:stroke-stone-600" strokeWidth={1.5} />

      {steps.map((step, index) => {
        const groupX = startX + index * groupSpacing;
        const isSelected = step.id === selectedId;
        const bars: { key: "p50" | "p95" | "p99"; tone: "blue" | "amber" | "rose" }[] = [
          { key: "p50", tone: "blue" },
          { key: "p95", tone: "amber" },
          { key: "p99", tone: "rose" },
        ];
        return (
          <g
            key={step.id}
            className="cursor-pointer"
            onClick={() => setSelectedId(step.id)}
            opacity={isSelected || selectedId === undefined ? 1 : 0.55}
          >
            <rect x={groupX - 8} y={chartTop - 10} width={barWidth * 3 + 26} height={chartHeight + 16} fill="transparent" />
            {bars.map((bar, barIndex) => {
              const value = step[bar.key];
              const height = barHeight(value);
              const x = groupX + barIndex * (barWidth + 4);
              const y = chartBottom - height;
              const tones = diagramToneClasses[bar.tone];
              return (
                <rect
                  key={bar.key}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx={3}
                  className={tones.shape}
                  strokeWidth={isSelected ? 2.5 : 1.25}
                />
              );
            })}
            <DiagramLabel x={groupX + barWidth * 1.5} y={chartBottom + 20} text={step.label} size={11.5} tone="slate" />
          </g>
        );
      })}

      <rect x={565} y={8} width={12} height={12} className={diagramToneClasses.blue.shape} />
      <DiagramLabel x={582} y={18} text="p50" anchor="start" size={11} tone="slate" />
      <rect x={620} y={8} width={12} height={12} className={diagramToneClasses.amber.shape} />
      <DiagramLabel x={637} y={18} text="p95" anchor="start" size={11} tone="slate" />
      <rect x={675} y={8} width={12} height={12} className={diagramToneClasses.rose.shape} />
      <DiagramLabel x={692} y={18} text="p99" anchor="start" size={11} tone="slate" />
    </DiagramFrame>
  );
}
