"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses, type DiagramTone } from "@/components/diagrams/diagram-tones";

type Mode = "ring" | "mod-n";

/** Toy hash space 0–359 so a key's hash is also its angle on the ring. */
const KEYS = [12, 47, 75, 101, 128, 163, 190, 222, 248, 281, 305, 338];
const BASE_NODES = [
  { name: "A", position: 60, tone: "blue" },
  { name: "B", position: 180, tone: "violet" },
  { name: "C", position: 300, tone: "cyan" },
] as const satisfies readonly { name: string; position: number; tone: DiagramTone }[];
const NEW_NODE = { name: "D", position: 120, tone: "amber" } as const;

type RingNode = { name: string; position: number; tone: DiagramTone };

const CENTER_X = 190;
const CENTER_Y = 160;
const RADIUS = 115;

function pointAt(angle: number, radius = RADIUS): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [CENTER_X + radius * Math.sin(radians), CENTER_Y - radius * Math.cos(radians)];
}

function ownerOf(hash: number, nodes: RingNode[], mode: Mode): RingNode {
  if (mode === "mod-n") return nodes[hash % nodes.length];
  // Walk clockwise: first node whose position is >= the key's hash, wrapping around.
  const sorted = [...nodes].sort((a, b) => a.position - b.position);
  return sorted.find((node) => node.position >= hash) ?? sorted[0];
}

export function HashRingAddNodeDiagram() {
  const [mode, setMode] = useState<Mode>("ring");
  const [withNewNode, setWithNewNode] = useState(false);

  const before: RingNode[] = [...BASE_NODES];
  const after: RingNode[] = withNewNode ? [...BASE_NODES, NEW_NODE] : before;
  const assignments = KEYS.map((hash) => ({ hash, from: ownerOf(hash, before, mode), to: ownerOf(hash, after, mode) }));
  const moved = assignments.filter((item) => item.from.name !== item.to.name).length;

  return (
    <DiagramFrame
      title="Thêm node D: bao nhiêu key phải chuyển nhà?"
      viewBox="0 0 720 330"
      controls={
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {(["ring", "mod-n"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={clsx(
                "rounded-full px-3 py-1.5 font-medium",
                mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
              )}
            >
              {option === "ring" ? "Consistent hashing" : "hash mod N"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setWithNewNode(!withNewNode)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {withNewNode ? "↺ Bỏ node D" : "➕ Thêm node D"}
          </button>
        </div>
      }
      caption="Hash thu nhỏ về 0–359 cho dễ nhìn: vị trí của key trên vòng tròn chính là hash. Ring: key thuộc node đầu tiên gặp khi đi theo chiều kim đồng hồ. mod N: key thuộc node thứ hash % N. Key có viền đỏ nét đứt là key đổi node."
    >
      <circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS} fill="none" strokeWidth={2} className={diagramToneClasses.slate.stroke} strokeDasharray={mode === "mod-n" ? "4 6" : undefined} />
      <DiagramLabel x={CENTER_X} y={CENTER_Y - 4} text={mode === "ring" ? "hash ring" : "(vòng tròn không"} size={12} bold />
      <DiagramLabel x={CENTER_X} y={CENTER_Y + 14} text={mode === "ring" ? "0 → 359" : "dùng để gán)"} size={11.5} />

      {assignments.map(({ hash, from, to }) => {
        const [x, y] = pointAt(hash);
        const [labelX, labelY] = pointAt(hash, RADIUS - 24);
        const isMoved = from.name !== to.name;
        return (
          <g key={hash}>
            {isMoved && <circle cx={x} cy={y} r={12} fill="none" strokeWidth={2} strokeDasharray="3 3" className={diagramToneClasses.rose.stroke} />}
            <circle cx={x} cy={y} r={7} className={clsx(diagramToneClasses[to.tone].fill, "transition-all duration-500")} />
            <text x={labelX} y={labelY + 4} textAnchor="middle" fontSize={11} className={diagramToneClasses.slate.text}>
              {hash}
            </text>
          </g>
        );
      })}

      {after.map((node) => {
        const [x, y] = pointAt(node.position, RADIUS + 26);
        const [tickX, tickY] = pointAt(node.position);
        return (
          <g key={node.name}>
            <line x1={tickX} y1={tickY} x2={x} y2={y} strokeWidth={2} className={diagramToneClasses[node.tone].stroke} />
            <circle cx={x} cy={y} r={15} strokeWidth={2.5} className={diagramToneClasses[node.tone].shape} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={700} className={diagramToneClasses[node.tone].text}>
              {node.name}
            </text>
          </g>
        );
      })}

      <DiagramNode
        x={400}
        y={20}
        width={300}
        height={70}
        label={withNewNode ? `${moved}/${KEYS.length} key đổi node (${Math.round((moved / KEYS.length) * 100)}%)` : "Chưa thêm node"}
        sublabel={mode === "ring" ? "kỳ vọng ≈ 1/(N+1) = 1/4 khi N=3→4" : "kỳ vọng ≈ N/(N+1) = 3/4 khi N=3→4"}
        tone={!withNewNode ? "slate" : moved <= 4 ? "green" : "rose"}
        state={withNewNode ? "active" : "normal"}
      />
      {after.map((node, index) => {
        const count = assignments.filter((item) => item.to.name === node.name).length;
        return (
          <DiagramNode key={node.name} x={400 + index * 76} y={112} width={68} height={52} label={`${node.name}: ${count}`} sublabel="key" tone={node.tone} />
        );
      })}
      <DiagramLabel
        x={400}
        y={200}
        anchor="start"
        text={mode === "ring" ? "D chỉ lấy bớt key của hàng xóm B." : "Đổi N ⇒ hash % N đổi với gần như mọi key."}
        tone={mode === "ring" ? "green" : "rose"}
        bold
      />
      <DiagramLabel x={400} y={224} anchor="start" text="Mẫu 12 key nên số lệch khỏi kỳ vọng —" size={11.5} />
      <DiagramLabel x={400} y={242} anchor="start" text="lab dùng 100.000 key để đo thật." size={11.5} />
      <DiagramLabel x={400} y={280} anchor="start" text="Ring không vnode: phần của mỗi node lệch nhiều" size={11.5} tone="amber" />
      <DiagramLabel x={400} y={298} anchor="start" text="→ thực tế dùng virtual nodes." size={11.5} tone="amber" />
    </DiagramFrame>
  );
}
