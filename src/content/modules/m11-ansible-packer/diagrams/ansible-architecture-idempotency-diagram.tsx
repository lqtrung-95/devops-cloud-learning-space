"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Run = "first" | "second";

interface TaskResult {
  task: string;
  firstRun: "changed" | "ok";
  secondRun: "changed" | "ok";
}

// Same playbook, two runs against the same fleet — this is the idempotency demo.
const tasks: TaskResult[] = [
  { task: "apt: install nginx", firstRun: "changed", secondRun: "ok" },
  { task: "template: nginx.conf.j2", firstRun: "changed", secondRun: "ok" },
  { task: "service: enable + start nginx", firstRun: "changed", secondRun: "ok" },
  { task: "user: tạo user 'deploy'", firstRun: "changed", secondRun: "ok" },
];

const toneFor = (status: "changed" | "ok"): DiagramTone => (status === "changed" ? "amber" : "green");

export function AnsibleArchitectureIdempotencyDiagram() {
  const [run, setRun] = useState<Run>("first");
  const changedCount = tasks.filter((t) => t[run === "first" ? "firstRun" : "secondRun"] === "changed").length;
  const okCount = tasks.length - changedCount;

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="Agentless qua SSH + chạy cùng playbook hai lần"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={pill(run === "first")} onClick={() => setRun("first")}>
              ▶️ Lần chạy 1 (server mới)
            </button>
            <button type="button" className={pill(run === "second")} onClick={() => setRun("second")}>
              🔁 Lần chạy 2 (chạy lại y hệt)
            </button>
          </div>
          <p className={clsx("font-medium", run === "first" ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300")}>
            {run === "first"
              ? `PLAY RECAP: changed=${changedCount} ok=${okCount} — server đổi từ trạng thái trống thành đúng ý playbook.`
              : `PLAY RECAP: changed=${changedCount} ok=${okCount} — mọi thứ đã đúng nên Ansible không đụng gì (idempotent).`}
          </p>
        </div>
      }
      caption="Ansible không cần cài agent trên host: control node chỉ mở kết nối SSH tạm thời, đẩy module Python vào chạy, rồi ngắt kết nối. Mỗi task tự kiểm tra 'đã đúng trạng thái mong muốn chưa' trước khi đổi gì."
    >
      <DiagramNode x={10} y={20} width={160} height={60} emoji="💻" label="Control node" sublabel="ansible-playbook" tone="violet" state="active" />
      <DiagramGroupBox x={10} y={100} width={160} height={90} label="inventory.ini" tone="slate">
        <text x={26} y={128} fontSize={11} className="fill-stone-700 font-mono dark:fill-stone-300">
          [web]
        </text>
        <text x={26} y={144} fontSize={10.5} className="fill-stone-600 font-mono dark:fill-stone-400">
          web-1 web-2 web-3
        </text>
        <text x={26} y={160} fontSize={10.5} className="fill-stone-600 font-mono dark:fill-stone-400">
          ansible_user=ubuntu
        </text>
      </DiagramGroupBox>
      <DiagramArrow from={[172, 50]} to={[220, 50]} tone="violet" label="đọc" />
      <DiagramArrow from={[172, 145]} to={[220, 90]} tone="slate" label="đọc" />

      <DiagramGroupBox x={224} y={10} width={486} height={280} label="Fleet web (không cài agent)" tone="blue">
        {["web-1", "web-2", "web-3"].map((host, hostIndex) => (
          <DiagramNode key={host} x={244 + hostIndex * 158} y={32} width={140} height={44} emoji="🖥️" label={host} sublabel="SSH :22" tone="cyan" state="active" />
        ))}

        {tasks.map((item, taskIndex) => {
          const status = item[run === "first" ? "firstRun" : "secondRun"];
          return (
            <g key={item.task}>
              <text x={244} y={104 + taskIndex * 44} fontSize={11.5} className="fill-stone-800 font-mono dark:fill-stone-200">
                {item.task}
              </text>
              <DiagramNode x={520} y={90 + taskIndex * 44} width={110} height={30} label={status} tone={toneFor(status)} state="active" />
            </g>
          );
        })}
      </DiagramGroupBox>
    </DiagramFrame>
  );
}
