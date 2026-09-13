import clsx from "clsx";
import type { ReactNode } from "react";

type CalloutType = "tip" | "warning" | "mistake" | "info" | "cost";

const calloutStyles: Record<CalloutType, { emoji: string; label: string; className: string }> = {
  tip: { emoji: "💡", label: "Mẹo", className: "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40" },
  warning: { emoji: "⚠️", label: "Cẩn thận", className: "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40" },
  mistake: { emoji: "🙅", label: "Lỗi hay gặp", className: "border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40" },
  info: { emoji: "📘", label: "Ghi nhớ", className: "border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40" },
  cost: { emoji: "💸", label: "Chi phí", className: "border-violet-400 bg-violet-50 dark:border-violet-700 dark:bg-violet-950/40" },
};

interface CalloutBoxProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

export function CalloutBox({ type = "info", title, children }: CalloutBoxProps) {
  const style = calloutStyles[type];
  return (
    <div className={clsx("not-prose my-6 rounded-xl border-l-4 px-4 py-3", style.className)}>
      <p className="mb-1 font-semibold text-stone-900 dark:text-stone-100">
        <span aria-hidden>{style.emoji}</span> {title ?? style.label}
      </p>
      <div className="space-y-2 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300 [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] dark:[&_code]:bg-white/10">
        {children}
      </div>
    </div>
  );
}
