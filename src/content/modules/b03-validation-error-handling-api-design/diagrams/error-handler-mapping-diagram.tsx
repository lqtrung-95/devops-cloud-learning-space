"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import type { DiagramTone } from "@/components/diagrams/diagram-tones";

type ErrorKind = "zod" | "notFound" | "unexpected";

const branches: Record<
  ErrorKind,
  { label: string; sourceLabel: string; sourceSublabel: string; status: string; code: string; tone: DiagramTone; y: number }
> = {
  zod: {
    label: "Lỗi validation (ZodError)",
    sourceLabel: "🧾 ZodError",
    sourceSublabel: "throw từ Zod .parse()",
    status: "422",
    code: "VALIDATION_ERROR",
    tone: "amber",
    y: 20,
  },
  notFound: {
    label: "Lỗi nghiệp vụ (NotFoundError)",
    sourceLabel: "🔎 NotFoundError",
    sourceSublabel: "throw new NotFoundError() trong handler",
    status: "404",
    code: "NOT_FOUND",
    tone: "blue",
    y: 122,
  },
  unexpected: {
    label: "Lỗi không lường trước",
    sourceLabel: "💥 Error lạ",
    sourceSublabel: "vd: Postgres connection reset",
    status: "500",
    code: "INTERNAL_ERROR",
    tone: "rose",
    y: 224,
  },
};

export function ErrorHandlerMappingDiagram() {
  const [active, setActive] = useState<ErrorKind>("zod");
  const current = branches[active];

  return (
    <DiagramFrame
      title="Một setErrorHandler — ba loại lỗi, đúng ba câu trả lời"
      viewBox="0 0 720 300"
      controls={
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(branches) as ErrorKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setActive(kind)}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-sm font-medium",
                  active === kind ? "bg-indigo-600 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
                )}
              >
                {branches[kind].label}
              </button>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            <code>setErrorHandler</code> kiểm tra <code>error instanceof …</code> theo thứ tự, ánh xạ mỗi loại tới đúng status + <code>code</code> — nhưng
            luôn trả cùng một shape <code>{"{ error: { code, message, details } }"}</code>.
          </p>
        </div>
      }
      caption="Chọn một loại lỗi để xem đường đi của nó qua bộ xử lý tập trung."
    >
      <DiagramNode x={20} y={122} width={170} height={56} tone={current.tone} state="active" label={current.sourceLabel} sublabel={current.sourceSublabel} />
      <DiagramNode x={280} y={122} width={180} height={56} tone="violet" state="active" label="🧠 setErrorHandler" sublabel="if / else if theo instanceof" />
      <DiagramArrow from={[190, 150]} to={[278, 150]} tone={current.tone} />

      {(Object.keys(branches) as ErrorKind[]).map((kind) => {
        const branch = branches[kind];
        const isActive = kind === active;
        return (
          <g key={kind}>
            <DiagramArrow
              from={[460, 150]}
              to={[560, branch.y + 28]}
              tone={branch.tone}
              curve={branch.y === 150 ? 0 : (branch.y - 150) / 2}
              dimmed={!isActive}
            />
            <DiagramNode
              x={560}
              y={branch.y}
              width={150}
              height={56}
              tone={branch.tone}
              state={isActive ? "active" : "dimmed"}
              label={`${branch.status} ${branch.code}`}
            />
          </g>
        );
      })}
    </DiagramFrame>
  );
}
