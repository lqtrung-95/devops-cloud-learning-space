"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

const NODE_VERSIONS = [20, 22, 24] as const;
const OPERATING_SYSTEMS = ["ubuntu-latest", "windows-latest"] as const;

// Illustrative timings (seconds) — real numbers depend on the project.
const INSTALL_CACHE_MISS = 80;
const INSTALL_CACHE_HIT = 15;
const TEST_SECONDS = 50;
const WINDOWS_FACTOR = 1.6;

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}m${String(Math.round(seconds % 60)).padStart(2, "0")}s`;

export function MatrixCacheCalculatorDiagram() {
  const [nodeVersions, setNodeVersions] = useState<number[]>([20, 22]);
  const [operatingSystems, setOperatingSystems] = useState<string[]>(["ubuntu-latest"]);
  const [cacheEnabled, setCacheEnabled] = useState(false);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const jobs = OPERATING_SYSTEMS.filter((os) => operatingSystems.includes(os)).flatMap((os) =>
    NODE_VERSIONS.filter((version) => nodeVersions.includes(version)).map((version) => {
      const base = (cacheEnabled ? INSTALL_CACHE_HIT : INSTALL_CACHE_MISS) + TEST_SECONDS;
      return { os, version, seconds: os.startsWith("windows") ? base * WINDOWS_FACTOR : base };
    }),
  );
  const wallClock = Math.max(0, ...jobs.map((job) => job.seconds));
  const totalMinutes = jobs.reduce((sum, job) => sum + job.seconds, 0);
  const matrixYaml = `strategy:\n  fail-fast: false\n  matrix:\n    os: [${operatingSystems.join(", ")}]\n    node: [${nodeVersions.join(", ")}]\nruns-on: \${{ matrix.os }}\nsteps:\n  - uses: actions/checkout@v5\n  - uses: actions/setup-node@v5\n    with:\n      node-version: \${{ matrix.node }}${cacheEnabled ? "\n      cache: npm" : ""}\n  - run: npm ci && npm test`;

  const checkbox = (checked: boolean, onChange: () => void, label: string) => (
    <label key={label} className="flex items-center gap-1.5 font-medium">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-indigo-600" />
      {label}
    </label>
  );

  return (
    <DiagramFrame
      title="Matrix & cache: bật/tắt để xem số job và thời gian chờ"
      viewBox="0 0 720 300"
      controls={
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              <span className="font-semibold">node:</span>
              {NODE_VERSIONS.map((version) => checkbox(nodeVersions.includes(version), () => setNodeVersions(toggle(nodeVersions, version)), String(version)))}
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="font-semibold">os:</span>
              {OPERATING_SYSTEMS.map((os) => checkbox(operatingSystems.includes(os), () => setOperatingSystems(toggle(operatingSystems, os)), os))}
            </div>
            <div className="flex flex-wrap gap-3">{checkbox(cacheEnabled, () => setCacheEnabled(!cacheEnabled), "⚡ Bật cache npm (cache hit)")}</div>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-stone-900 px-4 py-3 font-mono text-[12px] leading-relaxed text-stone-100">{matrixYaml}</pre>
        </div>
      }
      caption="Mỗi tổ hợp trong matrix là một job chạy song song trên runner riêng. Cache không giảm số job nhưng cắt bớt thời gian cài dependency của từng job. Số giây chỉ để minh hoạ."
    >
      <DiagramNode x={10} y={110} width={130} height={70} label="📄 Job: test" sublabel={`${jobs.length} tổ hợp`} tone="violet" state="active" />
      {jobs.length === 0 && <DiagramLabel x={330} y={140} text="Matrix rỗng → không có job nào chạy" tone="rose" bold />}
      {jobs.map((job, index) => {
        const row = OPERATING_SYSTEMS.indexOf(job.os);
        const column = NODE_VERSIONS.indexOf(job.version);
        const x = 190 + column * 122;
        const y = 30 + row * 120;
        return (
          <g key={`${job.os}-${job.version}`}>
            <DiagramArrow from={[142, 145]} to={[x - 4, y + 40]} tone="violet" animated={index === 0} />
            <DiagramNode
              x={x}
              y={y}
              width={110}
              height={80}
              label={`node ${job.version}`}
              sublabel={`${job.os.replace("-latest", "")} · ${formatDuration(job.seconds)}`}
              emoji={job.os.startsWith("windows") ? "🪟" : "🐧"}
              tone={job.os.startsWith("windows") ? "cyan" : "blue"}
            />
          </g>
        );
      })}
      <DiagramNode x={562} y={30} width={150} height={74} label="⏱ Chờ kết quả" sublabel={`≈ ${formatDuration(wallClock)} (song song)`} tone={cacheEnabled ? "green" : "amber"} state="active" />
      <DiagramNode x={562} y={120} width={150} height={74} label="🧾 Tổng phút runner" sublabel={`≈ ${formatDuration(totalMinutes)}`} tone={totalMinutes > 600 ? "rose" : "amber"} />
      <DiagramNode x={562} y={210} width={150} height={74} label="📦 Cài dependency" sublabel={cacheEnabled ? "cache hit · ~15s/job" : "cache miss · ~80s/job"} tone={cacheEnabled ? "green" : "rose"} />
    </DiagramFrame>
  );
}
