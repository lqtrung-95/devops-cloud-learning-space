"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramArrow, DiagramGroupBox, DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

/**
 * "Recommendation service" becomes slow. Without a bulkhead, Home/Search/Checkout share ONE
 * connection pool with Recommendation calls — that pool fills with stuck requests and every
 * feature using it starves, even though only one dependency is actually broken (domino falls
 * all the way down). With a bulkhead, Recommendation calls get their OWN small pool: it fills
 * and fails fast, but Home/Search/Checkout keep serving normally because they never touch it.
 */
type Mode = "no-bulkhead" | "bulkhead";

const features = ["Trang chủ", "Tìm kiếm", "Thanh toán"];

export function CascadingFailureBulkheadDiagram() {
  const [mode, setMode] = useState<Mode>("no-bulkhead");
  const bulkhead = mode === "bulkhead";

  const featureTone: DiagramTone = bulkhead ? "green" : "rose";
  const featureLabel = bulkhead ? "Vẫn phục vụ bình thường" : "Hết connection, timeout theo dây chuyền";
  const poolLabel = bulkhead ? "Pool riêng: đầy, fail fast" : "1 pool dùng chung: nghẽn hết";

  return (
    <DiagramFrame
      title={`Recommendation service bị chậm — ${bulkhead ? "có bulkhead" : "không có bulkhead"}`}
      viewBox="0 0 720 320"
      controls={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("no-bulkhead")}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              !bulkhead ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            Không bulkhead: 1 pool dùng chung
          </button>
          <button
            type="button"
            onClick={() => setMode("bulkhead")}
            className={clsx(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              bulkhead ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
            )}
          >
            Có bulkhead: pool riêng cho Recommendation
          </button>
        </div>
      }
      caption={
        bulkhead
          ? "Bulkhead = ngăn riêng từng khoang tàu: Recommendation có pool connection/thread RIÊNG. Pool đó đầy và fail fast, nhưng Trang chủ/Tìm kiếm/Thanh toán dùng pool khác nên không hề hấn gì."
          : "Không có bulkhead = một khoang tàu chung: cả 4 tính năng cùng xin connection từ 1 pool. Recommendation chậm giữ hết connection trong pool đó → domino đổ, mọi tính năng khác cũng hết connection theo."
      }
    >
      <DiagramNode x={20} y={30} width={150} height={60} label="Recommendation" sublabel="đang chậm/timeout" emoji="🐌" tone="amber" state="active" rounded={10} />

      {bulkhead ? (
        <>
          <DiagramGroupBox x={220} y={20} width={200} height={80} label="Pool riêng: Recommendation" tone="amber">
            <DiagramNode x={240} y={48} width={160} height={40} label={poolLabel} tone="amber" rounded={8} />
          </DiagramGroupBox>
          <DiagramGroupBox x={220} y={130} width={200} height={80} label="Pool chung: 3 tính năng còn lại" tone="green">
            <DiagramNode x={240} y={158} width={160} height={40} label="Còn nhiều connection rảnh" tone="green" rounded={8} />
          </DiagramGroupBox>
          <DiagramArrow from={[170, 60]} to={[220, 60]} tone="amber" label="gọi" />
        </>
      ) : (
        <>
          <DiagramGroupBox x={220} y={60} width={200} height={80} label="1 pool connection dùng chung" tone="rose">
            <DiagramNode x={240} y={88} width={160} height={40} label={poolLabel} tone="rose" state="active" rounded={8} />
          </DiagramGroupBox>
          <DiagramArrow from={[170, 60]} to={[220, 90]} tone="rose" label="giữ hết connection" animated />
        </>
      )}

      {features.map((feature, index) => {
        const x = 470;
        const y = 30 + index * 90;
        const fromPool: [number, number] = bulkhead ? [420, 170] : [420, 100];
        return (
          <g key={feature}>
            <DiagramArrow from={fromPool} to={[x, y + 30]} tone={bulkhead ? "green" : "rose"} curve={bulkhead ? 0 : (index - 1) * 20} />
            <DiagramNode x={x} y={y} width={200} height={60} label={feature} sublabel={featureLabel} emoji={bulkhead ? "✅" : "🔥"} tone={featureTone} rounded={10} />
          </g>
        );
      })}

      <DiagramLabel
        x={360}
        y={300}
        text={bulkhead ? "Khoang tàu tách riêng: 1 khoang ngập nước, tàu vẫn nổi" : "Không có vách ngăn: 1 khoang ngập nước, cả tàu chìm theo"}
        size={12.5}
      />
    </DiagramFrame>
  );
}
