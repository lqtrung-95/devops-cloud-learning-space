"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Scale = "real" | "human";

interface LatencyOperation {
  label: string;
  nanoseconds: number;
  human: string;
  analogy: string;
  tone: DiagramTone;
}

// Thứ tự độ lớn theo danh sách phổ biến (Jeff Dean). Phần cứng mới nhanh hơn — chỉ dùng để so sánh tương đối.
const operations: LatencyOperation[] = [
  { label: "Đọc RAM", nanoseconds: 100, human: "~1,7 phút", analogy: "Lấy đồ trong túi áo.", tone: "green" },
  { label: "Đọc ngẫu nhiên 4KB SSD", nanoseconds: 150_000, human: "~1,7 ngày", analogy: "Mở tủ trong phòng — chậm hơn RAM cỡ 1.000 lần.", tone: "cyan" },
  { label: "Round trip trong datacenter", nanoseconds: 500_000, human: "~6 ngày", analogy: "Chạy sang nhà hàng xóm hỏi một câu. Mỗi query DB, mỗi call service tốn ít nhất chừng này.", tone: "blue" },
  { label: "Đọc tuần tự 1MB SSD", nanoseconds: 1_000_000, human: "~12 ngày", analogy: "Bê cả thùng đồ từ kho ra.", tone: "violet" },
  { label: "Disk seek (HDD)", nanoseconds: 10_000_000, human: "~4 tháng", analogy: "Đi tìm đồ trong kho ngoài bãi — lý do database hiện đại chuộng SSD.", tone: "amber" },
  { label: "Gói tin CA → Hà Lan → CA", nanoseconds: 150_000_000, human: "~4,8 năm", analogy: "Gửi thư ra nước ngoài rồi chờ hồi âm. Tốc độ ánh sáng có giới hạn — không có cache nào sửa được khoảng cách.", tone: "rose" },
];

const MIN_LOG = Math.log10(10);
const MAX_LOG = Math.log10(1e9);
const BAR_START = 250;
const BAR_MAX = 440;

function formatReal(nanoseconds: number): string {
  if (nanoseconds >= 1_000_000) return `${nanoseconds / 1_000_000} ms`;
  if (nanoseconds >= 1_000) return `${nanoseconds / 1_000} µs`;
  return `${nanoseconds} ns`;
}

export function LatencyLadderDiagram() {
  const [scale, setScale] = useState<Scale>("real");
  const [selectedIndex, setSelectedIndex] = useState(2);
  const selected = operations[selectedIndex];

  return (
    <DiagramFrame
      title="Thang latency (trục log) — bấm từng thao tác, đổi sang 'thang người'"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {(["real", "human"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setScale(option)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  scale === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {option === "real" ? "⏱ Thời gian thật" : "🧍 Phóng đại: 1 ns = 1 giây"}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-semibold">{selected.label}</span> ({formatReal(selected.nanoseconds)} ≈ {selected.human} ở thang người): {selected.analogy}
          </p>
        </div>
      }
      caption="Mỗi vạch chia trên trục là ×10. Thanh dài gấp đôi không có nghĩa chậm gấp đôi mà chậm hơn nhiều bậc — đó là lý do 'bớt một round trip mạng' thường đáng giá hơn tối ưu code."
    >
      {[1, 3, 5, 7, 9].map((power) => {
        const x = BAR_START + ((power - MIN_LOG) / (MAX_LOG - MIN_LOG)) * BAR_MAX;
        return (
          <g key={power}>
            <line x1={x} y1={20} x2={x} y2={270} strokeDasharray="3 4" className="stroke-stone-300 dark:stroke-stone-700" />
            <DiagramLabel x={x} y={288} text={`10^${power} ns`} size={11} />
          </g>
        );
      })}
      {operations.map((operation, index) => {
        const y = 24 + index * 41;
        const width = ((Math.log10(operation.nanoseconds) - MIN_LOG) / (MAX_LOG - MIN_LOG)) * BAR_MAX;
        const isSelected = index === selectedIndex;
        return (
          <g key={operation.label} onClick={() => setSelectedIndex(index)} className="cursor-pointer">
            <DiagramLabel x={240} y={y + 21} text={operation.label} anchor="end" size={12} bold={isSelected} />
            <DiagramNode
              x={BAR_START}
              y={y}
              width={Math.max(width, 70)}
              height={32}
              rounded={6}
              label={scale === "real" ? formatReal(operation.nanoseconds) : operation.human}
              tone={operation.tone}
              state={isSelected ? "active" : "normal"}
            />
          </g>
        );
      })}
    </DiagramFrame>
  );
}
