import type { ReactNode } from "react";

interface DiagramFrameProps {
  title: string;
  /** Short explanation under the diagram. */
  caption?: ReactNode;
  viewBox: string;
  children: ReactNode;
  /** Rendered between the SVG and the caption — stepper controls, toggles, etc. */
  controls?: ReactNode;
}

/** Card wrapper that makes an SVG diagram responsive and accessible. */
export function DiagramFrame({ title, caption, viewBox, children, controls }: DiagramFrameProps) {
  return (
    <figure className="not-prose my-8 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950">
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 dark:border-stone-800 dark:text-stone-300">
        <span aria-hidden>🖼️</span>
        {title}
      </div>
      <div className="overflow-x-auto px-2 py-4 sm:px-4">
        <svg viewBox={viewBox} role="img" aria-label={title} className="mx-auto h-auto w-full min-w-[520px] max-w-3xl font-sans">
          {children}
        </svg>
      </div>
      {controls && <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-800">{controls}</div>}
      {caption && (
        <figcaption className="border-t border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
