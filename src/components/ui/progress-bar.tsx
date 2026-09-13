import clsx from "clsx";

interface ProgressBarProps {
  percent: number;
  size?: "sm" | "md";
  label?: string;
}

export function ProgressBar({ percent, size = "md", label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Tiến độ"}
      className={clsx("w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800", size === "sm" ? "h-1.5" : "h-2.5")}
    >
      <div
        className={clsx("h-full rounded-full transition-all duration-700", clamped === 100 ? "bg-emerald-500" : "bg-indigo-500")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
