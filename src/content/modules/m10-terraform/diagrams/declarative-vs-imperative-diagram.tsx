"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Approach = "imperative" | "declarative";
type Round = "first" | "second" | "drift";

const codeLines: Record<Approach, string[]> = {
  imperative: ["# create-web.sh", "for i in 1 2 3; do", "  aws ec2 run-instances \\", "    --image-id ami-0abc \\", "    --tag-specifications web", "done"],
  declarative: ["# main.tf", 'resource "aws_instance" "web" {', "  count         = 3", "  ami           = \"ami-0abc\"", "  instance_type = \"t3.micro\"", "}"],
};

const rounds: { key: Round; label: string }[] = [
  { key: "first", label: "① Chạy lần đầu" },
  { key: "second", label: "② Chạy lại lần nữa" },
  { key: "drift", label: "③ Ai đó xoá tay 1 server rồi chạy lại" },
];

interface Outcome {
  existing: number;
  created: number;
  ghost: boolean;
  verdict: string;
  good: boolean;
}

// What happens to the real AWS account for each approach × round. Desired state is always 3 servers.
const outcomes: Record<Approach, Record<Round, Outcome>> = {
  imperative: {
    first: { existing: 0, created: 3, ghost: false, good: true, verdict: "Script tạo 3 server. Có vẻ ổn… cho tới lần chạy sau." },
    second: { existing: 3, created: 3, ghost: false, good: false, verdict: "Script không nhìn thực tế — nó chỉ làm theo từng bước. Kết quả: 6 server, hoá đơn gấp đôi." },
    drift: { existing: 2, created: 3, ghost: true, good: false, verdict: "Còn 2 server, script vẫn tạo thêm 3 → thành 5. Muốn đúng phải tự viết thêm logic kiểm tra." },
  },
  declarative: {
    first: { existing: 0, created: 3, ghost: false, good: true, verdict: "Plan: 3 to add. Terraform tạo 3 server và ghi vào state." },
    second: { existing: 3, created: 0, ghost: false, good: true, verdict: "No changes. Thực tế đã khớp bản vẽ nên không làm gì — chạy bao nhiêu lần cũng vậy (idempotent)." },
    drift: { existing: 2, created: 1, ghost: true, good: true, verdict: "Plan: 1 to add. Terraform so bản vẽ (3) với thực tế (2) và chỉ tạo bù 1 server." },
  },
};

export function DeclarativeVsImperativeDiagram() {
  const [approach, setApproach] = useState<Approach>("imperative");
  const [round, setRound] = useState<Round>("first");
  const outcome = outcomes[approach][round];

  const slots: ("existing" | "ghost" | "created")[] = [
    ...Array<"existing">(outcome.existing).fill("existing"),
    ...(outcome.ghost ? (["ghost"] as const) : []),
    ...Array<"created">(outcome.created).fill("created"),
  ];
  const total = outcome.existing + outcome.created;

  const pill = (active: boolean) =>
    clsx(
      "rounded-full px-3 py-1.5 text-sm font-medium",
      active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
    );

  return (
    <DiagramFrame
      title="Chạy lại nhiều lần: kịch bản từng bước vs bản vẽ mong muốn"
      viewBox="0 0 720 290"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={pill(approach === "imperative")} onClick={() => setApproach("imperative")}>
              📋 Imperative (bash + AWS CLI)
            </button>
            <button type="button" className={pill(approach === "declarative")} onClick={() => setApproach("declarative")}>
              📐 Declarative (Terraform)
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {rounds.map((item) => (
              <button key={item.key} type="button" className={pill(round === item.key)} onClick={() => setRound(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          <p className={clsx("font-medium", outcome.good ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
            {outcome.good ? "✅ " : "⚠️ "}
            {outcome.verdict}
          </p>
        </div>
      }
      caption="Imperative = danh sách việc cần làm. Declarative = mô tả kết quả cuối cùng; công cụ tự tính phần chênh lệch giữa bản vẽ và thực tế."
    >
      <DiagramGroupBox x={10} y={10} width={260} height={210} label={approach === "imperative" ? "Kịch bản từng bước" : "Bản vẽ mong muốn"} tone={approach === "imperative" ? "amber" : "violet"}>
        {codeLines[approach].map((line, index) => (
          <text key={line} x={26} y={58 + index * 26} fontSize={12.5} className="fill-stone-800 font-mono dark:fill-stone-200">
            {line}
          </text>
        ))}
      </DiagramGroupBox>

      <DiagramArrow from={[274, 115]} to={[336, 115]} label="chạy" tone="blue" animated />

      <DiagramGroupBox x={340} y={10} width={370} height={210} label="Tài khoản AWS thật" tone="blue">
        {slots.map((kind, index) => (
          <DiagramNode
            key={`${approach}-${round}-${index}`}
            x={358 + (index % 3) * 116}
            y={42 + Math.floor(index / 3) * 86}
            width={104}
            height={70}
            emoji={kind === "ghost" ? "🗑️" : "🖥️"}
            label={kind === "ghost" ? "đã xoá tay" : `web-${index + 1}`}
            tone={kind === "ghost" ? "rose" : kind === "created" ? (outcome.good ? "green" : "rose") : "slate"}
            state={kind === "ghost" ? "dimmed" : kind === "created" ? "active" : "normal"}
            dashed={kind === "ghost"}
          />
        ))}
      </DiagramGroupBox>

      <DiagramLabel x={140} y={256} text="Mong muốn: 3 server" tone="violet" bold size={14} />
      <DiagramLabel x={525} y={256} text={`Thực tế sau khi chạy: ${total} server`} tone={total === 3 ? "green" : "rose"} bold size={14} />
      <DiagramLabel x={525} y={278} text={`(${outcome.created} server mới được tạo ở lần chạy này)`} size={12} />
    </DiagramFrame>
  );
}
