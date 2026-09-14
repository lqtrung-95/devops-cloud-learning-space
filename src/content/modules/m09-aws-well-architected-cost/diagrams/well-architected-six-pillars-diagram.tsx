"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type PillarKey = "ops" | "security" | "reliability" | "performance" | "cost" | "sustainability";

const pillars: Record<PillarKey, { title: string; emoji: string; tone: DiagramTone; analogy: string; questions: string[] }> = {
  ops: {
    title: "Operational Excellence",
    emoji: "🛠️",
    tone: "slate",
    analogy: "Nhà bếp có quy trình chuẩn, ghi chép lại mọi thay đổi công thức — không phải nhớ trong đầu đầu bếp trưởng.",
    questions: ["Thay đổi hạ tầng có qua IaC + PR review không?", "Runbook và alarm có đủ để xử lý sự cố lúc 3h sáng không?", "Có học được gì sau mỗi sự cố (postmortem) không?"],
  },
  security: {
    title: "Security",
    emoji: "🔒",
    tone: "rose",
    analogy: "Nhiều lớp bảo vệ: bảo vệ cổng, camera, khoá từng phòng — mất một lớp vẫn còn lớp khác (defense in depth).",
    questions: ["Least privilege cho từng IAM role/user chưa?", "Dữ liệu có mã hoá cả khi lưu (at rest) và khi truyền (in transit)?", "Có ai theo dõi CloudTrail/GuardDuty không?"],
  },
  reliability: {
    title: "Reliability",
    emoji: "🛡️",
    tone: "blue",
    analogy: "Nhà hàng có bếp dự phòng ở chi nhánh khác — một chi nhánh cháy, khách vẫn được phục vụ.",
    questions: ["Hệ thống có tự phục hồi khi 1 AZ/instance chết không?", "Có test failover thật (không chỉ đọc tài liệu) không?", "RTO/RPO đã định nghĩa và đo thử chưa?"],
  },
  performance: {
    title: "Performance Efficiency",
    emoji: "⚡",
    tone: "amber",
    analogy: "Chọn đúng cỡ xe cho đúng việc: xe máy giao đồ ăn nhanh, xe tải chở hàng nặng — không dùng xe tải để giao 1 tô phở.",
    questions: ["Instance type/DB class có đúng với tải thật không?", "Có dùng cache/CDN để giảm tải cho phần chậm nhất không?", "Có đo lại hiệu năng khi tải thay đổi không?"],
  },
  cost: {
    title: "Cost Optimization",
    emoji: "💰",
    tone: "green",
    analogy: "Tắt đèn phòng không dùng, thuê xe theo mùa vụ (Spot) thay vì mua đứt cho việc không thường xuyên.",
    questions: ["Có resource nào chạy 0% tải nhưng vẫn tính tiền không?", "Tải ổn định đã dùng Savings Plans/Reserved chưa?", "Có gắn tag để biết ai/dự án nào tiêu tiền không?"],
  },
  sustainability: {
    title: "Sustainability",
    emoji: "🌱",
    tone: "cyan",
    analogy: "Dùng vừa đủ điện, tắt máy khi không cần — như tắt điều hoà phòng trống thay vì để chạy cả ngày.",
    questions: ["Có xoá resource dev/test không dùng cuối ngày không?", "Region chọn có gần user và có năng lượng sạch hơn không?", "Kiến trúc có tận dụng managed service thay vì tự chạy dư thừa không?"],
  },
};

const layout: Record<PillarKey, { x: number; y: number }> = {
  ops: { x: 20, y: 20 },
  security: { x: 260, y: 20 },
  reliability: { x: 500, y: 20 },
  performance: { x: 20, y: 130 },
  cost: { x: 260, y: 130 },
  sustainability: { x: 500, y: 130 },
};

export function WellArchitectedSixPillarsDiagram() {
  const [selected, setSelected] = useState<PillarKey>("reliability");
  const info = pillars[selected];

  return (
    <DiagramFrame
      title="6 trụ cột Well-Architected — bấm để xem chi tiết"
      viewBox="0 0 720 240"
      controls={
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-indigo-700 dark:text-indigo-300">
            {info.emoji} {info.title}
          </p>
          <p className="text-stone-700 dark:text-stone-300">{info.analogy}</p>
          <p className="font-medium text-stone-600 dark:text-stone-400">Tự hỏi khi review kiến trúc:</p>
          <ul className="list-disc space-y-0.5 pl-5 text-stone-600 dark:text-stone-400">
            {info.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      }
      caption="Well-Architected Tool trên Console cho bạn trả lời từng câu hỏi theo 6 trụ cột này và liệt kê rủi ro (High/Medium risk) cho kiến trúc bạn vẽ."
    >
      {(Object.keys(pillars) as PillarKey[]).map((key) => {
        const position = layout[key];
        const pillar = pillars[key];
        return (
          <DiagramNode
            key={key}
            x={position.x}
            y={position.y}
            width={200}
            height={90}
            label={pillar.title}
            sublabel={pillar.emoji}
            tone={pillar.tone}
            state={selected === key ? "active" : "normal"}
            onClick={() => setSelected(key)}
          />
        );
      })}
    </DiagramFrame>
  );
}
