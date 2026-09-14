"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Env = "dev" | "staging" | "prod";

interface EnvConfig {
  tone: DiagramTone;
  inputs: string[];
  vpc: string;
  asg: string;
  rds: string;
  monthly: string;
}

// Same three modules, different inputs per environment root module.
const envs: Record<Env, EnvConfig> = {
  dev: {
    tone: "green",
    inputs: ['cidr          = "10.10.0.0/16"', "az_count      = 2", "single_nat    = true", 'instance_type = "t3.micro"', "asg_min       = 1", "rds_multi_az  = false"],
    vpc: "2 AZ · 1 NAT",
    asg: "t3.micro × 1–2",
    rds: "db.t4g.micro · 1 AZ",
    monthly: "rẻ, chấp nhận downtime",
  },
  staging: {
    tone: "amber",
    inputs: ['cidr          = "10.20.0.0/16"', "az_count      = 2", "single_nat    = true", 'instance_type = "t3.small"', "asg_min       = 2", "rds_multi_az  = false"],
    vpc: "2 AZ · 1 NAT",
    asg: "t3.small × 2–4",
    rds: "db.t4g.small · 1 AZ",
    monthly: "giống prod về hình dạng, nhỏ hơn",
  },
  prod: {
    tone: "rose",
    inputs: ['cidr          = "10.30.0.0/16"', "az_count      = 3", "single_nat    = false", 'instance_type = "t3.medium"', "asg_min       = 3", "rds_multi_az  = true"],
    vpc: "3 AZ · 3 NAT",
    asg: "t3.medium × 3–9",
    rds: "db.r6g.large · Multi-AZ",
    monthly: "HA đầy đủ, đắt nhất",
  },
};

const modules = [
  { key: "vpc", label: "modules/vpc", emoji: "🌐" },
  { key: "asg", label: "modules/alb-asg", emoji: "⚖️" },
  { key: "rds", label: "modules/rds", emoji: "🗄️" },
] as const;

export function ModuleEnvironmentsDiagram() {
  const [env, setEnv] = useState<Env>("dev");
  const [focus, setFocus] = useState<(typeof modules)[number]["key"] | null>(null);
  const config = envs[env];

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="Một bộ module — nhiều môi trường"
      viewBox="0 0 720 320"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(envs) as Env[]).map((key) => (
              <button key={key} type="button" className={pill(env === key)} onClick={() => setEnv(key)}>
                📁 envs/{key}
              </button>
            ))}
          </div>
          <p className="text-stone-700 dark:text-stone-300">
            Bấm vào từng module trong hình để làm nổi bật. State của môi trường này nằm ở key{" "}
            <code className="rounded bg-stone-100 px-1 font-mono text-indigo-700 dark:bg-stone-800 dark:text-indigo-300">{env}/terraform.tfstate</code> — tách hẳn khỏi môi trường khác.
          </p>
        </div>
      }
      caption="Module giống bản thiết kế căn hộ mẫu: cùng một bản vẽ, nhưng mỗi toà (env) chọn diện tích, số tầng, vật liệu khác nhau qua biến đầu vào."
    >
      <DiagramGroupBox x={10} y={10} width={250} height={250} label={`envs/${env}/main.tf`} tone={config.tone}>
        {config.inputs.map((line, index) => (
          <text key={line} x={24} y={60 + index * 30} fontSize={12} className="fill-stone-800 font-mono dark:fill-stone-200" style={{ whiteSpace: "pre" }}>
            {line}
          </text>
        ))}
      </DiagramGroupBox>

      {modules.map((item, index) => {
        const y = 22 + index * 82;
        const result = config[item.key];
        const dimmed = focus !== null && focus !== item.key;
        return (
          <g key={item.key}>
            <DiagramArrow from={[262, 135]} to={[296, y + 30]} tone={config.tone} dimmed={dimmed} />
            <DiagramNode
              x={300}
              y={y}
              width={170}
              height={60}
              label={`${item.emoji} ${item.label}`}
              sublabel="bấm để xem"
              tone="violet"
              state={focus === item.key ? "active" : dimmed ? "dimmed" : "normal"}
              onClick={() => setFocus(focus === item.key ? null : item.key)}
            />
            <DiagramArrow from={[472, y + 30]} to={[516, y + 30]} tone={config.tone} animated={focus === item.key} dimmed={dimmed} />
            <DiagramNode x={520} y={y} width={190} height={60} label={result} sublabel={`AWS · ${env}`} tone={config.tone} state={dimmed ? "dimmed" : focus === item.key ? "active" : "normal"} />
          </g>
        );
      })}

      <DiagramLabel x={135} y={290} text="Đầu vào (variables)" tone="slate" bold />
      <DiagramLabel x={385} y={290} text="Code dùng chung" tone="violet" bold />
      <DiagramLabel x={615} y={290} text={config.monthly} tone={config.tone} bold />
      <DiagramLabel x={360} y={312} text="Đổi môi trường = đổi input + state riêng, KHÔNG copy-paste code" size={12} />
    </DiagramFrame>
  );
}
