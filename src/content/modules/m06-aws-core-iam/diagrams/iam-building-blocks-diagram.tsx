"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { InlineCodeText } from "@/components/ui/inline-code-text";

type NodeId = "user" | "group" | "policy" | "ec2" | "role" | "bucket" | "bucketPolicy";

interface IamNode {
  label: string;
  sublabel: string;
  tone: DiagramTone;
  x: number;
  y: number;
  hotel: string;
  technical: string;
}

const NODE_WIDTH = 176;
const NODE_HEIGHT = 62;

const iamNodes: Record<NodeId, IamNode> = {
  user: { label: "👤 IAM User", sublabel: "trung", tone: "violet", x: 20, y: 18, hotel: "Nhân viên có thẻ từ riêng dùng lâu dài.", technical: "Danh tính cho một người/app với credential dài hạn: mật khẩu console và/hoặc access key. Hạn chế tạo — ưu tiên Identity Center và role." },
  group: { label: "👥 Group", sublabel: "developers", tone: "blue", x: 272, y: 18, hotel: "Bộ phận Buồng phòng: gán quyền cho bộ phận, ai vào bộ phận là có quyền.", technical: "Tập hợp user để gắn policy chung. Group KHÔNG phải principal: không đăng nhập được, không lồng group trong group, không ghi vào `Principal` của policy." },
  policy: { label: "📜 Identity policy", sublabel: "S3ReadOnly", tone: "amber", x: 524, y: 18, hotel: "Quy định in trên thẻ: được mở cửa tầng nào, phòng nào.", technical: "JSON gồm `Effect`, `Action`, `Resource`, `Condition`. Gắn vào user/group/role. Có loại AWS managed, customer managed và inline." },
  ec2: { label: "🖥️ EC2 instance", sublabel: "app chạy trên máy", tone: "slate", x: 20, y: 200, hotel: "Vị khách được lễ tân phát thẻ tạm thời.", technical: "Không cần access key trong code: EC2 nhận role qua instance profile, SDK tự lấy credential tạm thời từ metadata service." },
  role: { label: "🎭 IAM Role", sublabel: "app-ec2-role", tone: "green", x: 272, y: 200, hotel: "Thẻ khách tạm thời: hết hạn sau vài giờ, ai được nhận thẻ ghi rõ ở quầy lễ tân.", technical: "Danh tính không có credential dài hạn. Trust policy quy định AI được `sts:AssumeRole`; permissions policy quy định được LÀM GÌ. STS trả credential tạm thời." },
  bucket: { label: "🪣 S3 bucket", sublabel: "company-reports", tone: "cyan", x: 524, y: 128, hotel: "Căn phòng cần bảo vệ.", technical: "Resource có ARN `arn:aws:s3:::company-reports`. Action trên object dùng ARN `.../company-reports/*`." },
  bucketPolicy: { label: "📌 Bucket policy", sublabel: "resource-based", tone: "rose", x: 524, y: 240, hotel: "Tấm biển dán ngay trên cửa phòng: chỉ những ai có tên trong biển mới được vào.", technical: "Policy gắn vào chính resource, có thêm phần `Principal` (ai). Dùng được để cấp quyền cho account khác. S3, SQS, KMS, Lambda… đều có resource-based policy." },
};

// Edges with the node ids they connect, so clicking a node highlights its relationships.
const edges: { from: NodeId; to: NodeId; label: string; start: [number, number]; end: [number, number]; curve?: number }[] = [
  { from: "user", to: "group", label: "thành viên", start: [198, 49], end: [268, 49] },
  { from: "group", to: "policy", label: "gắn policy", start: [450, 49], end: [520, 49] },
  { from: "policy", to: "bucket", label: "cho đọc", start: [612, 82], end: [612, 124] },
  { from: "ec2", to: "role", label: "assume", start: [198, 231], end: [268, 231] },
  { from: "role", to: "bucket", label: "ghi log", start: [450, 215], end: [520, 168] },
  { from: "bucketPolicy", to: "bucket", label: "gắn vào", start: [612, 238], end: [612, 192] },
];

export function IamBuildingBlocksDiagram() {
  const [selectedId, setSelectedId] = useState<NodeId>("role");
  const selected = iamNodes[selectedId];

  return (
    <DiagramFrame
      title="Các mảnh ghép IAM — bấm vào từng khối"
      viewBox="0 0 720 316"
      controls={
        <div className="space-y-1.5 text-sm leading-relaxed">
          <p className="font-bold text-indigo-700 dark:text-indigo-300">
            {selected.label} · <span className="font-mono">{selected.sublabel}</span>
          </p>
          <p className="text-stone-700 dark:text-stone-300">
            <strong>🏨 Khách sạn:</strong> {selected.hotel}
          </p>
          <p className="text-stone-600 dark:text-stone-400">
            <strong>⚙️ Kỹ thuật:</strong> <InlineCodeText text={selected.technical} />
          </p>
        </div>
      }
      caption="Hàng trên: người dùng lâu dài nhận quyền qua group. Hàng dưới: máy/app nhận quyền tạm thời qua role. Bên phải: resource có thể tự dán 'biển quy định' riêng (resource-based policy)."
    >
      {edges.map((edge) => {
        const isRelated = edge.from === selectedId || edge.to === selectedId;
        return (
          <DiagramArrow
            key={`${edge.from}-${edge.to}`}
            from={edge.start}
            to={edge.end}
            label={edge.label}
            curve={edge.curve}
            tone={isRelated ? iamNodes[selectedId].tone : "slate"}
            animated={isRelated}
            dimmed={!isRelated}
          />
        );
      })}
      {(Object.keys(iamNodes) as NodeId[]).map((id) => {
        const node = iamNodes[id];
        return (
          <DiagramNode
            key={id}
            x={node.x}
            y={node.y}
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            label={node.label}
            sublabel={node.sublabel}
            tone={node.tone}
            state={id === selectedId ? "active" : "normal"}
            onClick={() => setSelectedId(id)}
          />
        );
      })}
    </DiagramFrame>
  );
}
