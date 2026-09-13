import clsx from "clsx";
import type { HeatmapDay } from "@/lib/progress/activity-heatmap-builder";

const dayLabels = ["T2", "", "T4", "", "T6", "", "CN"];

function intensityClass(count: number): string {
  if (count === 0) return "bg-stone-200 dark:bg-stone-800";
  if (count <= 1) return "bg-emerald-200 dark:bg-emerald-900";
  if (count <= 3) return "bg-emerald-400 dark:bg-emerald-700";
  return "bg-emerald-600 dark:bg-emerald-500";
}

/** GitHub-style activity grid: columns are weeks, rows are weekdays (Monday first). */
export function ActivityHeatmapGrid({ weeks, summary }: { weeks: HeatmapDay[][]; summary: string }) {
  return (
    <div role="img" aria-label={summary} className="flex gap-1 overflow-x-auto pb-1">
      <div className="mr-1 grid grid-rows-7 gap-1 text-[10px] leading-3 text-stone-500">
        {dayLabels.map((label, index) => (
          <span key={index} className="h-3">
            {label}
          </span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0].date} className="grid grid-rows-7 gap-1">
          {week.map((day) => (
            <span
              key={day.date}
              title={`${day.date}: ${day.count} hoạt động`}
              className={clsx("size-3 rounded-[3px]", intensityClass(day.count))}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
