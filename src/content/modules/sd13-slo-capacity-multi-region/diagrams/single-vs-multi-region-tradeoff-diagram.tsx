"use client";

import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";

type Mode = "single" | "multi";

const buttonClass = (active: boolean) =>
  active
    ? "rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
    : "rounded-full bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300";

/**
 * Toggle single-region vs multi-region (active-passive) to compare latency for a
 * far-away user, cross-region replication cost, and consistency complexity. Teaches
 * that multi-region trades latency/DR wins for real, ongoing egress + conflict cost.
 */
export function SingleVsMultiRegionTradeoffDiagram() {
  const [mode, setMode] = useState<Mode>("single");
  const isMulti = mode === "multi";

  return (
    <DiagramFrame
      title="User ở Châu Á gọi hệ thống đặt ở US — 1 region vs 2 region"
      viewBox="0 0 720 280"
      controls={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode("single")} className={buttonClass(mode === "single")}>
            1 region (US)
          </button>
          <button type="button" onClick={() => setMode("multi")} className={buttonClass(mode === "multi")}>
            2 region (US + Asia, active-passive)
          </button>
        </div>
      }
      caption={
        isMulti
          ? "User Asia được route tới region Asia gần hơn ⇒ latency thấp hơn nhiều. Đổi lại: phải replicate dữ liệu liên vùng (tốn cross-region data transfer/egress) và xử lý conflict khi cả hai vùng cùng có thể ghi (nối kiến thức SD09) — chi phí và độ phức tạp không tự nhiên có availability cao hơn."
          : "Chỉ 1 region: đơn giản, không tốn cross-region egress, không có conflict giữa 2 vùng ghi — nhưng user ở xa luôn chịu latency cao, và cả hệ thống phụ thuộc vào một region duy nhất."
      }
    >
      <text x={70} y={30} fontSize={22} textAnchor="middle">
        🧑‍💻
      </text>
      <DiagramLabel x={70} y={50} text="User (Châu Á)" size={12} />

      <DiagramNode x={280} y={15} width={160} height={60} emoji="🏢" label="Region US" sublabel="production" tone="blue" state="active" />

      <DiagramArrow
        from={[100, 30]}
        to={[280, 40]}
        tone={isMulti ? "amber" : "rose"}
        label={isMulti ? "~150ms (fallback)" : "~200ms xuyên lục địa"}
        dimmed={isMulti}
      />

      {isMulti && (
        <>
          <DiagramNode x={280} y={130} width={160} height={60} emoji="🏯" label="Region Asia" sublabel="passive / DR" tone="green" state="active" />
          <DiagramArrow from={[100, 45]} to={[280, 150]} tone="green" animated label="~20ms (gần hơn)" />
          <DiagramArrow from={[360, 75]} to={[360, 130]} tone="violet" animated label="replicate (egress $)" curve={40} />
        </>
      )}

      <DiagramLabel
        x={550}
        y={40}
        text={isMulti ? "Latency user Asia: thấp" : "Latency user Asia: cao"}
        tone={isMulti ? "green" : "rose"}
        size={13}
        bold
      />
      <DiagramLabel
        x={550}
        y={65}
        text={isMulti ? "Chi phí: + cross-region egress" : "Chi phí: chỉ 1 region"}
        tone={isMulti ? "amber" : "green"}
        size={13}
        bold
      />
      <DiagramLabel
        x={550}
        y={90}
        text={isMulti ? "Consistency: cần xử lý conflict" : "Consistency: đơn giản (1 nguồn ghi)"}
        tone={isMulti ? "rose" : "green"}
        size={13}
        bold
      />

      <DiagramLabel
        x={360}
        y={240}
        text="Đổi ý khi: user quốc tế đông + độ nhạy latency cao (chat, gaming), hoặc luật data residency bắt buộc lưu dữ liệu tại vùng."
        size={11.5}
      />
    </DiagramFrame>
  );
}
