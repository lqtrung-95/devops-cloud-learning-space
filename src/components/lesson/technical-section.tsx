import type { ReactNode } from "react";

/** Visual divider that marks the switch from the ELI5 analogy to the precise technical explanation. */
export function TechnicalSection({ title = "Nói kỹ thuật hơn", children }: { title?: string; children: ReactNode }) {
  return (
    <section className="my-10">
      <div className="not-prose mb-4 flex items-center gap-3">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          🔧 {title}
        </span>
        <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
      </div>
      {children}
    </section>
  );
}
