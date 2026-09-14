"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type Mode = "count" | "for_each";

interface Row {
  address: string;
  bucket: string;
  result: string;
  tone: DiagramTone;
}

const TEAMS = ["an", "binh", "chi"];

// Plan result per resource address after removing "binh" from the list.
function buildRows(mode: Mode, removed: boolean): Row[] {
  if (!removed) {
    return TEAMS.map((team, index) => ({
      address: mode === "count" ? `logs[${index}]` : `logs["${team}"]`,
      bucket: `logs-${team}`,
      result: "tạo / giữ nguyên",
      tone: "green",
    }));
  }
  if (mode === "count") {
    return [
      { address: "logs[0]", bucket: "logs-an", result: "giữ nguyên", tone: "green" },
      { address: "logs[1]", bucket: "logs-binh → logs-chi", result: "-/+ thay thế", tone: "amber" },
      { address: "logs[2]", bucket: "logs-chi", result: "- xoá", tone: "rose" },
    ];
  }
  return [
    { address: 'logs["an"]', bucket: "logs-an", result: "giữ nguyên", tone: "green" },
    { address: 'logs["binh"]', bucket: "logs-binh", result: "- xoá", tone: "rose" },
    { address: 'logs["chi"]', bucket: "logs-chi", result: "giữ nguyên", tone: "green" },
  ];
}

const codeFor = (mode: Mode, removed: boolean) => [
  `teams = ${removed ? '["an", "chi"]' : '["an", "binh", "chi"]'}`,
  "",
  'resource "aws_s3_bucket" "logs" {',
  mode === "count" ? "  count  = length(var.teams)" : "  for_each = toset(var.teams)",
  mode === "count" ? '  bucket = "logs-${var.teams[count.index]}"' : '  bucket   = "logs-${each.key}"',
  "}",
];

const summaries: Record<Mode, string> = {
  count: "Plan: 1 to add, 0 to change, 2 to destroy. Chỉ bỏ 1 tên mà đụng tới 2 bucket — logs-chi bị xoá rồi tạo lại (mất dữ liệu!).",
  for_each: "Plan: 0 to add, 0 to change, 1 to destroy. Đúng ý: chỉ bucket của binh bị xoá.",
};

export function CountVsForEachDiagram() {
  const [mode, setMode] = useState<Mode>("count");
  const [removed, setRemoved] = useState(false);
  const rows = buildRows(mode, removed);

  const pill = (active: boolean) =>
    clsx("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300");

  return (
    <DiagramFrame
      title="count vs for_each: chuyện gì xảy ra khi xoá phần tử ở giữa danh sách?"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={pill(mode === "count")} onClick={() => setMode("count")}>
              🔢 count (theo số thứ tự)
            </button>
            <button type="button" className={pill(mode === "for_each")} onClick={() => setMode("for_each")}>
              🏷️ for_each (theo tên)
            </button>
            <button type="button" className={pill(removed)} onClick={() => setRemoved(!removed)}>
              {removed ? "↩️ Thêm lại binh" : "✂️ Xoá binh khỏi danh sách"}
            </button>
          </div>
          <p className={clsx("font-medium", !removed ? "text-stone-600 dark:text-stone-400" : mode === "count" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300")}>
            {removed ? summaries[mode] : "Bấm “Xoá binh khỏi danh sách” rồi so sánh hai chế độ."}
          </p>
        </div>
      }
      caption="count đánh số ghế theo thứ tự: một người rời đi, mọi người phía sau bị dồn ghế. for_each gắn tên lên ghế: ai đi thì chỉ ghế đó trống."
    >
      <DiagramGroupBox x={10} y={10} width={290} height={200} label="variables.tf + main.tf" tone="violet">
        {codeFor(mode, removed).map((line, index) => (
          <text key={`${index}-${line}`} x={24} y={56 + index * 25} fontSize={11.5} className="fill-stone-800 font-mono dark:fill-stone-200">
            {line}
          </text>
        ))}
      </DiagramGroupBox>

      <DiagramLabel x={400} y={24} text="Địa chỉ trong state" bold />
      <DiagramLabel x={600} y={24} text="Bucket thật → kết quả plan" bold />
      {rows.map((row, index) => {
        const y = 38 + index * 62;
        return (
          <g key={`${mode}-${removed}-${row.address}`}>
            <DiagramNode x={320} y={y} width={160} height={48} label={`aws_s3_bucket.${row.address}`.replace("aws_s3_bucket.", "")} sublabel="aws_s3_bucket" tone="blue" state={row.tone === "green" ? "normal" : "active"} />
            <DiagramArrow from={[482, y + 24]} to={[518, y + 24]} tone={row.tone} />
            <DiagramNode x={520} y={y} width={190} height={48} label={row.bucket} sublabel={row.result} tone={row.tone} state={row.tone === "rose" ? "active" : "normal"} dashed={row.tone === "rose"} />
          </g>
        );
      })}
      <DiagramLabel
        x={515}
        y={250}
        text={mode === "count" ? "Khoá = vị trí 0, 1, 2 → xoá giữa làm dịch chỉ số" : "Khoá = chuỗi ổn định → xoá giữa không ảnh hưởng ai"}
        tone={mode === "count" ? "amber" : "green"}
        bold
        size={13}
      />
      <DiagramLabel x={155} y={250} text={removed ? "Danh sách mới: an, chi" : "Danh sách: an, binh, chi"} tone="violet" size={13} />
    </DiagramFrame>
  );
}
