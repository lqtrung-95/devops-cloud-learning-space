import { describe, expect, it } from "vitest";
import { INITIAL_SCHEDULING_STATE, MAX_INTERVAL_DAYS, scheduleNextReview } from "./spaced-repetition-scheduler";

const REVIEWED_AT = new Date("2026-01-01T00:00:00.000Z");

describe("scheduleNextReview", () => {
  it("first Good schedules 1 day out with repetitions = 1", () => {
    const next = scheduleNextReview(INITIAL_SCHEDULING_STATE, 4, REVIEWED_AT);
    expect(next.intervalDays).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.dueAt).toEqual(new Date("2026-01-02T00:00:00.000Z"));
  });

  it("second consecutive Good schedules 6 days out with repetitions = 2", () => {
    const first = scheduleNextReview(INITIAL_SCHEDULING_STATE, 4, REVIEWED_AT);
    const second = scheduleNextReview(first, 4, REVIEWED_AT);
    expect(second.intervalDays).toBe(6);
    expect(second.repetitions).toBe(2);
  });

  it("third consecutive Good schedules round(6 * ease factor) days out", () => {
    const first = scheduleNextReview(INITIAL_SCHEDULING_STATE, 4, REVIEWED_AT);
    const second = scheduleNextReview(first, 4, REVIEWED_AT);
    const third = scheduleNextReview(second, 4, REVIEWED_AT);
    expect(third.intervalDays).toBe(Math.round(6 * second.easeFactor));
    expect(third.repetitions).toBe(3);
  });

  it("Again resets repetitions to 0, interval to 1 day and increments lapses", () => {
    const first = scheduleNextReview(INITIAL_SCHEDULING_STATE, 4, REVIEWED_AT);
    const second = scheduleNextReview(first, 4, REVIEWED_AT);
    const lapsed = scheduleNextReview(second, 0, REVIEWED_AT);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.lapses).toBe(second.lapses + 1);
  });

  it("repeated Again never drops the ease factor below 1.3", () => {
    let state = INITIAL_SCHEDULING_STATE;
    for (let i = 0; i < 50; i += 1) state = scheduleNextReview(state, 0, REVIEWED_AT);
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(state.easeFactor).toBeCloseTo(1.3, 5);
  });

  it("Easy raises the ease factor above the default", () => {
    const next = scheduleNextReview(INITIAL_SCHEDULING_STATE, 5, REVIEWED_AT);
    expect(next.easeFactor).toBeGreaterThan(INITIAL_SCHEDULING_STATE.easeFactor);
  });

  it("interval never exceeds MAX_INTERVAL_DAYS even after many Good/Easy reviews", () => {
    let state = INITIAL_SCHEDULING_STATE;
    for (let i = 0; i < 30; i += 1) state = scheduleNextReview(state, 5, REVIEWED_AT);
    expect(state.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it("dueAt is reviewedAt plus the resulting interval in days", () => {
    const next = scheduleNextReview({ ...INITIAL_SCHEDULING_STATE, repetitions: 1, intervalDays: 6 }, 4, REVIEWED_AT);
    expect(next.dueAt.getTime() - REVIEWED_AT.getTime()).toBe(next.intervalDays * 24 * 60 * 60 * 1000);
  });

  it("throws on an unknown grade", () => {
    expect(() => scheduleNextReview(INITIAL_SCHEDULING_STATE, 2 as never, REVIEWED_AT)).toThrow();
  });

  // Boundary case tests for SM-2 correctness verification
  it("ease factor floor 1.3 is enforced even at exactly 1.3", () => {
    // After ~50 Again reviews, EF approaches 1.3
    let state = INITIAL_SCHEDULING_STATE;
    for (let i = 0; i < 50; i += 1) state = scheduleNextReview(state, 0, REVIEWED_AT);
    expect(state.easeFactor).toBeCloseTo(1.3, 5);
    // One more Again should not drop below 1.3
    const next = scheduleNextReview(state, 0, REVIEWED_AT);
    expect(next.easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(next.easeFactor).toBeCloseTo(1.3, 5);
  });

  it("interval exactly hits 180-day cap and does not exceed", () => {
    let state = INITIAL_SCHEDULING_STATE;
    // Get to a high ease factor with many Good reviews
    for (let i = 0; i < 20; i += 1) state = scheduleNextReview(state, 5, REVIEWED_AT);
    expect(state.easeFactor).toBeGreaterThan(2.5);
    expect(state.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
    // Continue to force interval over MAX_INTERVAL_DAYS
    for (let i = 0; i < 5; i += 1) {
      state = scheduleNextReview(state, 5, REVIEWED_AT);
      expect(state.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
    }
  });

  it("review after lapse resets repetitions and interval but preserves lapses", () => {
    const first = scheduleNextReview(INITIAL_SCHEDULING_STATE, 4, REVIEWED_AT);
    const second = scheduleNextReview(first, 4, REVIEWED_AT);
    const lapsed = scheduleNextReview(second, 0, REVIEWED_AT); // Again/lapse

    // After lapse: repetitions reset to 0, interval to 1, lapses incremented
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.lapses).toBe(1);

    // Next Good after lapse should restart the sequence at interval=1
    const afterLapse = scheduleNextReview(lapsed, 4, REVIEWED_AT);
    expect(afterLapse.repetitions).toBe(1);
    expect(afterLapse.intervalDays).toBe(1);
    // And the next Good after that should jump to 6
    const continueLapse = scheduleNextReview(afterLapse, 4, REVIEWED_AT);
    expect(continueLapse.repetitions).toBe(2);
    expect(continueLapse.intervalDays).toBe(6);
  });

  it("SM-2 ease factor formula applies correctly for grade=3 (Hard)", () => {
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    // For q=3: EF' = EF + (0.1 - 2 * (0.08 + 2 * 0.02)) = EF + (0.1 - 2 * 0.12) = EF + (0.1 - 0.24) = EF - 0.14
    const first = scheduleNextReview(INITIAL_SCHEDULING_STATE, 3, REVIEWED_AT);
    const expected = INITIAL_SCHEDULING_STATE.easeFactor + (0.1 - (5 - 3) * (0.08 + (5 - 3) * 0.02));
    expect(first.easeFactor).toBeCloseTo(expected, 5);
  });

  it("SM-2 ease factor formula applies correctly for grade=5 (Easy)", () => {
    // For q=5: EF' = EF + (0.1 - 0 * (...)) = EF + 0.1
    const first = scheduleNextReview(INITIAL_SCHEDULING_STATE, 5, REVIEWED_AT);
    const expected = INITIAL_SCHEDULING_STATE.easeFactor + 0.1;
    expect(first.easeFactor).toBeCloseTo(expected, 5);
  });

  it("dueAt timestamp is exact (reviewedAt + interval_days milliseconds)", () => {
    const reviewedAt = new Date("2026-03-15T14:30:45.123Z");
    // When repetitions=2, a Good review computes interval = round(intervalDays * easeFactor)
    // = round(1 * 2.5) = 2.5 -> 2 or 3 depending on rounding. Let's use known first review.
    const afterFirst = scheduleNextReview(INITIAL_SCHEDULING_STATE, 4, reviewedAt);
    // After first Good: interval=1, repetitions=1, dueAt should be 1 day later
    const expectedMs = reviewedAt.getTime() + 1 * 24 * 60 * 60 * 1000;
    expect(afterFirst.dueAt.getTime()).toBe(expectedMs);
  });

  it("no state field is undefined after scheduling", () => {
    const next = scheduleNextReview(INITIAL_SCHEDULING_STATE, 4, REVIEWED_AT);
    expect(next.easeFactor).toBeDefined();
    expect(next.intervalDays).toBeDefined();
    expect(next.repetitions).toBeDefined();
    expect(next.lapses).toBeDefined();
    expect(next.dueAt).toBeDefined();
    expect(next.easeFactor).not.toBeNaN();
    expect(next.intervalDays).not.toBeNaN();
  });
});
