import { describe, expect, it } from "vitest";
import { buildActivityHeatmap, toDateKey } from "./activity-heatmap-builder";

// All instants are written in UTC so results don't depend on the machine's time zone.
describe("buildActivityHeatmap", () => {
  // Saturday 2026-09-12 15:00 in Vietnam (UTC+7).
  const today = new Date("2026-09-12T08:00:00Z");

  it("returns weeks × 7 days starting on Monday", () => {
    const weeks = buildActivityHeatmap([], today, 4);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[3][0].date).toBe("2026-09-07");
    expect(weeks[3][5].date).toBe("2026-09-12");
    expect(weeks[0][0].date).toBe("2026-08-17");
  });

  it("counts multiple activities on the same local day", () => {
    const activity = [new Date("2026-09-10T02:00:00Z"), new Date("2026-09-10T15:00:00Z"), new Date("2026-09-11T01:00:00Z")];
    const days = buildActivityHeatmap(activity, today, 1).flat();
    expect(days.find((day) => day.date === "2026-09-10")?.count).toBe(2);
    expect(days.find((day) => day.date === "2026-09-11")?.count).toBe(1);
  });

  it("buckets early-morning Vietnam activity on the Vietnam date, not the UTC date", () => {
    // 06:00 on 13 Sep in Vietnam = 23:00 on 12 Sep UTC.
    const earlyMorning = new Date("2026-09-12T23:00:00Z");
    expect(toDateKey(earlyMorning)).toBe("2026-09-13");
    const weeks = buildActivityHeatmap([earlyMorning], earlyMorning, 1);
    expect(weeks[0][6]).toEqual({ date: "2026-09-13", count: 1 });
  });

  it("keeps Monday-first columns across a DST change in another time zone", () => {
    const weeks = buildActivityHeatmap([], new Date("2026-03-31T16:00:00Z"), 12, "America/New_York");
    expect(weeks[0][0].date).toBe("2026-01-12");
    expect(weeks[11][6].date).toBe("2026-04-05");
  });
});
