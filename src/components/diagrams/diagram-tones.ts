/**
 * Colour tones for diagram shapes. Class strings are literal so Tailwind can detect them.
 * Each tone works in light and dark mode.
 */
export type DiagramTone = "blue" | "green" | "amber" | "rose" | "violet" | "slate" | "cyan";

export const diagramToneClasses: Record<DiagramTone, { shape: string; text: string; stroke: string; fill: string }> = {
  blue: {
    shape: "fill-blue-50 stroke-blue-500 dark:fill-blue-950 dark:stroke-blue-400",
    text: "fill-blue-900 dark:fill-blue-100",
    stroke: "stroke-blue-500 dark:stroke-blue-400",
    fill: "fill-blue-500 dark:fill-blue-400",
  },
  green: {
    shape: "fill-emerald-50 stroke-emerald-500 dark:fill-emerald-950 dark:stroke-emerald-400",
    text: "fill-emerald-900 dark:fill-emerald-100",
    stroke: "stroke-emerald-500 dark:stroke-emerald-400",
    fill: "fill-emerald-500 dark:fill-emerald-400",
  },
  amber: {
    shape: "fill-amber-50 stroke-amber-500 dark:fill-amber-950 dark:stroke-amber-400",
    text: "fill-amber-900 dark:fill-amber-100",
    stroke: "stroke-amber-500 dark:stroke-amber-400",
    fill: "fill-amber-500 dark:fill-amber-400",
  },
  rose: {
    shape: "fill-rose-50 stroke-rose-500 dark:fill-rose-950 dark:stroke-rose-400",
    text: "fill-rose-900 dark:fill-rose-100",
    stroke: "stroke-rose-500 dark:stroke-rose-400",
    fill: "fill-rose-500 dark:fill-rose-400",
  },
  violet: {
    shape: "fill-violet-50 stroke-violet-500 dark:fill-violet-950 dark:stroke-violet-400",
    text: "fill-violet-900 dark:fill-violet-100",
    stroke: "stroke-violet-500 dark:stroke-violet-400",
    fill: "fill-violet-500 dark:fill-violet-400",
  },
  slate: {
    shape: "fill-stone-50 stroke-stone-400 dark:fill-stone-900 dark:stroke-stone-500",
    text: "fill-stone-800 dark:fill-stone-200",
    stroke: "stroke-stone-400 dark:stroke-stone-500",
    fill: "fill-stone-400 dark:fill-stone-500",
  },
  cyan: {
    shape: "fill-cyan-50 stroke-cyan-500 dark:fill-cyan-950 dark:stroke-cyan-400",
    text: "fill-cyan-900 dark:fill-cyan-100",
    stroke: "stroke-cyan-500 dark:stroke-cyan-400",
    fill: "fill-cyan-500 dark:fill-cyan-400",
  },
};
