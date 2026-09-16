"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Tier = "block" | "file" | "object";

const tiers: Record<
  Tier,
  { button: string; unit: string; access: string; example: string; note: string }
> = {
  block: {
    button: "Block storage",
    unit: "Block cố định kích thước",
    access: "Gắn (attach) vào đúng 1 instance, format thành filesystem, đọc/ghi ngẫu nhiên tốc độ cao",
    example: "AWS EBS — ổ đĩa của Postgres primary",
    note: "Như thuê hẳn 1 phòng riêng: nhanh, riêng tư, nhưng chỉ 1 người ở được cùng lúc.",
  },
  file: {
    button: "File storage",
    unit: "File trong cây thư mục (POSIX)",
    access: "Nhiều instance mount cùng lúc qua NFS, đọc/ghi như ổ đĩa mạng dùng chung",
    example: "AWS EFS — thư mục upload dùng chung giữa nhiều server cũ chưa tách object storage",
    note: "Như ổ đĩa mạng văn phòng: ai cũng vào được, nhưng chậm hơn ổ riêng và khó scale ra hàng triệu file nhỏ.",
  },
  object: {
    button: "Object storage",
    unit: "Object = key + blob + metadata (phẳng, không thư mục thật)",
    access: "HTTP API: PUT/GET/DELETE nguyên object; không sửa một phần, phải ghi lại cả object",
    example: "AWS S3 / MinIO — nơi lưu file người dùng upload",
    note: "Như kho tự quản khổng lồ: đưa đúng mã (key) là lấy được, xe nâng lo hết, nhưng không 'sửa từng dòng' trong kiện hàng.",
  },
};

const order: Tier[] = ["block", "file", "object"];

export function StorageTierComparisonDiagram() {
  const [tier, setTier] = useState<Tier>("object");
  const info = tiers[tier];

  return (
    <DiagramFrame
      title="Block vs File vs Object storage — bấm để xem cách truy cập"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {order.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTier(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  tier === key ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {tiers[key].button}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <strong>Đơn vị dữ liệu:</strong> {info.unit}
            <br />
            <strong>Truy cập:</strong> {info.access}
            <br />
            <strong>Ví dụ:</strong> {info.example}
          </p>
        </div>
      }
      caption={info.note}
    >
      <DiagramNode x={10} y={110} width={110} height={70} label="App server" emoji="🖥️" tone="violet" state="active" />

      <DiagramGroupBox x={170} y={20} width={160} height={260} label="Block" tone={tier === "block" ? "blue" : "slate"}>
        <DiagramNode
          x={185}
          y={70}
          width={130}
          height={70}
          label="EBS volume"
          sublabel="1 instance"
          emoji="💽"
          tone="blue"
          state={tier === "block" ? "active" : "dimmed"}
        />
        <DiagramNode
          x={185}
          y={170}
          width={130}
          height={70}
          label="ext4 / xfs"
          sublabel="filesystem"
          tone="blue"
          state={tier === "block" ? "normal" : "dimmed"}
        />
      </DiagramGroupBox>

      <DiagramGroupBox x={360} y={20} width={160} height={260} label="File" tone={tier === "file" ? "amber" : "slate"}>
        <DiagramNode
          x={375}
          y={70}
          width={130}
          height={70}
          label="EFS / NFS"
          sublabel="nhiều instance mount"
          emoji="🗄️"
          tone="amber"
          state={tier === "file" ? "active" : "dimmed"}
        />
        <DiagramNode
          x={375}
          y={170}
          width={130}
          height={70}
          label="/uploads/2026/…"
          sublabel="cây thư mục"
          tone="amber"
          state={tier === "file" ? "normal" : "dimmed"}
        />
      </DiagramGroupBox>

      <DiagramGroupBox x={550} y={20} width={160} height={260} label="Object" tone={tier === "object" ? "green" : "slate"}>
        <DiagramNode
          x={565}
          y={70}
          width={130}
          height={70}
          label="S3 / MinIO"
          sublabel="HTTP API"
          emoji="📦"
          tone="green"
          state={tier === "object" ? "active" : "dimmed"}
        />
        <DiagramNode
          x={565}
          y={170}
          width={130}
          height={70}
          label="key: uploads/ab12.jpg"
          sublabel="phẳng, không thư mục thật"
          tone="green"
          state={tier === "object" ? "normal" : "dimmed"}
        />
      </DiagramGroupBox>

      <DiagramArrow
        from={[120, 130]}
        to={[182, 105]}
        tone="blue"
        dimmed={tier !== "block"}
        label="mount, đọc/ghi block"
      />
      <DiagramArrow
        from={[120, 145]}
        to={[372, 105]}
        tone="amber"
        dimmed={tier !== "file"}
        curve={-40}
        label="NFS mount"
      />
      <DiagramArrow
        from={[120, 160]}
        to={[562, 105]}
        tone="green"
        dimmed={tier !== "object"}
        curve={-70}
        label="PUT/GET theo key"
      />
    </DiagramFrame>
  );
}
