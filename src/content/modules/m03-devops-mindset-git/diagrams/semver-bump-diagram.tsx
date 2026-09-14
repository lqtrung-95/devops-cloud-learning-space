"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Bump = "major" | "minor" | "patch" | "none";

const commitTypes: { message: string; bump: Bump; tone: DiagramTone }[] = [
  { message: "fix(api): handle empty cart", bump: "patch", tone: "green" },
  { message: "feat(api): add /metrics endpoint", bump: "minor", tone: "blue" },
  { message: "feat(api)!: remove /v1/orders", bump: "major", tone: "rose" },
  { message: "docs: update README", bump: "none", tone: "slate" },
  { message: "chore(deps): bump express", bump: "none", tone: "slate" },
];

const bumpRank: Record<Bump, number> = { none: 0, patch: 1, minor: 2, major: 3 };

function nextVersion([major, minor, patch]: number[], bump: Bump): number[] {
  if (bump === "major") return [major + 1, 0, 0];
  if (bump === "minor") return [major, minor + 1, 0];
  if (bump === "patch") return [major, minor, patch + 1];
  return [major, minor, patch];
}

export function SemverBumpDiagram() {
  const [version, setVersion] = useState([1, 4, 2]);
  const [pending, setPending] = useState<number[]>([]);

  const highest = pending.reduce<Bump>((current, index) => (bumpRank[commitTypes[index].bump] > bumpRank[current] ? commitTypes[index].bump : current), "none");
  const upcoming = nextVersion(version, highest);
  const partNames = ["MAJOR", "MINOR", "PATCH"];
  const changedPart = highest === "major" ? 0 : highest === "minor" ? 1 : highest === "patch" ? 2 : -1;

  const release = () => {
    setVersion(upcoming);
    setPending([]);
  };

  return (
    <DiagramFrame
      title="Conventional Commits → Semantic Version: thêm commit và xem version kế tiếp"
      viewBox="0 0 720 280"
      controls={
        <div className="flex flex-wrap gap-2 text-sm">
          {commitTypes.map((commit, index) => (
            <button
              key={commit.message}
              type="button"
              onClick={() => setPending([...pending, index].slice(-5))}
              className="rounded-full bg-stone-200 px-3 py-1 font-mono text-[12.5px] text-stone-700 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              + {commit.message}
            </button>
          ))}
          <button type="button" onClick={release} disabled={highest === "none"} className={clsx("rounded-lg px-3 py-1 font-medium text-white", highest === "none" ? "cursor-not-allowed bg-stone-400" : "bg-emerald-600 hover:bg-emerald-700")}>
            🏷️ Release
          </button>
          <button type="button" onClick={() => setPending([])} className="rounded-lg border border-stone-300 px-3 py-1 font-medium dark:border-stone-700">
            Xoá commit
          </button>
        </div>
      }
      caption="Công cụ release lấy mức tăng CAO NHẤT trong các commit kể từ tag trước: có dấu ! hoặc footer BREAKING CHANGE → MAJOR, có feat → MINOR, chỉ có fix → PATCH, docs/chore → không release."
    >
      <DiagramLabel x={16} y={22} text={`Commit từ sau tag v${version.join(".")}:`} anchor="start" bold size={13} />
      {pending.length === 0 && <DiagramLabel x={16} y={60} text="(chưa có — bấm các nút bên dưới)" anchor="start" size={12} tone="slate" />}
      {pending.map((commitIndex, row) => {
        const commit = commitTypes[commitIndex];
        return (
          <DiagramNode
            key={`${row}-${commitIndex}`}
            x={10}
            y={34 + row * 47}
            width={300}
            height={40}
            label={commit.message}
            tone={commit.tone}
            rounded={8}
            state={commit.bump === highest && highest !== "none" ? "active" : "normal"}
          />
        );
      })}
      <DiagramArrow from={[320, 150]} to={[392, 150]} tone={highest === "none" ? "slate" : "green"} animated={highest !== "none"} label={highest === "none" ? "không đổi" : highest.toUpperCase()} />
      <DiagramLabel x={550} y={40} text={`Hiện tại: v${version.join(".")}`} size={13} tone="slate" bold />
      {upcoming.map((value, index) => (
        <DiagramNode
          key={partNames[index]}
          x={400 + index * 102}
          y={90}
          width={94}
          height={110}
          label={String(value)}
          sublabel={partNames[index]}
          tone={index === changedPart ? "amber" : index > changedPart && changedPart !== -1 ? "slate" : "blue"}
          state={index === changedPart ? "active" : "normal"}
        />
      ))}
      <DiagramLabel
        x={553}
        y={236}
        text={changedPart === -1 ? "Chưa cần release" : changedPart === 0 ? "Phá vỡ tương thích — client phải sửa code" : changedPart === 1 ? "Thêm tính năng, tương thích ngược" : "Chỉ sửa lỗi, tương thích ngược"}
        tone={changedPart === 0 ? "rose" : "green"}
        bold
        size={12.5}
      />
      {changedPart !== -1 && changedPart < 2 && <DiagramLabel x={553} y={258} text="các số bên phải reset về 0" size={11.5} tone="slate" />}
    </DiagramFrame>
  );
}
