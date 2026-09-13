import type { ReactNode } from "react";

interface Eli5BoxProps {
  /** Short analogy headline, e.g. "Linux giống như một toà chung cư". */
  title: string;
  emoji?: string;
  children: ReactNode;
}

/** "Explain like I'm 5" box — an everyday analogy placed before the technical explanation. */
export function Eli5Box({ title, emoji = "🧸", children }: Eli5BoxProps) {
  return (
    <aside className="not-prose my-8 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-amber-700/60 dark:from-amber-950/40 dark:to-orange-950/30">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-200 text-2xl dark:bg-amber-900" aria-hidden>
          {emoji}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Giải thích như cho bé 5 tuổi</p>
          <p className="text-lg font-bold text-stone-900 dark:text-amber-50">{title}</p>
        </div>
      </div>
      <div className="space-y-3 text-[15.5px] leading-relaxed text-stone-800 dark:text-stone-200 [&_strong]:text-stone-950 dark:[&_strong]:text-white">
        {children}
      </div>
    </aside>
  );
}
