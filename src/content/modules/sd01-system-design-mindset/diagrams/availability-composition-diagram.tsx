"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Topology = "single" | "series" | "redundant";

const levels = [0.99, 0.999, 0.9999];
const MINUTES_PER_YEAR = 365 * 24 * 60;

const topologies: Record<Topology, { label: string; note: string }> = {
  single: { label: "Chỉ app", note: "Một thành phần: availability tổng = availability của nó." },
  series: { label: "App → DB (nối tiếp)", note: "Request cần CẢ app lẫn DB ⇒ nhân lại: tổng luôn thấp hơn khâu yếu nhất." },
  redundant: { label: "2 app song song → DB", note: "Chỉ sập khi CẢ 2 app cùng sập: 1 − (1 − a)². Nhưng DB vẫn nối tiếp nên vẫn là trần." },
};

const percent = (value: number) => `${(value * 100).toFixed(value >= 0.9999 ? 4 : 3).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",")}%`;

function formatDowntime(availability: number): string {
  const minutes = (1 - availability) * MINUTES_PER_YEAR;
  if (minutes >= 1440) return `~${(minutes / 1440).toFixed(1).replace(".", ",")} ngày/năm`;
  if (minutes >= 60) return `~${(minutes / 60).toFixed(1).replace(".", ",")} giờ/năm`;
  if (minutes >= 1) return `~${minutes.toFixed(1).replace(".", ",")} phút/năm`;
  return `~${Math.round(minutes * 60)} giây/năm`;
}

export function AvailabilityCompositionDiagram() {
  const [topology, setTopology] = useState<Topology>("series");
  const [appLevel, setAppLevel] = useState(0.999);
  const [dbLevel, setDbLevel] = useState(0.999);

  const appTier = topology === "redundant" ? 1 - (1 - appLevel) ** 2 : appLevel;
  const total = topology === "single" ? appLevel : appTier * dbLevel;

  const levelButtons = (value: number, onChange: (next: number) => void) =>
    levels.map((level) => (
      <button
        key={level}
        type="button"
        onClick={() => onChange(level)}
        className={clsx(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          level === value ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
        )}
      >
        {percent(level)}
      </button>
    ));

  return (
    <DiagramFrame
      title="Ghép các thành phần — availability tổng thay đổi thế nào?"
      viewBox="0 0 720 280"
      controls={
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(topologies) as Topology[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTopology(key)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  key === topology ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {topologies[key].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-24 font-medium">🖥️ Mỗi app</span>
            {levelButtons(appLevel, setAppLevel)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-24 font-medium">🗄️ Database</span>
            {levelButtons(dbLevel, setDbLevel)}
          </div>
          <p className="text-stone-700 dark:text-stone-300">{topologies[topology].note}</p>
        </div>
      }
      caption="Công thức chỉ đúng khi các thành phần hỏng độc lập. Thực tế 2 app cùng AZ, cùng bản deploy lỗi, cùng config sai sẽ sập cùng lúc — redundancy thật cần tách miền lỗi."
    >
      <DiagramNode x={10} y={100} width={100} height={70} label="User" emoji="👥" tone="violet" />
      {topology === "redundant" ? (
        <DiagramGroupBox x={170} y={20} width={180} height={230} label="App tier">
          <DiagramNode x={190} y={50} width={140} height={70} label="App #1" sublabel={percent(appLevel)} tone="blue" />
          <DiagramNode x={190} y={160} width={140} height={70} label="App #2" sublabel={percent(appLevel)} tone="blue" />
          <DiagramArrow from={[112, 125]} to={[186, 85]} tone="slate" />
          <DiagramArrow from={[112, 145]} to={[186, 195]} tone="slate" />
          <DiagramLabel x={260} y={146} text={`tier: ${percent(appTier)}`} size={12} tone="green" bold />
        </DiagramGroupBox>
      ) : (
        <>
          <DiagramArrow from={[112, 135]} to={[186, 135]} tone="slate" />
          <DiagramNode x={190} y={100} width={140} height={70} label="App" sublabel={percent(appLevel)} tone="blue" />
        </>
      )}
      {topology !== "single" && (
        <>
          <DiagramArrow from={[354, 135]} to={[406, 135]} tone="slate" />
          <DiagramNode x={410} y={100} width={130} height={70} label="Database" sublabel={percent(dbLevel)} tone="amber" />
        </>
      )}
      <DiagramNode
        x={565}
        y={80}
        width={145}
        height={110}
        label={percent(total)}
        sublabel={formatDowntime(total)}
        emoji={total >= 0.9999 ? "🏆" : total >= 0.999 ? "✅" : "⚠️"}
        tone={total >= 0.999 ? "green" : "rose"}
        state="active"
      />
      <DiagramLabel x={637} y={214} text="tổng hệ thống" size={12} bold />
    </DiagramFrame>
  );
}
