"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Option = "ansible" | "userdata" | "container";

interface Row {
  label: string;
  value: string;
  tone: DiagramTone;
}

const options: Record<Option, { title: string; emoji: string; rows: Row[]; bestFor: string }> = {
  ansible: {
    title: "Ansible qua SSH (server đã chạy)",
    emoji: "🧩",
    rows: [
      { label: "Tốc độ đổi", value: "Vài phút, không cần thay server", tone: "green" },
      { label: "Rủi ro drift", value: "Cao nếu chạy tuỳ hứng, không kiểm soát", tone: "rose" },
      { label: "Rollback", value: "Chạy lại playbook version cũ (nếu có)", tone: "amber" },
      { label: "Phù hợp", value: "Server dài hạn, cấu hình đổi thường xuyên (patch, user, cron)", tone: "blue" },
    ],
    bestFor: "Sửa cấu hình trên fleet đang chạy mà không muốn build lại image mỗi lần.",
  },
  userdata: {
    title: "EC2 user data (script lúc boot)",
    emoji: "🚀",
    rows: [
      { label: "Tốc độ đổi", value: "Chỉ áp dụng cho instance MỚI, không đụng máy cũ", tone: "amber" },
      { label: "Rủi ro drift", value: "Thấp cho máy mới, nhưng máy cũ vẫn chạy script cũ", tone: "amber" },
      { label: "Rollback", value: "Thay content user data + thay instance", tone: "blue" },
      { label: "Phù hợp", value: "Vài dòng cấu hình đơn giản: set hostname, join cluster, tải agent", tone: "blue" },
    ],
    bestFor: "Việc nhỏ, một lần lúc khởi động — không hợp cho logic phức tạp hay cần đảm bảo mọi máy giống nhau tuyệt đối.",
  },
  container: {
    title: "Container / golden image (Docker, Packer)",
    emoji: "📦",
    rows: [
      { label: "Tốc độ đổi", value: "Build image mới rồi rollout — chậm hơn 1 chút", tone: "amber" },
      { label: "Rủi ro drift", value: "Rất thấp: mọi bản chạy từ cùng 1 image bất biến", tone: "green" },
      { label: "Rollback", value: "Trỏ lại tag/AMI cũ — tức thì và chắc chắn", tone: "green" },
      { label: "Phù hợp", value: "App production cần nhất quán tuyệt đối, scale nhanh, audit dễ", tone: "blue" },
    ],
    bestFor: "Chuẩn cho hạ tầng chạy lâu dài, nhiều instance — kết hợp cùng Packer/Terraform ở bài trước.",
  },
};

export function ConfigToolDecisionDiagram() {
  const [option, setOption] = useState<Option>("ansible");
  const config = options[option];

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="Chọn công cụ nào để đưa cấu hình lên server?"
      viewBox="0 0 720 300"
      controls={
        <div className="flex flex-wrap gap-2">
          {(Object.keys(options) as Option[]).map((key) => (
            <button key={key} type="button" className={pill(option === key)} onClick={() => setOption(key)}>
              {options[key].emoji} {options[key].title.split(" (")[0]}
            </button>
          ))}
        </div>
      }
      caption="Cả ba đều 'đúng' tuỳ tình huống. Nhiều team production dùng cả ba: container/AMI cho app, user data cho vài dòng bootstrap, Ansible cho fleet server nền tảng (bastion, CI runner) sống lâu dài."
    >
      <DiagramNode x={20} y={16} width={680} height={50} emoji={config.emoji} label={config.title} tone="violet" state="active" />

      {config.rows.map((row, index) => (
        <g key={row.label}>
          <DiagramNode x={20} y={84 + index * 48} width={160} height={38} label={row.label} tone="slate" />
          <DiagramNode x={196} y={84 + index * 48} width={504} height={38} label={row.value} tone={row.tone} state="active" />
        </g>
      ))}

      <DiagramLabel x={360} y={288} text={config.bestFor} tone="violet" size={12.5} bold />
    </DiagramFrame>
  );
}
