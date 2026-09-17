// Pure types for the spaced-repetition review domain. No DB, no React, no `server-only`.

/** SM-2 grade buttons: Again = 0, Hard = 3, Good = 4, Easy = 5. */
export type ReviewGrade = 0 | 3 | 4 | 5;

/** A flashcard derived from an existing quiz question. `back` intentionally carries the answer. */
export interface FlashCard {
  /** `<moduleId>:card:<quizQuestionId>` — see `flashcard-card-keys.ts`. */
  id: string;
  moduleId: string;
  front: string;
  back: {
    answer: string;
    explanation: string;
  };
}

/** Per-(user, card) SM-2 scheduling state. */
export interface CardSchedulingState {
  /** ≥ 1.3. */
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: Date;
}

export interface ReviewQueue {
  /** Session-capped list of cards to show, due cards first then new cards. */
  cards: FlashCard[];
  /** Untruncated count of cards currently due (not capped by session size). */
  dueCount: number;
  /** Untruncated count of eligible cards with no state yet (not capped by session size). */
  newCount: number;
}
