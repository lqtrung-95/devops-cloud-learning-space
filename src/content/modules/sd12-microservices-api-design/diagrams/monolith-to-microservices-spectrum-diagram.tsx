"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Arch = "monolith" | "modular" | "micro";

const metrics: Record<Arch, { deploy: string; latency: string; ops: string; tone: "blue" | "amber" | "rose" }> = {
  monolith: {
    deploy: "1 lần deploy cho cả app",
    latency: "Gọi hàm trong process (µs)",
    ops: "1 pipeline, 1 process để canh",
    tone: "blue",
  },
  modular: {
    deploy: "Vẫn 1 lần deploy, ranh giới rõ trong code",
    latency: "Vẫn gọi hàm trong process — chưa trả giá network",
    ops: "Vẫn 1 pipeline — sẵn ranh giới để tách sau nếu cần",
    tone: "amber",
  },
  micro: {
    deploy: "Mỗi service deploy độc lập, tự quyết nhịp release",
    latency: "Qua network (HTTP/gRPC) — cỡ ms, có thể lỗi giữa chừng",
    ops: "N pipeline, N process, cần tracing + discovery + retry (SD11)",
    tone: "rose",
  },
};

const archLabel: Record<Arch, string> = {
  monolith: "Monolith — 1 bếp chung",
  modular: "Modular monolith — khu nấu riêng",
  micro: "Microservices — quầy riêng",
};

/** Wrap long Vietnamese text into <tspan> lines so it fits inside the diagram card instead of overflowing the viewBox. */
function WrappedText({ x, y, text, width, tone }: { x: number; y: number; text: string; width: number; tone: "blue" | "amber" | "rose" }) {
  const charsPerLine = Math.max(18, Math.floor(width / 6.2));
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > charsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  const toneClass = { blue: "fill-blue-900 dark:fill-blue-100", amber: "fill-amber-900 dark:fill-amber-100", rose: "fill-rose-900 dark:fill-rose-100" }[tone];

  return (
    <text x={x} y={y} fontSize={11.5} className={toneClass}>
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={index === 0 ? 0 : 14}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function MonolithToMicroservicesSpectrumDiagram() {
  const [arch, setArch] = useState<Arch>("monolith");
  const m = metrics[arch];

  return (
    <DiagramFrame
      title="Phổ kiến trúc: monolith → modular monolith → microservices"
      viewBox="0 0 720 340"
      controls={
        <div className="flex flex-wrap gap-2">
          {(Object.keys(archLabel) as Arch[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setArch(option)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                arch === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
              )}
            >
              {archLabel[option]}
            </button>
          ))}
        </div>
      }
      caption="Trục ngang KHÔNG phải 'microservices luôn tốt hơn' — mỗi bước sang phải đổi độc lập deploy/scale lấy latency mạng và chi phí vận hành. Modular monolith giữ ranh giới rõ mà chưa trả giá network — thường là điểm dừng hợp lý cho tới khi có lý do cụ thể để tách hẳn (theo Martin Fowler — MonolithFirst)."
    >
      {arch === "monolith" && (
        <DiagramGroupBox x={260} y={20} width={200} height={130} label="1 process" tone="blue">
          <DiagramNode x={280} y={48} width={160} height={90} label="Order+Inventory+Payment" sublabel="1 codebase · 1 DB" emoji="🍲" tone="blue" state="active" />
        </DiagramGroupBox>
      )}

      {arch === "modular" && (
        <DiagramGroupBox x={190} y={20} width={340} height={130} label="1 process, ranh giới rõ trong code" tone="amber">
          <DiagramNode x={205} y={55} width={100} height={80} label="Order" emoji="🧾" tone="amber" state="active" />
          <DiagramNode x={315} y={55} width={100} height={80} label="Inventory" emoji="📦" tone="amber" state="active" />
          <DiagramNode x={425} y={55} width={90} height={80} label="Payment" emoji="💳" tone="amber" state="active" />
        </DiagramGroupBox>
      )}

      {arch === "micro" && (
        <>
          <DiagramNode x={90} y={25} width={130} height={85} label="Order svc" sublabel="DB riêng" emoji="🧾" tone="rose" state="active" />
          <DiagramNode x={295} y={25} width={130} height={85} label="Inventory svc" sublabel="DB riêng" emoji="📦" tone="rose" state="active" />
          <DiagramNode x={500} y={25} width={130} height={85} label="Payment svc" sublabel="DB riêng" emoji="💳" tone="rose" state="active" />
          <DiagramArrow from={[220, 67]} to={[295, 67]} tone="rose" label="HTTP" animated />
          <DiagramArrow from={[425, 67]} to={[500, 67]} tone="rose" label="HTTP" animated />
        </>
      )}

      <rect x={40} y={175} width={640} height={150} rx={14} className="fill-stone-50 stroke-stone-200 dark:fill-stone-900 dark:stroke-stone-800" strokeWidth={1} />
      <text x={60} y={200} fontSize={12} fontWeight={700} className="fill-stone-700 dark:fill-stone-300">
        Deploy
      </text>
      <WrappedText x={60} y={218} width={200} text={m.deploy} tone={m.tone} />
      <text x={280} y={200} fontSize={12} fontWeight={700} className="fill-stone-700 dark:fill-stone-300">
        Latency giữa các phần
      </text>
      <WrappedText x={280} y={218} width={200} text={m.latency} tone={m.tone} />
      <text x={500} y={200} fontSize={12} fontWeight={700} className="fill-stone-700 dark:fill-stone-300">
        Vận hành
      </text>
      <WrappedText x={500} y={218} width={160} text={m.ops} tone={m.tone} />
    </DiagramFrame>
  );
}
