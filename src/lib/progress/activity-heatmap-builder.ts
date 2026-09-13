export interface HeatmapDay {
  /** Local date in YYYY-MM-DD. */
  date: string;
  count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Builds `weeks` columns of 7 days (Monday-first) ending with the week containing `today`.
 * Returns weeks[] where each week is 7 days; future days in the current week have count 0.
 */
export function buildActivityHeatmap(activityDates: Date[], today: Date, weeks = 12): HeatmapDay[][] {
  const counts = new Map<string, number>();
  for (const date of activityDates) {
    const key = toDateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const mondayOffset = (today.getDay() + 6) % 7;
  const currentMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
  const firstMonday = new Date(currentMonday.getTime() - (weeks - 1) * 7 * DAY_MS);

  return Array.from({ length: weeks }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(firstMonday.getFullYear(), firstMonday.getMonth(), firstMonday.getDate() + weekIndex * 7 + dayIndex);
      const key = toDateKey(date);
      return { date: key, count: counts.get(key) ?? 0 };
    }),
  );
}
