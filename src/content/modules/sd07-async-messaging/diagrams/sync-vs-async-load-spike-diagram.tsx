"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Mode = "sync" | "async";
type Load = "normal" | "spike";

interface Outcome {
  api: string;
  apiTone: DiagramTone;
  email: string;
  emailTone: DiagramTone;
  queueDepth: number;
  footer: string;
  caption: string;
}

// Illustrative numbers only (assumptions stated in the lesson), not a benchmark.
const outcomes: Record<Mode, Record<Load, Outcome>> = {
  sync: {
    normal: {
      api: "p99 ~600 ms",
      apiTone: "blue",
      email: "gửi ngay trong request",
      emailTone: "blue",
      queueDepth: 0,
      footer: "Availability chuỗi ≈ 99,9% × 99,9% × 99,9% ≈ 99,7%",
      caption: "Tải bình thường: vẫn chạy, nhưng latency của API = tổng latency các service phía sau, và chỉ cần 1 service chết là đặt hàng lỗi.",
    },
    spike: {
      api: "timeout / 503",
      apiTone: "rose",
      email: "quá tải → kéo API chết theo",
      emailTone: "rose",
      queueDepth: 0,
      footer: "Email chỉ chịu ~1.000/s nhưng khách gửi 2.000 đơn/s ⇒ thread chờ, pool cạn",
      caption: "Flash sale: Email service chậm lại, mỗi request đặt hàng phải đứng chờ nó. Connection pool của API cạn, khách thấy lỗi dù Payment vẫn khoẻ.",
    },
  },
  async: {
    normal: {
      api: "p99 ~200 ms",
      apiTone: "green",
      email: "trễ vài giây",
      emailTone: "green",
      queueDepth: 1,
      footer: "API chỉ chờ Payment + ghi DB; Email/Analytics đọc event sau",
      caption: "Tải bình thường: API trả lời ngay sau khi ghi đơn và event. Email/Analytics xử lý gần như tức thì, khách không nhận ra khác biệt.",
    },
    spike: {
      api: "p99 ~250 ms",
      apiTone: "green",
      email: "trễ ~10–15 phút (lag)",
      emailTone: "amber",
      queueDepth: 8,
      footer: "Backlog tăng (2.000 − 1.000)/s × 600 s ≈ 600.000 message rồi rút dần",
      caption: "Flash sale: topic hấp thụ phần dư. API vẫn nhanh; cái giá là email đến trễ. Async không làm việc biến mất — nó dời việc sang sau.",
    },
  },
};

const modeLabels: Record<Mode, string> = { sync: "Gọi đồng bộ (sync)", async: "Qua topic (async)" };
const loadLabels: Record<Load, string> = { normal: "Tải thường · 200 đơn/s", spike: "Flash sale · 2.000 đơn/s" };

function Toggle<T extends string>({ value, options, labels, onChange }: { value: T; options: T[]; labels: Record<T, string>; onChange: (next: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={clsx(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            value === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

export function SyncVsAsyncLoadSpikeDiagram() {
  const [mode, setMode] = useState<Mode>("sync");
  const [load, setLoad] = useState<Load>("normal");
  const outcome = outcomes[mode][load];
  const isAsync = mode === "async";

  return (
    <DiagramFrame
      title="Đặt hàng khi tải tăng đột biến: sync vs async"
      viewBox="0 0 720 310"
      controls={
        <div className="space-y-2">
          <Toggle value={mode} options={["sync", "async"]} labels={modeLabels} onChange={setMode} />
          <Toggle value={load} options={["normal", "spike"]} labels={loadLabels} onChange={setLoad} />
        </div>
      }
      caption={outcome.caption}
    >
      <DiagramNode x={10} y={110} width={120} height={80} label="Khách" sublabel={load === "spike" ? "2.000 đơn/s" : "200 đơn/s"} emoji="🛒" tone="violet" />
      <DiagramArrow from={[132, 150]} to={[176, 150]} tone="violet" animated />
      <DiagramNode x={180} y={110} width={140} height={80} label="Order API" sublabel={outcome.api} emoji="🧾" tone={outcome.apiTone} state="active" />

      <DiagramNode x={560} y={15} width={150} height={60} label="💳 Payment" sublabel="luôn sync: cần kết quả" tone="blue" />
      <DiagramArrow from={[322, 125]} to={[556, 50]} tone="blue" label="chờ" />

      {isAsync ? (
        <DiagramGroupBox x={350} y={118} width={170} height={96} label="topic orders" tone="amber">
          {Array.from({ length: outcome.queueDepth }, (_, index) => (
            <rect key={index} x={364 + index * 18} y={160} width={12} height={34} rx={3} className="fill-amber-400 dark:fill-amber-500" />
          ))}
          <DiagramLabel x={435} y={208} text={outcome.queueDepth > 4 ? "backlog đang dồn" : "gần như rỗng"} size={11} tone="amber" />
        </DiagramGroupBox>
      ) : null}

      <DiagramNode x={560} y={125} width={150} height={60} label="📧 Email" sublabel={outcome.email} tone={outcome.emailTone} />
      <DiagramNode x={560} y={225} width={150} height={60} label="📊 Analytics" sublabel={isAsync ? "đọc cùng event" : "thêm 1 lần chờ"} tone={isAsync ? "green" : outcome.emailTone} />

      {isAsync ? (
        <>
          <DiagramArrow from={[322, 160]} to={[346, 162]} tone="amber" animated />
          <DiagramArrow from={[522, 150]} to={[556, 152]} tone="amber" animated />
          <DiagramArrow from={[522, 195]} to={[556, 248]} tone="amber" animated />
        </>
      ) : (
        <>
          <DiagramArrow from={[322, 155]} to={[556, 155]} tone={outcome.emailTone} label="chờ" animated={load === "spike"} />
          <DiagramArrow from={[322, 180]} to={[556, 250]} tone={outcome.emailTone} label="chờ" />
        </>
      )}

      <DiagramLabel x={360} y={300} text={outcome.footer} size={12} tone={outcome.apiTone === "rose" ? "rose" : "slate"} bold />
    </DiagramFrame>
  );
}
