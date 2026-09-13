export interface HeatmapDay {
  /** Calendar date in the app time zone, YYYY-MM-DD. */
  date: string;
  count: number;
}

/** Learners are in Vietnam; bucket activity by their calendar day, not the server's. */
export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

const dateKeyFormatters = new Map<string, Intl.DateTimeFormat>();

/** YYYY-MM-DD of `date` as seen in `timeZone`. */
export function toDateKey(date: Date, timeZone = APP_TIME_ZONE): string {
  let formatter = dateKeyFormatters.get(timeZone);
  if (!formatter) {
    // en-CA formats dates as YYYY-MM-DD.
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    dateKeyFormatters.set(timeZone, formatter);
  }
  return formatter.format(date);
}

/** Pure calendar arithmetic on a YYYY-MM-DD key (UTC-based, so no DST drift). */
function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * Builds `weeks` columns of 7 days (Monday-first) ending with the week containing `today`
 * in `timeZone`. Future days in the current week have count 0.
 */
export function buildActivityHeatmap(activityDates: Date[], today: Date, weeks = 12, timeZone = APP_TIME_ZONE): HeatmapDay[][] {
  const counts = new Map<string, number>();
  for (const date of activityDates) {
    const key = toDateKey(date, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const todayKey = toDateKey(today, timeZone);
  const [year, month, day] = todayKey.split("-").map(Number);
  const mondayOffset = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  const firstMonday = addDays(todayKey, -mondayOffset - (weeks - 1) * 7);

  return Array.from({ length: weeks }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const key = addDays(firstMonday, weekIndex * 7 + dayIndex);
      return { date: key, count: counts.get(key) ?? 0 };
    }),
  );
}
