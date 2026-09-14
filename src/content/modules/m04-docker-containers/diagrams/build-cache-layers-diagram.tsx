"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { InlineCodeText } from "@/components/ui/inline-code-text";

type Change = "none" | "code" | "deps";

interface Instruction {
  text: string;
  seconds: number;
  /** Which kind of file change invalidates this instruction's cache. */
  invalidatedBy: Change[];
}

const goodOrder: Instruction[] = [
  { text: "FROM node:22-alpine", seconds: 0, invalidatedBy: [] },
  { text: "WORKDIR /app", seconds: 0, invalidatedBy: [] },
  { text: "COPY package*.json ./", seconds: 1, invalidatedBy: ["deps"] },
  { text: "RUN npm ci", seconds: 90, invalidatedBy: [] },
  { text: "COPY . .", seconds: 1, invalidatedBy: ["code", "deps"] },
  { text: "RUN npm run build", seconds: 20, invalidatedBy: [] },
];

const badOrder: Instruction[] = [
  { text: "FROM node:22-alpine", seconds: 0, invalidatedBy: [] },
  { text: "WORKDIR /app", seconds: 0, invalidatedBy: [] },
  { text: "COPY . .", seconds: 1, invalidatedBy: ["code", "deps"] },
  { text: "RUN npm ci", seconds: 90, invalidatedBy: [] },
  { text: "RUN npm run build", seconds: 20, invalidatedBy: [] },
];

const scenarios = [
  { id: "none", order: "good", change: "none", label: "Không đổi gì", note: "Mọi bước và file đầu vào giống lần trước → toàn bộ lấy từ cache, build gần như tức thì." },
  { id: "good-code", order: "good", change: "code", label: "Sửa 1 dòng code (thứ tự tốt)", note: "Chỉ `COPY . .` thấy file khác → từ đó trở lên làm lại. `npm ci` (90s) vẫn CACHED vì package.json không đổi." },
  { id: "good-deps", order: "good", change: "deps", label: "Thêm 1 package (thứ tự tốt)", note: "package.json đổi → `COPY package*.json` bị vô hiệu, kéo theo `npm ci` và mọi bước sau. Chuyện này hiếm nên chấp nhận được." },
  { id: "bad-code", order: "bad", change: "code", label: "Sửa 1 dòng code (thứ tự xấu)", note: "`COPY . .` đứng trước `npm ci`: sửa bất kỳ file nào cũng làm `npm ci` chạy lại 90s. Đây là lỗi phổ biến nhất." },
] as const;

const LAYER_HEIGHT = 38;
const BOTTOM_Y = 262;

export function BuildCacheLayersDiagram() {
  const [scenarioId, setScenarioId] = useState<(typeof scenarios)[number]["id"]>("good-code");
  const scenario = scenarios.find((item) => item.id === scenarioId)!;
  const instructions = scenario.order === "good" ? goodOrder : badOrder;
  const change: Change = scenario.change;
  const firstInvalid = change === "none" ? -1 : instructions.findIndex((item) => item.invalidatedBy.includes(change));
  const isRebuilt = (index: number) => firstInvalid !== -1 && index >= firstInvalid;
  const totalSeconds = instructions.reduce((sum, item, index) => sum + (isRebuilt(index) ? item.seconds : 0), 0);
  const layerY = (index: number) => BOTTOM_Y - index * (LAYER_HEIGHT + 6);

  return (
    <DiagramFrame
      title="Build cache: sửa một dòng, bao nhiêu layer phải build lại?"
      viewBox="0 0 720 310"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {scenarios.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScenarioId(item.id)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  scenarioId === item.id ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300"><InlineCodeText text={scenario.note} /></p>
        </div>
      }
      caption="Đọc từ dưới lên: Docker kiểm tra từng bước theo thứ tự. Bước đầu tiên bị vô hiệu kéo theo MỌI bước phía trên nó phải chạy lại."
    >
      <DiagramLabel x={20} y={20} text="Dockerfile → layer (dưới cùng là bước đầu tiên)" anchor="start" bold />
      {instructions.map((item, index) => {
        const rebuilt = isRebuilt(index);
        const y = layerY(index);
        return (
          <g key={item.text}>
            <DiagramNode x={20} y={y} width={300} height={LAYER_HEIGHT} label={item.text} tone={index === firstInvalid ? "amber" : "slate"} rounded={6} state={index === firstInvalid ? "active" : "normal"} />
            <DiagramNode
              x={336}
              y={y}
              width={170}
              height={LAYER_HEIGHT}
              label={rebuilt ? `🔨 build lại · ${item.seconds}s` : "⚡ CACHED"}
              tone={rebuilt ? "rose" : "green"}
              rounded={6}
            />
          </g>
        );
      })}
      {firstInvalid !== -1 && (
        <>
          <DiagramNode x={560} y={layerY(firstInvalid) - 4} width={150} height={46} label={change === "code" ? "✏️ src/app.ts" : "✏️ package.json"} sublabel="file vừa sửa" tone="amber" />
          <DiagramArrow from={[558, layerY(firstInvalid) + 19]} to={[510, layerY(firstInvalid) + 19]} tone="amber" animated />
        </>
      )}
      <DiagramNode x={560} y={232} width={150} height={68} label="⏱ Thời gian build" sublabel={`≈ ${totalSeconds}s`} tone={totalSeconds > 60 ? "rose" : "green"} state="active" />
    </DiagramFrame>
  );
}
