"use client";

import clsx from "clsx";
import { useState } from "react";
import { DiagramFrame } from "@/components/diagrams/diagram-frame";
import { DiagramArrow, DiagramNode } from "@/components/diagrams/diagram-shapes";
import { InlineCodeText } from "@/components/ui/inline-code-text";

interface PodSpec {
  signed: boolean;
  runAsRoot: boolean;
  hasLimits: boolean;
  tagLatest: boolean;
}

function evaluate(spec: PodSpec): { allowed: boolean; reason: string } {
  if (spec.tagLatest) return { allowed: false, reason: "Policy `disallow-latest-tag`: image dùng tag `:latest`, phải chỉ định version hoặc digest cụ thể." };
  if (!spec.signed) return { allowed: false, reason: "Policy `verify-image-signature`: image chưa được ký (hoặc chữ ký không khớp danh tính workflow đã cấu hình)." };
  if (spec.runAsRoot) return { allowed: false, reason: "Policy `disallow-privileged-and-root`: container thiếu `runAsNonRoot: true` hoặc bật `privileged: true`." };
  if (!spec.hasLimits) return { allowed: false, reason: "Policy `require-resource-limits`: thiếu `resources.limits.cpu`/`memory`." };
  return { allowed: true, reason: "Vượt qua cả 4 policy → admission controller CHO PHÉP tạo Pod." };
}

const toggleClass = (active: boolean, warn = false) =>
  clsx(
    "rounded-full px-3 py-1.5 text-sm font-medium",
    active ? (warn ? "bg-rose-600 text-white" : "bg-emerald-600 text-white") : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  );

export function KyvernoAdmissionToggleDiagram() {
  const [spec, setSpec] = useState<PodSpec>({ signed: true, runAsRoot: false, hasLimits: true, tagLatest: false });
  const result = evaluate(spec);

  return (
    <DiagramFrame
      title="Kyverno admission controller — bật/tắt cấu hình Pod và xem kết quả"
      viewBox="0 0 720 240"
      controls={
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSpec((s) => ({ ...s, signed: !s.signed }))} className={toggleClass(spec.signed)}>
              {spec.signed ? "✅ Image đã ký" : "❌ Image chưa ký"}
            </button>
            <button type="button" onClick={() => setSpec((s) => ({ ...s, runAsRoot: !s.runAsRoot }))} className={toggleClass(!spec.runAsRoot)}>
              {spec.runAsRoot ? "⚠️ runAsRoot" : "✅ runAsNonRoot"}
            </button>
            <button type="button" onClick={() => setSpec((s) => ({ ...s, hasLimits: !s.hasLimits }))} className={toggleClass(spec.hasLimits)}>
              {spec.hasLimits ? "✅ Có resource limits" : "❌ Thiếu limits"}
            </button>
            <button type="button" onClick={() => setSpec((s) => ({ ...s, tagLatest: !s.tagLatest }))} className={toggleClass(!spec.tagLatest)}>
              {spec.tagLatest ? "⚠️ tag :latest" : "✅ tag cố định"}
            </button>
          </div>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            <InlineCodeText text={result.reason} />
          </p>
        </div>
      }
      caption="Kyverno chạy ở chế độ Enforce sẽ chặn NGAY tại API server — Pod vi phạm không bao giờ được tạo ra, không phải bị xoá sau khi đã chạy."
    >
      <DiagramNode x={10} y={80} width={140} height={80} label="kubectl apply" sublabel="Pod spec" emoji="📝" tone="slate" />
      <DiagramNode x={230} y={70} width={180} height={100} label="API server" sublabel="admission webhook" emoji="🚪" tone="cyan" state="active" />
      <DiagramNode x={490} y={20} width={210} height={80} label={result.allowed ? "✅ Pod created" : "❌ Admission denied"} tone={result.allowed ? "green" : "rose"} state="active" />
      <DiagramNode x={490} y={140} width={210} height={70} label="Kyverno" sublabel="4 ClusterPolicy" emoji="🛡️" tone="violet" />

      <DiagramArrow from={[152, 120]} to={[226, 120]} tone="slate" animated />
      <DiagramArrow from={[410, 100]} to={[540, 96]} tone={result.allowed ? "green" : "rose"} label="?" animated />
      <DiagramArrow from={[410, 150]} to={[486, 170]} tone="violet" />
    </DiagramFrame>
  );
}
