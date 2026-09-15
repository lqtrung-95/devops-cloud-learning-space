import { describe, expect, it } from "vitest";
import { pickContinueCourseId } from "./continue-course-picker";
import type { CourseProgressSummary } from "./module-progress-calculator";

const summary = (overrides: Partial<CourseProgressSummary>): CourseProgressSummary => ({
  percent: 0,
  modulesDone: 0,
  modulesTotal: 3,
  lessonsDone: 0,
  lessonsTotal: 9,
  labsDone: 0,
  labsTotal: 6,
  hasStarted: false,
  ...overrides,
});

const order = ["devops", "sd"];

describe("pickContinueCourseId", () => {
  it("sends a brand-new learner to the first course", () => {
    expect(pickContinueCourseId(order, new Map([["devops", summary({})], ["sd", summary({})]]), null)).toBe("devops");
  });

  it("prefers the most recently active unfinished course over display order", () => {
    const summaries = new Map([["devops", summary({ hasStarted: true })], ["sd", summary({ hasStarted: true })]]);
    expect(pickContinueCourseId(order, summaries, "sd")).toBe("sd");
  });

  it("moves on to the next course once the active one is finished", () => {
    const summaries = new Map([["devops", summary({ hasStarted: true, modulesDone: 3 })], ["sd", summary({})]]);
    expect(pickContinueCourseId(order, summaries, "devops")).toBe("sd");
  });

  it("skips courses without content and returns nothing when everything is done", () => {
    const summaries = new Map([["devops", summary({ hasStarted: true, modulesDone: 3 })], ["sd", summary({ modulesTotal: 0 })]]);
    expect(pickContinueCourseId(order, summaries, null)).toBeUndefined();
  });
});
