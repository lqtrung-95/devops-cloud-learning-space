"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import { InlineCodeText } from "@/components/ui/inline-code-text";

interface Task {
  id: string;
  label: string;
  emoji: string;
  isToil: boolean;
  reason: string;
}

const tasks: Task[] = [
  { id: "restart", label: "Restart pod bằng tay mỗi khi OOM", emoji: "🔁", isToil: true, reason: "Thủ công, lặp lại, tự động hoá được (tăng memory limit hoặc HPA) — kinh điển của toil." },
  { id: "design", label: "Thiết kế kiến trúc multi-region mới", emoji: "🏗️", isToil: false, reason: "Cần tư duy, không lặp lại, tạo giá trị lâu dài — đây là 'engineering', không phải toil." },
  { id: "cert", label: "Gia hạn TLS bằng tay mỗi 90 ngày", emoji: "📜", isToil: true, reason: "Lặp lại theo lịch, tự động hoá được (cert-manager) — toil." },
  { id: "postmortem", label: "Viết postmortem sự cố tuần trước", emoji: "📝", isToil: false, reason: "Không lặp lại y hệt, tạo giá trị học hỏi lâu dài — không phải toil dù đôi khi nhàm chán." },
  { id: "diskcleanup", label: "SSH xoá log cũ khi disk đầy", emoji: "🧹", isToil: true, reason: "Tăng tuyến tính theo số server, không cần tư duy — thay bằng log rotation + retention." },
  { id: "review", label: "Review kiến trúc PR lớn của đồng nghiệp", emoji: "👀", isToil: false, reason: "Cần đánh giá, mỗi lần khác nhau — giá trị kỹ thuật thật, không phải toil." },
];

export function ToilAutomationSorterDiagram() {
  const [selectedId, setSelectedId] = useState("restart");
  const selected = tasks.find((task) => task.id === selectedId)!;

  return (
    <DiagramFrame
      title="Toil hay engineering? Bấm vào từng việc"
      viewBox="0 0 720 260"
      controls={
        <div className="space-y-2 text-sm">
          <p className="font-semibold">
            {selected.emoji} {selected.label} — {selected.isToil ? "🔴 Toil" : "🟢 Engineering"}
          </p>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <InlineCodeText text={selected.reason} />
          </p>
        </div>
      }
      caption="Toil: thủ công, lặp lại, tự động hoá được, không tạo giá trị lâu dài, tăng theo quy mô. Google SRE khuyến nghị giữ toil dưới 50% thời gian on-call."
    >
      <text x={180} y={26} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-rose-700 dark:fill-rose-300">
        🔴 Toil — nên tự động hoá
      </text>
      <text x={540} y={26} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-emerald-700 dark:fill-emerald-300">
        🟢 Engineering — nên giữ lại
      </text>
      {tasks
        .filter((task) => task.isToil)
        .map((task, index) => (
          <DiagramNode
            key={task.id}
            x={20}
            y={40 + index * 68}
            width={320}
            height={58}
            label={`${task.emoji} ${task.label}`}
            tone="rose"
            state={task.id === selectedId ? "active" : "normal"}
            onClick={() => setSelectedId(task.id)}
          />
        ))}
      {tasks
        .filter((task) => !task.isToil)
        .map((task, index) => (
          <DiagramNode
            key={task.id}
            x={380}
            y={40 + index * 68}
            width={320}
            height={58}
            label={`${task.emoji} ${task.label}`}
            tone="green"
            state={task.id === selectedId ? "active" : "normal"}
            onClick={() => setSelectedId(task.id)}
          />
        ))}
    </DiagramFrame>
  );
}
