"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Lever = "right-sizing" | "savings-plans" | "spot" | "tagging";

const levers: Record<Lever, { title: string; emoji: string; tone: DiagramTone; before: string; after: string; watch: string }> = {
  "right-sizing": {
    title: "Right-sizing",
    emoji: "📏",
    tone: "amber",
    before: "m5.2xlarge, CPU trung bình 6%",
    after: "t4g.large đủ dùng, giám sát bằng CloudWatch trong 2 tuần trước khi đổi",
    watch: "Đổi family (Intel→Graviton) có thể cần build lại image/binary tương thích arm64.",
  },
  "savings-plans": {
    title: "Savings Plans / Reserved",
    emoji: "📆",
    tone: "blue",
    before: "On-Demand cho toàn bộ EC2 chạy 24/7 quanh năm",
    after: "Compute Savings Plans cam kết 1–3 năm cho phần tải nền tảng ổn định",
    watch: "Chỉ cam kết cho tải chắc chắn còn dùng lâu dài — cam kết sai dự báo là tự trói chi phí.",
  },
  spot: {
    title: "Spot Instances",
    emoji: "🎯",
    tone: "violet",
    before: "Batch job/CI runner chạy On-Demand dù có thể gián đoạn được",
    after: "Spot cho job chịu được bị ngắt (rẻ hơn nhiều so với On-Demand)",
    watch: "AWS có thể thu hồi Spot với cảnh báo ngắn (2 phút) — không dùng cho phần không chịu được gián đoạn (vd primary DB).",
  },
  tagging: {
    title: "Tagging strategy",
    emoji: "🏷️",
    tone: "green",
    before: "Hoá đơn tổng, không biết dự án nào tốn nhiều",
    after: "Mọi resource có tag project/env/owner → Cost Explorer lọc chi phí theo tag",
    watch: "Tag phải bắt buộc từ lúc tạo (IaC + policy), không thể gắn hồi tố dễ dàng cho resource đã tạo trước đó.",
  },
};

const order: Lever[] = ["right-sizing", "savings-plans", "spot", "tagging"];

export function CostOptimizationLeversDiagram() {
  const [lever, setLever] = useState<Lever>("right-sizing");
  const info = levers[lever];

  return (
    <DiagramFrame
      title="4 đòn bẩy giảm chi phí AWS — bấm để xem trước/sau"
      viewBox="0 0 720 240"
      controls={
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-indigo-700 dark:text-indigo-300">
            {info.emoji} {info.title}
          </p>
          <p className="text-stone-700 dark:text-stone-300">
            <span className="font-medium">Lưu ý:</span> {info.watch}
          </p>
        </div>
      }
      caption="Không có đòn bẩy nào 'luôn đúng' — mỗi cái có điều kiện áp dụng. Dùng sai chỗ (vd Spot cho database chính) gây rủi ro hơn là tiết kiệm."
    >
      {order.map((key, index) => (
        <DiagramNode
          key={key}
          x={20 + index * 175}
          y={10}
          width={160}
          height={70}
          label={levers[key].title}
          sublabel={levers[key].emoji}
          tone={levers[key].tone}
          state={lever === key ? "active" : "normal"}
          onClick={() => setLever(key)}
        />
      ))}

      <DiagramNode x={30} y={110} width={310} height={100} label="Trước" sublabel={info.before} tone="rose" state="active" />
      <DiagramNode x={380} y={110} width={310} height={100} label="Sau" sublabel={info.after} tone="green" state="active" />
    </DiagramFrame>
  );
}
