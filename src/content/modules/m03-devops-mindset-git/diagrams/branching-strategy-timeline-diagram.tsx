"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramLabel } from "@/components/diagrams/diagram-shapes";
import { diagramToneClasses, type DiagramTone } from "@/components/diagrams/diagram-tones";
import { StepDiagram, type DiagramStep } from "@/components/diagrams/step-diagram";

type Strategy = "trunk" | "gitflow";

interface Lane {
  name: string;
  y: number;
  tone: DiagramTone;
}

interface Commit {
  step: number;
  lane: string;
  x: number;
  tag?: string;
}

interface Link {
  step: number;
  from: [string, number];
  to: [string, number];
}

interface StrategyScenario {
  lanes: Lane[];
  commits: Commit[];
  links: Link[];
  steps: DiagramStep[];
}

const scenarios: Record<Strategy, StrategyScenario> = {
  trunk: {
    lanes: [
      { name: "main", y: 80, tone: "blue" },
      { name: "feat/login", y: 160, tone: "green" },
      { name: "feat/cart", y: 230, tone: "amber" },
    ],
    commits: [
      { step: 0, lane: "main", x: 150, tag: "v1.3.0" },
      { step: 1, lane: "feat/login", x: 230 },
      { step: 2, lane: "main", x: 310 },
      { step: 3, lane: "feat/cart", x: 390 },
      { step: 3, lane: "main", x: 470 },
      { step: 4, lane: "main", x: 560, tag: "v1.4.0" },
      { step: 4, lane: "main", x: 640 },
    ],
    links: [
      { step: 1, from: ["main", 150], to: ["feat/login", 230] },
      { step: 2, from: ["feat/login", 230], to: ["main", 310] },
      { step: 3, from: ["main", 310], to: ["feat/cart", 390] },
      { step: 3, from: ["feat/cart", 390], to: ["main", 470] },
    ],
    steps: [
      { title: "main luôn deploy được", description: "Chỉ có một nhánh sống lâu: `main` (trunk). Mọi commit trên main phải qua CI xanh và luôn ở trạng thái release được." },
      { title: "Nhánh rất ngắn", description: "Tạo `feat/login` từ main, làm một phần nhỏ trong vài giờ tới 1–2 ngày. Nhánh càng ngắn, conflict càng ít." },
      { title: "Merge sớm qua PR", description: "Mở PR, CI chạy, đồng nghiệp review, rồi squash merge vào main. Nhánh bị xoá ngay." },
      { title: "Feature flag", description: "Tính năng giỏ hàng chưa xong vẫn được merge — nhưng ẩn sau feature flag `cart_v2=false`. Code tích hợp liên tục mà người dùng chưa thấy." },
      { title: "Release từ main", description: "Tag `v1.4.0` ngay trên main và deploy. Nhiều team deploy nhiều lần mỗi ngày theo cách này — đây là kiểu nhánh gắn liền với DORA metrics tốt." },
    ],
  },
  gitflow: {
    lanes: [
      { name: "main", y: 50, tone: "blue" },
      { name: "hotfix/*", y: 100, tone: "rose" },
      { name: "release/*", y: 150, tone: "violet" },
      { name: "develop", y: 200, tone: "cyan" },
      { name: "feature/*", y: 250, tone: "green" },
    ],
    commits: [
      { step: 0, lane: "main", x: 140, tag: "v1.0.0" },
      { step: 0, lane: "develop", x: 190 },
      { step: 1, lane: "feature/*", x: 240 },
      { step: 1, lane: "feature/*", x: 290 },
      { step: 2, lane: "develop", x: 340 },
      { step: 3, lane: "release/*", x: 390 },
      { step: 4, lane: "main", x: 450, tag: "v1.1.0" },
      { step: 4, lane: "develop", x: 450 },
      { step: 5, lane: "hotfix/*", x: 520 },
      { step: 5, lane: "main", x: 590, tag: "v1.1.1" },
      { step: 5, lane: "develop", x: 590 },
    ],
    links: [
      { step: 0, from: ["main", 140], to: ["develop", 190] },
      { step: 1, from: ["develop", 190], to: ["feature/*", 240] },
      { step: 2, from: ["feature/*", 290], to: ["develop", 340] },
      { step: 3, from: ["develop", 340], to: ["release/*", 390] },
      { step: 4, from: ["release/*", 390], to: ["main", 450] },
      { step: 4, from: ["release/*", 390], to: ["develop", 450] },
      { step: 5, from: ["main", 450], to: ["hotfix/*", 520] },
      { step: 5, from: ["hotfix/*", 520], to: ["main", 590] },
      { step: 5, from: ["hotfix/*", 520], to: ["develop", 590] },
    ],
    steps: [
      { title: "Hai nhánh sống lâu", description: "`main` chỉ chứa code đã phát hành; `develop` gom tính năng cho lần phát hành tới." },
      { title: "Feature branch dài", description: "`feature/login` tách từ develop và thường sống nhiều ngày/tuần. Càng lâu, càng lệch xa develop." },
      { title: "Merge vào develop", description: "Xong tính năng mới merge về develop — lúc này mới phát hiện conflict với các feature khác." },
      { title: "Release branch", description: "Tách `release/1.1` để 'đóng băng' tính năng, chỉ sửa bug, bump version, chạy kiểm thử." },
      { title: "Merge 2 chiều", description: "Release merge vào `main` (tag `v1.1.0`) VÀ merge ngược về `develop` để không mất bản sửa." },
      { title: "Hotfix", description: "Lỗi gấp trên prod: tách `hotfix/1.1.1` từ main, sửa, merge vào cả main lẫn develop. Hợp với phần mềm có nhiều version song song; nặng nề với web app deploy liên tục." },
    ],
  },
};

const LANE_LABEL_X = 16;

export function BranchingStrategyTimelineDiagram() {
  const [strategy, setStrategy] = useState<Strategy>("trunk");
  const scenario = scenarios[strategy];
  const laneY = (name: string) => scenario.lanes.find((lane) => lane.name === name)?.y ?? 0;
  const laneTone = (name: string) => scenario.lanes.find((lane) => lane.name === name)?.tone ?? "slate";

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["trunk", "gitflow"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStrategy(option)}
            className={clsx("rounded-full px-3 py-1.5 text-sm font-medium", strategy === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300")}
          >
            {option === "trunk" ? "🌳 Trunk-based development" : "🌿 GitFlow"}
          </button>
        ))}
      </div>
      <StepDiagram key={strategy} title={strategy === "trunk" ? "Trunk-based: nhánh ngắn, merge liên tục vào main" : "GitFlow: nhiều nhánh sống lâu, release theo đợt"} viewBox="0 0 720 280" steps={scenario.steps}>
        {(step) => (
          <>
            {scenario.lanes.map((lane) => {
              // Solid segment between the first and last visible commit shows how long the branch has lived.
              const xs = scenario.commits.filter((commit) => commit.lane === lane.name && commit.step <= step).map((commit) => commit.x);
              return (
                <g key={lane.name}>
                  <line x1={110} y1={lane.y} x2={705} y2={lane.y} strokeWidth={1.5} strokeDasharray="4 6" className="stroke-stone-300 dark:stroke-stone-700" />
                  {xs.length > 1 && <line x1={Math.min(...xs)} y1={lane.y} x2={Math.max(...xs)} y2={lane.y} strokeWidth={3} className={diagramToneClasses[lane.tone].stroke} />}
                  <DiagramLabel x={LANE_LABEL_X} y={lane.y + 4} text={lane.name} anchor="start" tone={lane.tone} bold size={13} />
                </g>
              );
            })}
            {scenario.links
              .filter((link) => link.step <= step)
              .map((link) => (
                <line
                  key={`${link.from.join()}-${link.to.join()}`}
                  x1={link.from[1]}
                  y1={laneY(link.from[0])}
                  x2={link.to[1]}
                  y2={laneY(link.to[0])}
                  strokeWidth={link.step === step ? 3 : 2}
                  className={clsx(diagramToneClasses[laneTone(link.to[0])].stroke, link.step === step && "diagram-dash-animated")}
                />
              ))}
            {scenario.commits
              .filter((commit) => commit.step <= step)
              .map((commit) => (
                <g key={`${commit.lane}-${commit.x}`}>
                  <circle cx={commit.x} cy={laneY(commit.lane)} r={commit.step === step ? 10 : 8} strokeWidth={2.5} className={clsx(diagramToneClasses[laneTone(commit.lane)].shape)} />
                  {commit.tag && <DiagramLabel x={commit.x} y={laneY(commit.lane) - 16} text={`🏷️ ${commit.tag}`} size={11.5} bold tone="amber" />}
                </g>
              ))}
            {strategy === "trunk" && step >= 3 && <DiagramLabel x={430} y={262} text="🚩 cart_v2 = false (đã merge nhưng đang ẩn)" size={12} tone="amber" bold />}
          </>
        )}
      </StepDiagram>
    </div>
  );
}
