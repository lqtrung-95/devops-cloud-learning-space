"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";

const roles = [
  { key: "owner", label: "Owner (u)", sublabel: "chủ file: trung", emoji: "👤" },
  { key: "group", label: "Group (g)", sublabel: "nhóm: devops", emoji: "👥" },
  { key: "others", label: "Others (o)", sublabel: "tất cả người khác", emoji: "🌍" },
] as const;

const actions = [
  { symbol: "r", value: 4, label: "đọc", emoji: "📖" },
  { symbol: "w", value: 2, label: "sửa", emoji: "✏️" },
  { symbol: "x", value: 1, label: "chạy", emoji: "▶️" },
] as const;

// 9 flags: owner rwx, group rwx, others rwx. Default = 750.
const DEFAULT_FLAGS = [true, true, true, true, false, true, false, false, false];

export function PermissionBuilderDiagram() {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);

  const toggle = (index: number) => setFlags((current) => current.map((flag, flagIndex) => (flagIndex === index ? !flag : flag)));

  const symbolic = flags.map((flag, index) => (flag ? actions[index % 3].symbol : "-")).join("");
  const octal = roles.map((_, roleIndex) => actions.reduce((sum, action, actionIndex) => sum + (flags[roleIndex * 3 + actionIndex] ? action.value : 0), 0)).join("");

  return (
    <DiagramFrame
      title="Tự tay bật/tắt quyền — xem chmod thay đổi"
      viewBox="0 0 720 262"
      controls={
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-2">
            <span />
            {actions.map((action) => (
              <span key={action.symbol} className="text-center font-semibold">
                {action.emoji} {action.symbol} ({action.value})
              </span>
            ))}
            {roles.map((role, roleIndex) => (
              <div key={role.key} className="contents">
                <span className="font-medium">
                  {role.emoji} {role.label}
                </span>
                {actions.map((action, actionIndex) => {
                  const index = roleIndex * 3 + actionIndex;
                  return (
                    <label key={action.symbol} className="flex justify-center">
                      <input type="checkbox" checked={flags[index]} onChange={() => toggle(index)} className="size-4 accent-indigo-600" aria-label={`${role.label} ${action.label}`} />
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 rounded-xl bg-stone-900 px-4 py-3 font-mono text-[13px] text-stone-100">
            <span>
              <span className="text-stone-500">ls -l →</span> -{symbolic} trung devops deploy.sh
            </span>
            <span>
              <span className="text-stone-500">lệnh →</span> <span className="text-emerald-400">chmod {octal} deploy.sh</span>
            </span>
          </div>
        </div>
      }
      caption="Mỗi nhóm người có 3 công tắc: đọc (4), sửa (2), chạy (1). Cộng các số lại là ra chữ số trong chmod."
    >
      <DiagramNode x={10} y={96} width={140} height={78} label="deploy.sh" sublabel="file script" emoji="📄" tone="violet" />
      {roles.map((role, roleIndex) => {
        const y = 14 + roleIndex * 84;
        return (
          <g key={role.key}>
            <DiagramArrow from={[152, 135]} to={[248, y + 34]} tone="slate" />
            <DiagramNode x={250} y={y} width={180} height={68} label={role.label} sublabel={role.sublabel} tone="slate" />
            {actions.map((action, actionIndex) => {
              const index = roleIndex * 3 + actionIndex;
              const allowed = flags[index];
              return (
                <DiagramNode
                  key={action.symbol}
                  x={450 + actionIndex * 88}
                  y={y + 12}
                  width={80}
                  height={44}
                  label={`${action.emoji} ${allowed ? "✓" : "✗"}`}
                  sublabel={action.label}
                  tone={allowed ? "green" : "rose"}
                  state={allowed ? "normal" : "dimmed"}
                  onClick={() => toggle(index)}
                />
              );
            })}
          </g>
        );
      })}
    </DiagramFrame>
  );
}
