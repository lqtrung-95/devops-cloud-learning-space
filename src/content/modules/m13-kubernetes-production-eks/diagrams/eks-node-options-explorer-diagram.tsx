"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

interface OptionInfo {
  id: string;
  label: string;
  emoji: string;
  tone: DiagramTone;
  who: string;
  goodFor: string;
  tradeoff: string;
}

const options: OptionInfo[] = [
  {
    id: "managed-node-group",
    label: "Managed Node Groups",
    emoji: "🚌",
    tone: "blue",
    who: "AWS tạo/thay EC2 theo Auto Scaling Group; bạn chọn instance type, AMI, số lượng.",
    goodFor: "Workload ổn định, cần kiểm soát instance type (GPU, ARM), chạy DaemonSet.",
    tradeoff: "Bạn trả tiền cả khi node rảnh; scale chậm hơn Karpenter (phụ thuộc ASG).",
  },
  {
    id: "fargate",
    label: "Fargate Profile",
    emoji: "🧳",
    tone: "violet",
    who: "AWS cấp một 'micro-VM' riêng cho từng pod khớp Fargate profile — không có node để bạn thấy.",
    goodFor: "Workload lặt vặt, batch job, muốn zero vận hành node, isolation mạnh giữa các pod.",
    tradeoff: "Không chạy được DaemonSet; khởi động pod chậm hơn; không dùng được EBS gắn trực tiếp; đắt hơn theo pod cho workload chạy liên tục.",
  },
  {
    id: "karpenter",
    label: "Karpenter",
    emoji: "🚀",
    tone: "green",
    who: "Controller tự chọn EC2 instance type/zone tối ưu cho đúng pod đang Pending, không cần ASG cố định trước.",
    goodFor: "Tải thay đổi nhiều, muốn tối ưu chi phí (trộn Spot/On-Demand), scale nhanh (thường dưới 1 phút).",
    tradeoff: "Cần hiểu NodePool/EC2NodeClass; node bị 'consolidate' (dọn/gộp) nên không hợp workload cần node ổn định lâu dài.",
  },
];

export function EksNodeOptionsExplorerDiagram() {
  const [selectedId, setSelectedId] = useState("karpenter");
  const selected = options.find((option) => option.id === selectedId)!;

  return (
    <DiagramFrame
      title="Chọn 'kiểu cầu tàu' cho pod — bấm để so sánh"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-1 text-sm leading-relaxed">
          <p className="font-semibold text-stone-800 dark:text-stone-200">
            {selected.emoji} {selected.label}
          </p>
          <p className="text-stone-700 dark:text-stone-300">⚙️ {selected.who}</p>
          <p className="text-emerald-700 dark:text-emerald-300">✅ Hợp khi: {selected.goodFor}</p>
          <p className="text-amber-700 dark:text-amber-300">⚖️ Đánh đổi: {selected.tradeoff}</p>
        </div>
      }
      caption="Một cluster EKS có thể trộn cả ba: managed node group cho workload nền, Karpenter cho tải biến động, Fargate cho job lặt vặt/kube-system nhạy cảm."
    >
      <DiagramGroupBox x={16} y={10} width={200} height={270} label="EKS control plane" tone="violet">
        <DiagramNode x={32} y={110} width={168} height={60} label="kube-apiserver" sublabel="do AWS vận hành" tone="violet" />
      </DiagramGroupBox>
      <DiagramArrow from={[220, 140]} to={[262, 140]} tone="slate" animated />

      {options.map((option, index) => (
        <g key={option.id}>
          <DiagramNode
            x={270}
            y={20 + index * 90}
            width={430}
            height={72}
            label={`${option.emoji} ${option.label}`}
            tone={option.tone}
            state={option.id === selectedId ? "active" : "normal"}
            onClick={() => setSelectedId(option.id)}
          />
        </g>
      ))}
    </DiagramFrame>
  );
}
