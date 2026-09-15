"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Strategy = "commit-first" | "commit-after" | "commit-after-dedup";
type Crash = "none" | "before-send" | "after-send";

interface StepBox {
  id: "poll" | "commit" | "send";
  label: string;
  sublabel: string;
}

const poll: StepBox = { id: "poll", label: "📥 poll m7", sublabel: "offset 7" };
const commit: StepBox = { id: "commit", label: "✅ commit", sublabel: "offset → 8" };
const send: StepBox = { id: "send", label: "📧 gửi email", sublabel: "side effect" };
const dedupSend: StepBox = { id: "send", label: "🔑 check key + gửi", sublabel: "1 transaction" };

const strategies: Record<Strategy, { button: string; steps: StepBox[] }> = {
  "commit-first": { button: "Commit trước, xử lý sau", steps: [poll, commit, send] },
  "commit-after": { button: "Xử lý trước, commit sau", steps: [poll, send, commit] },
  "commit-after-dedup": { button: "Commit sau + idempotency key", steps: [poll, dedupSend, commit] },
};

const crashes: Record<Crash, string> = { none: "Không crash", "before-send": "⚡ Crash ngay trước khi gửi", "after-send": "⚡ Crash ngay sau khi gửi" };

function evaluate(strategy: Strategy, crash: Crash) {
  const steps = strategies[strategy].steps;
  const sendIndex = steps.findIndex((step) => step.id === "send");
  // Number of steps finished before the crash (all of them when there is no crash).
  const doneCount = crash === "none" ? steps.length : crash === "before-send" ? sendIndex : sendIndex + 1;
  const done = steps.slice(0, doneCount);
  const committed = done.some((step) => step.id === "commit");
  const sentBefore = done.some((step) => step.id === "send") ? 1 : 0;
  if (crash === "none") return { doneCount, emails: 1, restart: "", verdict: "1 email — đúng", tone: "green" as DiagramTone };
  if (committed) {
    return sentBefore
      ? { doneCount, emails: 1, restart: "đọc từ offset 8 → bỏ qua m7 (đã gửi rồi, may mắn)", verdict: "1 email — đúng", tone: "green" as DiagramTone }
      : { doneCount, emails: 0, restart: "đọc từ offset 8 → m7 bị bỏ qua", verdict: "0 email — MẤT message (at-most-once)", tone: "rose" as DiagramTone };
  }
  if (strategy === "commit-after-dedup" && sentBefore) {
    return { doneCount, emails: 1, restart: "đọc lại m7 → key đã có trong DB → bỏ qua, commit", verdict: "1 email — hiệu ứng đúng 1 lần", tone: "green" as DiagramTone };
  }
  return sentBefore
    ? { doneCount, emails: 2, restart: "đọc lại m7 từ offset 7 → gửi thêm lần nữa", verdict: "2 email — TRÙNG (at-least-once)", tone: "amber" as DiagramTone }
    : { doneCount, emails: 1, restart: "đọc lại m7 từ offset 7 → gửi", verdict: "1 email — đúng", tone: "green" as DiagramTone };
}

function Pills<T extends string>({ value, labels, onChange }: { value: T; labels: Record<T, string>; onChange: (next: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(labels) as T[]).map((option) => (
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

const strategyLabels = Object.fromEntries(Object.entries(strategies).map(([key, value]) => [key, value.button])) as Record<Strategy, string>;

export function CommitStrategyCrashPointDiagram() {
  const [strategy, setStrategy] = useState<Strategy>("commit-after");
  const [crash, setCrash] = useState<Crash>("after-send");
  const steps = strategies[strategy].steps;
  const result = evaluate(strategy, crash);
  const crashX = 80 + result.doneCount * 160 - 10;

  return (
    <DiagramFrame
      title="Crash ở đâu thì mất hay trùng message?"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-2">
          <Pills value={strategy} labels={strategyLabels} onChange={setStrategy} />
          <Pills value={crash} labels={crashes} onChange={setCrash} />
        </div>
      }
      caption="Không có thứ tự commit nào tránh được cả mất lẫn trùng khi side effect nằm ngoài Kafka. Commit sau (at-least-once) + idempotency key là công thức thực tế."
    >
      <DiagramLabel x={10} y={30} text="Lần chạy 1" anchor="start" bold />
      {steps.map((step, index) => (
        <g key={`${strategy}-${step.id}`}>
          {index > 0 && <DiagramArrow from={[80 + index * 160 - 20, 73]} to={[80 + index * 160, 73]} dimmed={index >= result.doneCount} />}
          <DiagramNode
            x={80 + index * 160}
            y={45}
            width={140}
            height={56}
            label={step.label}
            sublabel={step.sublabel}
            tone={step.id === "commit" ? "blue" : step.id === "send" ? "violet" : "slate"}
            state={index < result.doneCount ? "normal" : "dimmed"}
          />
        </g>
      ))}
      {crash !== "none" && (
        <g>
          <line x1={crashX} y1={36} x2={crashX} y2={112} strokeWidth={3} strokeDasharray="5 4" className="stroke-rose-500 dark:stroke-rose-400" />
          <DiagramLabel x={crashX} y={128} text="⚡ crash" tone="rose" bold />
        </g>
      )}

      <DiagramLabel x={10} y={165} text="Sau restart" anchor="start" bold />
      <DiagramNode
        x={80}
        y={180}
        width={460}
        height={48}
        label={crash === "none" ? "không cần restart" : "🔄 consumer đọc offset đã commit"}
        sublabel={result.restart || "commit xong, đi tiếp m8"}
        tone="slate"
        state={crash === "none" ? "dimmed" : "active"}
      />
      <DiagramNode x={80} y={240} width={620} height={50} label={`📬 Hộp thư khách: ${result.emails} email`} sublabel={result.verdict} tone={result.tone} state="active" />
      <DiagramNode x={560} y={180} width={140} height={48} label={strategy === "commit-first" ? "at-most-once" : strategy === "commit-after" ? "at-least-once" : "effectively-once"} tone={result.tone} />
    </DiagramFrame>
  );
}
