"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramLabel, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";
import { InlineCodeText } from "@/components/ui/inline-code-text";

interface Span {
  id: string;
  service: string;
  name: string;
  startMs: number;
  durationMs: number;
  depth: number;
  tone: DiagramTone;
  detail: string;
}

const spans: Span[] = [
  { id: "a1", service: "gateway", name: "POST /checkout", startMs: 0, durationMs: 860, depth: 0, tone: "blue", detail: "Root span: không có parent. Tạo trace ID mới và gửi header `traceparent` sang orders." },
  { id: "b2", service: "orders", name: "createOrder", startMs: 20, durationMs: 830, depth: 1, tone: "cyan", detail: "Nhận `traceparent` → dùng lại trace ID, parent = span của gateway." },
  { id: "c3", service: "orders", name: "SELECT orders", startMs: 30, durationMs: 45, depth: 2, tone: "slate", detail: "Span do auto-instrumentation của driver DB tạo, attribute `db.system=postgresql`. Nhanh — không phải thủ phạm." },
  { id: "d4", service: "payments", name: "charge", startMs: 90, durationMs: 750, depth: 2, tone: "amber", detail: "Chiếm gần hết thời gian. Mở span con để xem nó chờ ai." },
  { id: "e5", service: "bank-gateway", name: "HTTP POST /pay", startMs: 100, durationMs: 730, depth: 3, tone: "rose", detail: "Thủ phạm: 730ms chờ ngân hàng, `status=ERROR`, event `retry attempt=2`. Copy trace ID sang Loki để đọc log chi tiết." },
];

const TIMELINE_X = 250;
const TIMELINE_WIDTH = 450;
const TOTAL_MS = 900;
const TRACE_A = "4bf92f35…4736";
const TRACE_B = "9a1c07de…11f2";

export function TraceSpanWaterfallDiagram() {
  const [selectedId, setSelectedId] = useState("e5");
  const [propagationBroken, setPropagationBroken] = useState(false);
  const selected = spans.find((span) => span.id === selectedId) ?? spans[0];
  // When orders forgets to forward traceparent, payments starts a brand-new trace.
  const traceIdOf = (span: Span) => (propagationBroken && span.depth >= 2 && span.service !== "orders" ? TRACE_B : TRACE_A);

  return (
    <DiagramFrame
      title="Trace waterfall — bấm vào từng span"
      viewBox="0 0 720 312"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {[false, true].map((broken) => (
              <button
                key={String(broken)}
                type="button"
                onClick={() => setPropagationBroken(broken)}
                className={clsx(
                  "rounded-full px-3 py-1.5 font-medium",
                  propagationBroken === broken ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {broken ? "❌ orders quên truyền traceparent" : "✅ Context propagation đúng"}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <span className="font-semibold">
              {selected.service} · {selected.name} · {selected.durationMs}ms ·{" "}
            </span>
            <span className="font-mono text-[12px]">trace {traceIdOf(selected)}</span>
            <br />
            <InlineCodeText text={selected.detail} />
          </p>
          {propagationBroken && (
            <p className="text-rose-700 dark:text-rose-300">
              <InlineCodeText text="payments không nhận được header nên mở trace mới: waterfall bị cắt làm đôi, không còn thấy request chậm vì đâu. Sửa: dùng HTTP client đã instrument hoặc inject context thủ công." />
            </p>
          )}
        </div>
      }
      caption="Mỗi thanh là một span: bắt đầu lúc nào, kéo dài bao lâu, con của span nào. Cùng trace ID = cùng một hành trình request."
    >
      {[0, 300, 600, 900].map((ms) => (
        <DiagramLabel key={ms} x={TIMELINE_X + (ms / TOTAL_MS) * TIMELINE_WIDTH} y={20} text={`${ms}ms`} size={11} />
      ))}
      {spans.map((span, index) => {
        const y = 36 + index * 52;
        const inOtherTrace = traceIdOf(span) === TRACE_B;
        const barX = TIMELINE_X + (span.startMs / TOTAL_MS) * TIMELINE_WIDTH;
        const barWidth = Math.max(24, (span.durationMs / TOTAL_MS) * TIMELINE_WIDTH);
        return (
          <g key={span.id}>
            <DiagramLabel x={14 + span.depth * 16} y={y + 20} text={span.service} anchor="start" bold size={12} tone={span.tone} />
            <DiagramLabel x={14 + span.depth * 16} y={y + 36} text={span.name} anchor="start" size={11} />
            <DiagramNode
              x={barX}
              y={y + 6}
              width={barWidth}
              height={34}
              rounded={6}
              label={`${span.durationMs}ms`}
              tone={inOtherTrace ? "slate" : span.tone}
              dashed={inOtherTrace}
              state={span.id === selectedId ? "active" : "normal"}
              onClick={() => setSelectedId(span.id)}
            />
          </g>
        );
      })}
      {propagationBroken && <DiagramLabel x={560} y={304} text="↑ 2 span này thuộc trace khác" tone="rose" bold size={12} />}
    </DiagramFrame>
  );
}
