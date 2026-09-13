import { describe, expect, it } from "vitest";
import { buildActivityHeatmap } from "./activity-heatmap-builder";

describe("buildActivityHeatmap", () => {
  // Saturday 2026-09-12, local time.
  const today = new Date(2026, 8, 12, 15, 0);

  it("returns weeks × 7 days starting on Monday", () => {
    const weeks = buildActivityHeatmap([], today, 4);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[3][0].date).toBe("2026-09-07");
    expect(weeks[3][5].date).toBe("2026-09-12");
    expect(weeks[0][0].date).toBe("2026-08-17");
  });

  it("counts multiple activities on the same day", () => {
    const activity = [new Date(2026, 8, 10, 9), new Date(2026, 8, 10, 22), new Date(2026, 8, 11, 8)];
    const days = buildActivityHeatmap(activity, today, 1).flat();
    expect(days.find((day) => day.date === "2026-09-10")?.count).toBe(2);
    expect(days.find((day) => day.date === "2026-09-11")?.count).toBe(1);
  });

  it("handles Sunday as the last day of the week", () => {
    const sunday = new Date(2026, 8, 13, 10);
    const weeks = buildActivityHeatmap([sunday], sunday, 1);
    expect(weeks[0][0].date).toBe("2026-09-07");
    expect(weeks[0][6]).toEqual({ date: "2026-09-13", count: 1 });
  });
});
