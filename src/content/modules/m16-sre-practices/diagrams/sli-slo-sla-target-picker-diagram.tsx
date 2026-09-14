"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

const MINUTES_IN_30_DAYS = 30 * 24 * 60;

const targets: { value: number; label: string; tone: DiagramTone; note: string }[] = [
  { value: 99, label: "99%", tone: "green", note: "Hợp cho tool nội bộ, batch job. Người dùng sẽ thấy lỗi khá thường xuyên." },
  { value: 99.5, label: "99.5%", tone: "cyan", note: "Mức hợp lý cho app mẫu của khoá học: một replica set + rollback nhanh là đạt được." },
  { value: 99.9, label: "99.9%", tone: "amber", note: "Chuẩn phổ biến cho API thương mại. Cần multi-AZ, deploy an toàn, on-call phản ứng trong vài phút." },
  { value: 99.99, label: "99.99%", tone: "rose", note: "Chỉ ~4 phút/tháng — nhanh hơn thời gian một người kịp mở laptop. Cần tự động failover, multi-region, chi phí tăng vọt." },
];

function formatMinutes(minutes: number): string {
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)} giờ`;
  return `${minutes.toFixed(1)} phút`;
}

export function SliSloSlaTargetPickerDiagram() {
  const [targetIndex, setTargetIndex] = useState(1);
  const target = targets[targetIndex];
  const budgetMinutes = MINUTES_IN_30_DAYS * (1 - target.value / 100);
  const slaValue = (target.value - 0.5).toFixed(2).replace(/\.?0+$/, "");

  return (
    <DiagramFrame
      title="Chọn mục tiêu SLO — xem 'quỹ được phép hỏng' mỗi 30 ngày"
      viewBox="0 0 720 290"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {targets.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setTargetIndex(index)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  index === targetIndex ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                SLO {item.label}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-semibold">Error budget: {formatMinutes(budgetMinutes)} / 30 ngày.</span> {target.note}
          </p>
        </div>
      }
      caption="SLI là thứ đo được; SLO là mục tiêu nội bộ cho SLI; SLA là hợp đồng có bồi thường, thường lỏng hơn SLO. Ví dụ SLA ở đây chỉ minh hoạ."
    >
      <DiagramNode x={10} y={30} width={200} height={100} label="SLI" sublabel="request OK / tổng request" emoji="📏" tone="blue" />
      <DiagramNode x={260} y={30} width={200} height={100} label={`SLO ${target.label}`} sublabel="mục tiêu nội bộ, 30 ngày" emoji="🎯" tone={target.tone} state="active" />
      <DiagramNode x={510} y={30} width={200} height={100} label={`SLA ${slaValue}%`} sublabel="hợp đồng, có đền tiền" emoji="📜" tone="violet" />
      <DiagramArrow from={[212, 80]} to={[256, 80]} tone="blue" label="đo" />
      <DiagramArrow from={[462, 80]} to={[506, 80]} tone="violet" label="lỏng hơn" />

      <DiagramLabel x={10} y={176} text="30 ngày = 43.200 phút" anchor="start" bold size={13} />
      <rect x={10} y={190} width={700} height={40} rx={8} className="fill-emerald-100 dark:fill-emerald-950" />
      <rect
        x={710 - Math.max(4, (budgetMinutes / MINUTES_IN_30_DAYS) * 700 * 20)}
        y={190}
        width={Math.max(4, (budgetMinutes / MINUTES_IN_30_DAYS) * 700 * 20)}
        height={40}
        rx={8}
        className="fill-rose-400 transition-all duration-500 dark:fill-rose-500"
      />
      <DiagramLabel x={20} y={215} text="✅ thời gian phải hoạt động tốt" anchor="start" tone="green" bold />
      <DiagramLabel x={700} y={256} text={`🔥 error budget ${formatMinutes(budgetMinutes)} (phóng to ×20 cho dễ thấy)`} anchor="end" tone="rose" bold />
      <DiagramLabel x={10} y={280} text="Mỗi số 9 thêm vào: budget chia 10, chi phí và độ phức tạp tăng mạnh." anchor="start" size={12} />
    </DiagramFrame>
  );
}
