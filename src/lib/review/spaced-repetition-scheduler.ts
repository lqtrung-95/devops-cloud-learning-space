import type { CardSchedulingState, ReviewGrade } from "./review-types";

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
// Courses run 24–28 weeks; an uncapped interval can push a card past course end,
// defeating the whole point of reviewing it. Deviation from canonical SM-2.
export const MAX_INTERVAL_DAYS = 180;

const VALID_GRADES: ReadonlySet<ReviewGrade> = new Set([0, 3, 4, 5]);

/** Fresh per-(user, card) state before any review has happened. */
export const INITIAL_SCHEDULING_STATE: CardSchedulingState = {
  easeFactor: INITIAL_EASE_FACTOR,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
  dueAt: new Date(0),
};

/**
 * Timestamp arithmetic, not Anki's day-boundary due dates — avoids all timezone code.
 * A card rated at 23:00 is due at 23:00 the next day. Single helper so the policy is
 * swappable without touching the SM-2 formula itself.
 */
function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Canonical SM-2 with two documented deviations: interval capped at `MAX_INTERVAL_DAYS`,
 * and `dueAt` computed via timestamp arithmetic (`addDays`) rather than day boundaries.
 * Pure and deterministic — `reviewedAt` is always supplied by the caller, never `new Date()`.
 */
export function scheduleNextReview(current: CardSchedulingState, grade: ReviewGrade, reviewedAt: Date): CardSchedulingState {
  if (!VALID_GRADES.has(grade)) throw new Error(`Unknown review grade: ${grade}`);

  const easeFactor = Math.max(MIN_EASE_FACTOR, current.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

  if (grade < 3) {
    return {
      easeFactor,
      intervalDays: 1,
      repetitions: 0,
      lapses: current.lapses + 1,
      dueAt: addDays(reviewedAt, 1),
    };
  }

  const repetitions = current.repetitions + 1;
  let intervalDays: number;
  if (current.repetitions === 0) intervalDays = 1;
  else if (current.repetitions === 1) intervalDays = 6;
  else intervalDays = Math.round(current.intervalDays * easeFactor);
  intervalDays = Math.min(intervalDays, MAX_INTERVAL_DAYS);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses: current.lapses,
    dueAt: addDays(reviewedAt, intervalDays),
  };
}
