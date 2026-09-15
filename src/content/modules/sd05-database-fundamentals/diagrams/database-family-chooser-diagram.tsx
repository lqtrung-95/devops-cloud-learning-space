"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type FamilyKey = "relational" | "key-value" | "document" | "wide-column" | "graph";

const families: { key: FamilyKey; label: string; sublabel: string; emoji: string; tone: DiagramTone; strength: string }[] = [
  { key: "relational", label: "Relational", sublabel: "PostgreSQL, MySQL", emoji: "📒", tone: "blue", strength: "join, transaction" },
  { key: "key-value", label: "Key-value", sublabel: "Redis, DynamoDB", emoji: "🔑", tone: "green", strength: "get theo key" },
  { key: "document", label: "Document", sublabel: "MongoDB, jsonb", emoji: "📁", tone: "amber", strength: "đọc cả document" },
  { key: "wide-column", label: "Wide-column", sublabel: "Cassandra, Scylla", emoji: "🧱", tone: "cyan", strength: "ghi nhiều, theo partition" },
  { key: "graph", label: "Graph", sublabel: "Neo4j, Neptune", emoji: "🕸️", tone: "violet", strength: "đi nhiều bước quan hệ" },
];

interface Workload {
  title: string;
  accessPattern: string;
  pick: FamilyKey;
  alternative?: FamilyKey;
  why: string;
  changeMind: string;
}

const workloads: Workload[] = [
  {
    title: "💸 Trừ tiền ví / đặt hàng",
    accessPattern: "ghi nhiều bảng cùng lúc + đối soát tuỳ ý",
    pick: "relational",
    why: "Cần transaction ACID trên nhiều dòng/bảng, ràng buộc (`CHECK balance >= 0`, foreign key) và truy vấn ad-hoc khi đối soát.",
    changeMind: "Khi lượng ghi vượt sức một primary dù đã tối ưu query, index và tách đọc sang replica → cân nhắc sharding (SD06).",
  },
  {
    title: "🛒 Session / giỏ hàng theo userId",
    accessPattern: "luôn đọc/ghi đúng 1 key, cần TTL",
    pick: "key-value",
    alternative: "document",
    why: "Mọi thao tác đều biết trước key (`cart:<userId>`), value nhỏ, cần latency thấp và tự hết hạn.",
    changeMind: "Khi xuất hiện câu hỏi kiểu 'giỏ hàng nào đang chứa sản phẩm X?' → cần secondary index, key-value thuần không trả lời được.",
  },
  {
    title: "🧥 Catalog: mỗi loại hàng một bộ thuộc tính",
    accessPattern: "đọc nguyên 1 sản phẩm, thuộc tính thay đổi theo loại",
    pick: "document",
    alternative: "relational",
    why: "Áo có size/màu, laptop có CPU/RAM — lưu thành document lồng nhau, đọc một lần là đủ, không cần join.",
    changeMind: "Nếu hệ thống đã chạy Postgres: cột `jsonb` + GIN index thường đủ, khỏi vận hành thêm một database.",
  },
  {
    title: "📡 Metric IoT: 10⁵ thiết bị gửi mỗi giây",
    accessPattern: "ghi liên tục, đọc theo (device, khoảng thời gian)",
    pick: "wide-column",
    alternative: "relational",
    why: "Partition key = device, clustering key = thời gian; storage LSM chịu ghi tuần tự lượng lớn và scale ngang theo partition.",
    changeMind: "Nếu volume nhỏ hơn nhiều (cần ước lượng!) → Postgres với table partitioning theo thời gian thường đơn giản hơn.",
  },
  {
    title: "🤝 Gợi ý 'bạn của bạn của bạn'",
    accessPattern: "duyệt quan hệ nhiều bước",
    pick: "graph",
    alternative: "relational",
    why: "Truy vấn đi 3–4 bước quan hệ là thao tác gốc của graph DB; với SQL mỗi bước là một join tự nối vào chính bảng đó.",
    changeMind: "Chỉ cần 1–2 bước → SQL join hoặc `WITH RECURSIVE` là đủ, đừng thêm database mới chỉ vì chữ 'graph'.",
  },
];

const NODE_WIDTH = 132;
const familyX = (index: number) => 10 + index * 142;

export function DatabaseFamilyChooserDiagram() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const workload = workloads[selectedIndex];

  return (
    <DiagramFrame
      title="Chọn họ database theo access pattern — bấm từng workload"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {workloads.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  index === selectedIndex ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {item.title}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-semibold">Vì sao: </span>
            {workload.why}
          </p>
          <p className="leading-relaxed text-stone-600 dark:text-stone-400">
            <span className="font-semibold">Khi nào đổi ý: </span>
            {workload.changeMind}
          </p>
        </div>
      }
      caption="Mũi tên xanh = lựa chọn chính, mũi tên vàng nét đứt = phương án thay thế chấp nhận được. Câu hỏi đúng không phải 'SQL hay NoSQL?' mà là 'dữ liệu được đọc/ghi theo hình dạng nào?'."
    >
      <DiagramNode x={170} y={14} width={380} height={64} label={workload.title} sublabel={workload.accessPattern} tone="slate" state="active" />
      {families.map((family, index) => {
        const isPick = family.key === workload.pick;
        const isAlternative = family.key === workload.alternative;
        const centerX = familyX(index) + NODE_WIDTH / 2;
        return (
          <g key={family.key}>
            {(isPick || isAlternative) && (
              <DiagramArrow from={[360, 80]} to={[centerX, 142]} tone={isPick ? "green" : "amber"} animated={isPick} curve={isAlternative ? 18 : 0} />
            )}
            <DiagramNode
              x={familyX(index)}
              y={146}
              width={NODE_WIDTH}
              height={92}
              emoji={family.emoji}
              label={family.label}
              sublabel={family.sublabel}
              tone={family.tone}
              state={isPick ? "active" : isAlternative ? "normal" : "dimmed"}
              dashed={isAlternative}
            />
            <DiagramLabel x={centerX} y={262} text={family.strength} size={11} tone={family.tone} />
          </g>
        );
      })}
      <DiagramLabel x={360} y={290} text="Mỗi họ giỏi một hình dạng truy vấn" size={12} bold />
    </DiagramFrame>
  );
}
