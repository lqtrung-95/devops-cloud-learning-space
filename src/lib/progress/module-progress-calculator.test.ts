import { describe, expect, it } from "vitest";
import type { ModuleDefinition } from "@/content/content-types";
import { calculateModuleProgress, calculateOverallPercent, summarizeCourseProgress } from "./module-progress-calculator";
import { labItemKey, lessonItemKey, parseItemKey } from "./progress-item-keys";

const sampleModule = {
  id: "m99",
  slug: "m99-sample",
  lessons: [{ slug: "one" }, { slug: "two" }],
  labs: [{ id: "lab-a" }],
} as unknown as ModuleDefinition;

describe("calculateModuleProgress", () => {
  it("is 0% with nothing done", () => {
    const progress = calculateModuleProgress(sampleModule, new Set(), null);
    expect(progress).toMatchObject({ lessonsDone: 0, labsDone: 0, percent: 0, quizPassed: false, isComplete: false });
  });

  it("counts lessons, labs and quiz as equal units", () => {
    const completed = new Set([lessonItemKey("m99", "one"), labItemKey("m99", "lab-a")]);
    const progress = calculateModuleProgress(sampleModule, completed, 50);
    expect(progress.percent).toBe(50);
    expect(progress.quizPassed).toBe(false);
  });

  it("is complete only when everything is done and quiz passed", () => {
    const completed = new Set([lessonItemKey("m99", "one"), lessonItemKey("m99", "two"), labItemKey("m99", "lab-a")]);
    expect(calculateModuleProgress(sampleModule, completed, 79).isComplete).toBe(false);
    expect(calculateModuleProgress(sampleModule, completed, 80)).toMatchObject({ percent: 100, isComplete: true });
  });

  it("ignores keys that belong to other modules", () => {
    const progress = calculateModuleProgress(sampleModule, new Set([lessonItemKey("m01", "one")]), null);
    expect(progress.lessonsDone).toBe(0);
  });
});

describe("calculateOverallPercent", () => {
  it("averages module percents and handles empty list", () => {
    const base = calculateModuleProgress(sampleModule, new Set(), null);
    expect(calculateOverallPercent([])).toBe(0);
    expect(calculateOverallPercent([{ ...base, percent: 100 }, { ...base, percent: 50 }])).toBe(75);
  });
});

describe("summarizeCourseProgress", () => {
  it("is empty and not started for no progress", () => {
    const untouched = calculateModuleProgress(sampleModule, new Set(), null);
    expect(summarizeCourseProgress([untouched, untouched])).toEqual({
      percent: 0,
      modulesDone: 0,
      modulesTotal: 2,
      lessonsDone: 0,
      lessonsTotal: 4,
      labsDone: 0,
      labsTotal: 2,
      hasStarted: false,
    });
  });

  it("sums module counts and counts a failed quiz attempt as started", () => {
    const allKeys = new Set([lessonItemKey("m99", "one"), lessonItemKey("m99", "two"), labItemKey("m99", "lab-a")]);
    const complete = calculateModuleProgress(sampleModule, allKeys, 100);
    const quizOnly = calculateModuleProgress(sampleModule, new Set(), 10);
    expect(summarizeCourseProgress([complete, quizOnly])).toMatchObject({ percent: 50, modulesDone: 1, lessonsDone: 2, labsDone: 1, hasStarted: true });
    expect(summarizeCourseProgress([quizOnly]).hasStarted).toBe(true);
  });
});

describe("progress item keys", () => {
  it("round-trips lesson and lab keys", () => {
    expect(parseItemKey(lessonItemKey("m01", "linux-filesystem"))).toEqual({ moduleId: "m01", kind: "lesson", id: "linux-filesystem" });
    expect(parseItemKey(labItemKey("m01", "backup-script"))).toEqual({ moduleId: "m01", kind: "lab", id: "backup-script" });
  });

  it("rejects malformed keys", () => {
    expect(parseItemKey("m01:quiz:x")).toBeNull();
    expect(parseItemKey("m01:lesson:../../etc")).toBeNull();
    expect(parseItemKey("")).toBeNull();
  });
});
