"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

// Illustrative assumptions — kéo slider để xem chi phí đổi thế nào, số thật phải benchmark trên sd-playground.
const FOLLOWER_STEPS = [100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 50_000_000];
const CELEBRITY_INDEX = 2; // hybrid coi tài khoản >= 10.000 follower là "celebrity"
const FANOUT_CLUSTER_WRITES_PER_SEC = 100_000; // giả định toàn cụm fan-out worker, cần benchmark thật
const PULL_FETCH_MS = 2; // giả định 1 lần lấy bài mới nhất của 1 tài khoản khi đọc

type Mode = "push" | "pull" | "hybrid";

function formatThousands(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.max(1, Math.round(seconds * 1000))} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)} giây`;
  return `${(seconds / 60).toFixed(1)} phút`;
}

function simulate(mode: Mode, followerIndex: number, followeeCount: number) {
  const followers = FOLLOWER_STEPS[followerIndex];
  const isCelebrity = followerIndex >= CELEBRITY_INDEX;
  const effectiveMode: "push" | "pull" = mode === "hybrid" ? (isCelebrity ? "pull" : "push") : mode;
  const pushWrites = effectiveMode === "push" ? followers : 0;
  const pushSeconds = pushWrites / FANOUT_CLUSTER_WRITES_PER_SEC;
  const readerAddedMs = followeeCount * PULL_FETCH_MS;
  return { followers, isCelebrity, effectiveMode, pushWrites, pushSeconds, readerAddedMs };
}

function Pills<T extends string>({ value, labels, onChange }: { value: T; labels: Record<T, string>; onChange: (next: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(labels) as T[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={clsx(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            value === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

const modeLabels: Record<Mode, string> = { push: "Ép PUSH cho mọi tài khoản", pull: "Ép PULL cho mọi tài khoản", hybrid: "Hybrid (ngưỡng celebrity)" };
const followeeLabels: Record<"1" | "5" | "20", string> = { "1": "1 celeb", "5": "5 celeb", "20": "20 celeb" };

export function FanoutPushPullFollowerCountSliderDiagram() {
  const [mode, setMode] = useState<Mode>("hybrid");
  const [followerIndex, setFollowerIndex] = useState(4);
  const [followeeCount, setFolloweeCount] = useState(5);
  const result = simulate(mode, followerIndex, followeeCount);
  const pushTone: DiagramTone = result.effectiveMode !== "push" ? "slate" : result.pushSeconds < 1 ? "green" : result.pushSeconds < 30 ? "amber" : "rose";

  const controls = (
    <div className="space-y-3">
      <Pills value={mode} labels={modeLabels} onChange={setMode} />
      <label className="flex flex-wrap items-center gap-3 text-sm text-stone-700 dark:text-stone-300">
        <span className="font-medium">Follower của tài khoản: {formatThousands(result.followers)}</span>
        <input
          type="range"
          min={0}
          max={FOLLOWER_STEPS.length - 1}
          value={followerIndex}
          onChange={(event) => setFollowerIndex(Number(event.target.value))}
          className="w-52 accent-indigo-600"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 text-sm text-stone-700 dark:text-stone-300">
        <span className="font-medium">Reader theo dõi bao nhiêu celeb dùng pull:</span>
        <Pills value={String(followeeCount) as "1" | "5" | "20"} labels={followeeLabels} onChange={(v) => setFolloweeCount(Number(v))} />
      </div>
    </div>
  );

  return (
    <DiagramFrame
      title="Kéo số follower — chi phí push vs pull đi đâu?"
      viewBox="0 0 720 300"
      controls={controls}
      caption={`Giả định minh hoạ: cụm fan-out ghi được cỡ ${formatThousands(FANOUT_CLUSTER_WRITES_PER_SEC)} lần/giây, pull một tài khoản tốn cỡ ${PULL_FETCH_MS}ms bất kể follower — số thật phải đo bằng k6/redis-cli trên sd-playground.`}
    >
      <DiagramNode x={16} y={110} width={110} height={70} emoji="📮" label="Đăng 1 bài" sublabel={`tài khoản ${formatThousands(result.followers)} follower`} tone="violet" state="active" />
      <DiagramArrow from={[126, 130]} to={[168, 75]} tone={pushTone} dimmed={result.effectiveMode !== "push"} />
      <DiagramArrow from={[126, 150]} to={[168, 205]} tone="green" dimmed={result.effectiveMode !== "pull"} />

      <DiagramNode
        x={170}
        y={20}
        width={250}
        height={100}
        emoji="🚚"
        label="PUSH — ghi ngay khi đăng"
        sublabel={`${formatThousands(result.pushWrites)} lần ZADD · ~${formatDuration(result.pushSeconds)}`}
        tone={pushTone}
        state={result.effectiveMode === "push" ? "active" : "dimmed"}
      />
      <DiagramNode
        x={170}
        y={185}
        width={250}
        height={90}
        emoji="📖"
        label="PULL — đọc khi cần"
        sublabel={`O(1) mỗi follower · ~${PULL_FETCH_MS}ms, không phụ follower count`}
        tone="green"
        state={result.effectiveMode === "pull" ? "active" : "dimmed"}
      />

      <DiagramNode
        x={450}
        y={40}
        width={254}
        height={70}
        emoji={result.effectiveMode === "pull" ? "✅" : "🐢"}
        label={mode === "hybrid" ? `Hybrid: ngưỡng ${formatThousands(FOLLOWER_STEPS[CELEBRITY_INDEX])} follower` : "Áp dụng cho MỌI tài khoản"}
        sublabel={mode === "hybrid" ? `tài khoản này → ${result.effectiveMode.toUpperCase()}` : `kể cả celeb 50.000.000 follower`}
        tone={result.effectiveMode === "push" && result.pushSeconds >= 30 ? "rose" : "blue"}
        state="active"
      />
      <DiagramNode
        x={450}
        y={130}
        width={254}
        height={90}
        emoji="🧵"
        label="Chi phí đọc thêm cho 1 reader"
        sublabel={`follow ${followeeCount} celeb dùng pull → +${result.readerAddedMs}ms mỗi lần mở feed`}
        tone={result.readerAddedMs > 20 ? "amber" : "slate"}
        state="active"
      />
      <DiagramLabel
        x={577}
        y={250}
        text={result.pushSeconds >= 30 ? "Push ở follower lớn = cliff, phải chuyển sang pull" : "Pull không phụ thuộc follower count của tài khoản đó"}
        size={12}
        anchor="middle"
        tone="slate"
      />
    </DiagramFrame>
  );
}
