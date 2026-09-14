"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Mode = "mutable" | "immutable";

interface Server {
  name: string;
  detail: string;
  tone: DiagramTone;
}

interface Round {
  label: string;
  source: string;
  servers: Server[];
  verdict: string;
  good: boolean;
}

const ok = (name: string, detail: string): Server => ({ name, detail, tone: "green" });
const warn = (name: string, detail: string): Server => ({ name, detail, tone: "amber" });
const bad = (name: string, detail: string): Server => ({ name, detail, tone: "rose" });

// Each round is the fleet state after one real-life event (deploy, hotfix, scale out).
const rounds: Record<Mode, Round[]> = {
  mutable: [
    { label: "① Cài lần đầu", source: "Ansible qua SSH", servers: [ok("web-1", "app v1"), ok("web-2", "app v1"), ok("web-3", "app v1")], verdict: "Ổn: 3 server vừa cài xong nên giống nhau.", good: true },
    { label: "② Nâng cấp app v2", source: "Ansible qua SSH", servers: [ok("web-1", "app v2"), ok("web-2", "app v2"), warn("web-3", "v1 — apt lỗi giữa chừng")], verdict: "Cập nhật tại chỗ: một server lỗi giữa chừng và kẹt ở trạng thái lưng chừng.", good: false },
    { label: "③ Hotfix lúc 2h sáng", source: "SSH sửa tay", servers: [warn("web-1", "v2 + sửa tay nginx.conf"), ok("web-2", "app v2"), bad("web-3", "v1 — bị quên")], verdict: "Config drift: 3 server thành 3 'bông tuyết' (snowflake) khác nhau, không ai nhớ đã sửa gì.", good: false },
    { label: "④ Scale out thêm 1 server", source: "Ansible trên máy mới", servers: [warn("web-1", "v2 + sửa tay"), ok("web-2", "app v2"), bad("web-3", "app v1"), warn("web-4", "v2, thiếu hotfix")], verdict: "Máy mới cài từ playbook nhưng thiếu các sửa tay → lỗi chỉ xuất hiện trên 1/4 request.", good: false },
  ],
  immutable: [
    { label: "① Cài lần đầu", source: "AMI v1 (Packer)", servers: [ok("web-1", "ami-v1"), ok("web-2", "ami-v1"), ok("web-3", "ami-v1")], verdict: "Cả 3 server boot từ cùng một image đã test.", good: true },
    { label: "② Nâng cấp app v2", source: "AMI v2 (Packer)", servers: [ok("web-4", "ami-v2"), ok("web-5", "ami-v2"), ok("web-6", "ami-v2")], verdict: "Không nâng cấp tại chỗ: build AMI v2, thay server mới rồi xoá server cũ. Lỗi build → AMI không được tạo, fleet cũ vẫn chạy.", good: true },
    { label: "③ Hotfix lúc 2h sáng", source: "AMI v3 (Packer)", servers: [ok("web-7", "ami-v3"), ok("web-8", "ami-v3"), ok("web-9", "ami-v3")], verdict: "Không SSH sửa tay: sửa code → pipeline build AMI v3 → instance refresh. Rollback = trỏ lại AMI v2.", good: true },
    { label: "④ Scale out thêm 1 server", source: "AMI v3 (Packer)", servers: [ok("web-7", "ami-v3"), ok("web-8", "ami-v3"), ok("web-9", "ami-v3"), ok("web-10", "ami-v3")], verdict: "Máy mới giống hệt từng byte vì boot từ cùng AMI v3.", good: true },
  ],
};

export function MutableVsImmutableInfrastructureDiagram() {
  const [mode, setMode] = useState<Mode>("mutable");
  const [roundIndex, setRoundIndex] = useState(0);
  const round = rounds[mode][roundIndex];

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="Sửa nhà tại chỗ vs xây căn mới: fleet 3 server qua 4 sự kiện"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={pill(mode === "mutable")} onClick={() => setMode("mutable")}>
              🔧 Mutable (sửa tại chỗ)
            </button>
            <button type="button" className={pill(mode === "immutable")} onClick={() => setMode("immutable")}>
              📦 Immutable (thay bằng image mới)
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {rounds[mode].map((item, index) => (
              <button key={item.label} type="button" className={pill(roundIndex === index)} onClick={() => setRoundIndex(index)}>
                {item.label}
              </button>
            ))}
          </div>
          <p className={clsx("font-medium", round.good ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
            {round.good ? "✅ " : "⚠️ "}
            {round.verdict}
          </p>
        </div>
      }
      caption="Mutable: server sống lâu, được sửa dần theo thời gian (dễ lệch nhau). Immutable: không sửa server đang chạy — muốn đổi gì thì build image mới và thay cả server."
    >
      <DiagramNode
        x={10}
        y={90}
        width={170}
        height={80}
        emoji={mode === "mutable" ? "🔧" : "📀"}
        label={round.source}
        sublabel={mode === "mutable" ? "thay đổi đổ vào server cũ" : "server mới từ image"}
        tone={mode === "mutable" ? "amber" : "violet"}
        state="active"
      />
      <DiagramArrow from={[184, 130]} to={[232, 130]} tone={mode === "mutable" ? "amber" : "violet"} animated label={mode === "mutable" ? "SSH" : "launch"} />

      <DiagramGroupBox x={236} y={20} width={474} height={220} label="Auto Scaling Group: web" tone="blue">
        {round.servers.map((server, index) => (
          <DiagramNode
            key={`${mode}-${roundIndex}-${server.name}`}
            x={252 + (index % 2) * 228}
            y={50 + Math.floor(index / 2) * 92}
            width={214}
            height={78}
            emoji={server.tone === "green" ? "🖥️" : server.tone === "amber" ? "🩹" : "🧟"}
            label={server.name}
            sublabel={server.detail}
            tone={server.tone}
            state={server.tone === "green" ? "normal" : "active"}
          />
        ))}
      </DiagramGroupBox>

      <DiagramLabel
        x={473}
        y={266}
        text={round.good ? "Mọi server giống nhau → dễ debug, dễ rollback" : "Các server không còn giống nhau → 'chạy trên máy này mà máy kia lỗi'"}
        tone={round.good ? "green" : "rose"}
        bold
        size={13}
      />
    </DiagramFrame>
  );
}
