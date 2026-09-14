"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

interface Stage {
  from: number;
  to: number;
  label: string;
  sublabel: string;
  tone: DiagramTone;
  storage: string;
  retrieval: string;
  note: string;
}

// Lifecycle rule for prefix uploads/: Standard → Standard-IA (30d) → Glacier Flexible Retrieval (180d) → expire (365d).
const stages: Stage[] = [
  { from: 0, to: 30, label: "Standard", sublabel: "ngày 0–30", tone: "blue", storage: "💰💰💰💰", retrieval: "mili-giây, không phí lấy", note: "Ảnh mới upload được xem nhiều nhất → để ở lớp 'nóng'." },
  { from: 30, to: 180, label: "Standard-IA", sublabel: "ngày 30–180", tone: "cyan", storage: "💰💰", retrieval: "mili-giây, có phí/GB khi lấy", note: "Ít xem nhưng khi cần phải có ngay. Tính tối thiểu 30 ngày lưu và 128 KB/object." },
  { from: 180, to: 365, label: "Glacier Flexible", sublabel: "ngày 180–365", tone: "violet", storage: "💰", retrieval: "phút → giờ (phải restore)", note: "Kho lạnh: rẻ, nhưng muốn đọc phải gửi yêu cầu restore trước. Tối thiểu 90 ngày lưu." },
  { from: 365, to: 400, label: "Expire 🗑️", sublabel: "sau ngày 365", tone: "rose", storage: "—", retrieval: "object đã bị xoá", note: "Rule Expiration xoá object (với bucket có versioning: tạo delete marker, bản cũ xử lý bằng NoncurrentVersionExpiration)." },
];

const dayOptions = [1, 45, 200, 400];
const SEGMENT_X = 30;
const SEGMENT_WIDTH = 165;

function stageIndexOf(day: number) {
  const index = stages.findIndex((stage) => day >= stage.from && day < stage.to);
  return index === -1 ? stages.length - 1 : index;
}

export function S3LifecycleStorageClassDiagram() {
  const [day, setDay] = useState(45);
  const current = stageIndexOf(day);
  const stage = stages[current];
  const markerX = SEGMENT_X + current * SEGMENT_WIDTH + ((Math.min(day, stage.to) - stage.from) / (stage.to - stage.from)) * SEGMENT_WIDTH;

  return (
    <DiagramFrame
      title="Vòng đời một object trong uploads/ — chọn tuổi của file"
      viewBox="0 0 720 260"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDay(option)}
                className={
                  day === option
                    ? "rounded-full bg-indigo-600 px-3 py-1.5 font-medium text-white"
                    : "rounded-full bg-stone-200 px-3 py-1.5 font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                }
              >
                File {option} ngày tuổi
              </button>
            ))}
          </div>
          <p className="text-stone-700 dark:text-stone-300">
            <span className="font-semibold">{stage.label}:</span> {stage.note}
          </p>
        </div>
      }
      caption="Lifecycle rule tự chuyển object sang lớp rẻ hơn theo tuổi. Lưu càng rẻ thì lấy ra càng chậm hoặc càng tốn phí truy xuất — chọn theo tần suất truy cập thật."
    >
      {stages.map((item, index) => (
        <DiagramNode
          key={item.label}
          x={SEGMENT_X + index * SEGMENT_WIDTH + 4}
          y={40}
          width={SEGMENT_WIDTH - 8}
          height={60}
          label={item.label}
          sublabel={item.sublabel}
          tone={item.tone}
          dashed={index === 3}
          state={index === current ? "active" : "dimmed"}
          onClick={() => setDay(dayOptions[index])}
        />
      ))}
      <line x1={SEGMENT_X} y1={125} x2={SEGMENT_X + 4 * SEGMENT_WIDTH} y2={125} strokeWidth={2} className="stroke-stone-400 dark:stroke-stone-500" />
      {[0, 30, 180, 365].map((tick, index) => (
        <DiagramLabel key={tick} x={SEGMENT_X + index * SEGMENT_WIDTH} y={145} text={`${tick}d`} anchor={index === 0 ? "start" : "middle"} size={11} />
      ))}
      <g className="transition-transform duration-500" style={{ transform: `translateX(${markerX}px)` }}>
        <circle cx={0} cy={125} r={9} className="fill-indigo-500 stroke-white dark:stroke-stone-950" strokeWidth={2} />
        <DiagramLabel x={0} y={110} text={`📷 ${day}d`} size={12} bold />
      </g>

      <DiagramNode x={30} y={170} width={210} height={70} label="Chi phí lưu trữ" sublabel={stage.storage} tone="amber" />
      <DiagramNode x={255} y={170} width={210} height={70} label="Tốc độ lấy ra" sublabel={stage.retrieval} tone={stage.tone} />
      <DiagramNode x={480} y={170} width={210} height={70} label="Lớp hiện tại" sublabel={stage.label} tone={stage.tone} state="active" />
    </DiagramFrame>
  );
}
