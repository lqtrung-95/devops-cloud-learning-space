"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Strategy = "lww" | "conflicted-copy";

const STEP_TITLES = ["Đồng bộ ban đầu", "Offline & sửa song song", "A kết nối lại: server phát hiện xung đột", "Giải quyết xung đột"];

const stepCaptions: string[] = [
  "Cả 2 thiết bị đang ở version v1, đã đồng bộ xong với server.",
  "Thiết bị A mất mạng, sửa file thành vA (chỉ có ở local). Thiết bị B vẫn online, sửa thành vB và đồng bộ lên server ngay — server chuyển sang v2 = vB.",
  "A có mạng trở lại, đẩy vA lên kèm 'base version = v1'. Server thấy version hiện tại đã là v2 (≠ v1) — đây là 2 nhánh sửa đồng thời (concurrent edit) từ cùng gốc, không thể chấp nhận đè im lặng.",
  "Chọn chiến lược xử lý bên dưới để xem kết quả khác nhau thế nào.",
];

function Toggle({ value, onChange }: { value: Strategy; onChange: (next: Strategy) => void }) {
  const options: { key: Strategy; label: string }[] = [
    { key: "lww", label: "Last-writer-wins (đè theo timestamp)" },
    { key: "conflicted-copy", label: "LWW + conflicted copy (giữ cả 2 bản)" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={clsx(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            value === option.key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SyncConflictResolutionDiagram() {
  const [step, setStep] = useState(0);
  const [strategy, setStrategy] = useState<Strategy>("conflicted-copy");
  const lastStep = STEP_TITLES.length - 1;
  const atResolution = step === lastStep;

  return (
    <DiagramFrame
      title="2 thiết bị sửa offline rồi reconnect: xung đột & cách giải quyết"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
            >
              ← Trước
            </button>
            <button
              type="button"
              onClick={() => setStep(Math.min(lastStep, step + 1))}
              disabled={step === lastStep}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
            >
              Tiếp →
            </button>
            <span className="ml-auto text-xs font-medium text-stone-500">
              Bước {step + 1}/{STEP_TITLES.length}: {STEP_TITLES[step]}
            </span>
          </div>
          {atResolution && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-stone-500">Chiến lược giải quyết xung đột:</p>
              <Toggle value={strategy} onChange={setStrategy} />
            </div>
          )}
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{stepCaptions[step]}</p>
        </div>
      }
    >
      <DiagramNode x={20} y={30} width={130} height={60} label="Thiết bị A" sublabel={step === 0 ? "v1" : step < 3 ? "vA (local)" : "vA — pending"} emoji="💻" tone={step >= 1 && step < 3 ? "amber" : "violet"} state={step === 1 ? "active" : "normal"} />
      <DiagramNode x={20} y={210} width={130} height={60} label="Thiết bị B" sublabel={step === 0 ? "v1" : "vB — đã sync"} emoji="💻" tone="blue" state={step === 1 || step === 2 ? "active" : "normal"} />

      <DiagramNode
        x={300}
        y={120}
        width={140}
        height={70}
        label="Server / metadata service"
        sublabel={step === 0 ? "v1" : step < 3 ? "v2 = vB" : "xung đột A vs B"}
        emoji="🗄️"
        tone={step === 2 ? "rose" : "slate"}
        state={step === 2 ? "active" : "normal"}
      />

      <DiagramArrow from={[150, 240]} to={[298, 175]} tone="blue" dimmed={step < 1} label={step >= 1 ? "sync vB ngay" : undefined} />
      <DiagramArrow from={[150, 60]} to={[298, 155]} tone={step === 2 ? "rose" : "amber"} dimmed={step < 2} label={step >= 2 ? "đẩy vA (base=v1)" : undefined} />

      {atResolution && strategy === "lww" && (
        <>
          <DiagramNode x={520} y={100} width={170} height={70} label="Kết quả: chỉ giữ vB" sublabel="vA bị mất vĩnh viễn" emoji="⚠️" tone="rose" state="active" />
          <DiagramArrow from={[440, 150]} to={[518, 135]} tone="rose" />
          <DiagramLabel x={520} y={190} text="Rủi ro: thay đổi hợp lệ của A biến mất, người dùng không hay biết." anchor="start" size={10.5} tone="rose" />
        </>
      )}
      {atResolution && strategy === "conflicted-copy" && (
        <>
          <DiagramNode x={500} y={70} width={190} height={55} label="file.txt = vB" sublabel="bản canonical (mới nhất)" emoji="✅" tone="green" state="active" />
          <DiagramNode x={500} y={150} width={190} height={55} label="file (conflicted copy — A).txt" sublabel="giữ nguyên nội dung vA" emoji="🗂️" tone="amber" state="active" />
          <DiagramArrow from={[440, 145]} to={[498, 97]} tone="green" />
          <DiagramArrow from={[440, 155]} to={[498, 177]} tone="amber" />
          <DiagramLabel x={500} y={225} text="Không mất dữ liệu — người dùng tự gộp 2 file nếu cần." anchor="start" size={10.5} tone="green" />
        </>
      )}
    </DiagramFrame>
  );
}
