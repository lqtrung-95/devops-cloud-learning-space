import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/database-client";
import { cardReviewState } from "@/db/spaced-repetition-schema";
import type { CardSchedulingState } from "./review-types";

/** Database access for per-(user, card) SM-2 state. Callers must have already validated `cardId` (`isKnownFlashcardId`). */

function toSchedulingState(row: { easeFactorBasisPoints: number; intervalDays: number; repetitions: number; lapses: number; dueAt: Date }): CardSchedulingState {
  return {
    easeFactor: row.easeFactorBasisPoints / 100,
    intervalDays: row.intervalDays,
    repetitions: row.repetitions,
    lapses: row.lapses,
    dueAt: row.dueAt,
  };
}

/** All of a user's card states in one query, keyed by cardId. */
export async function getCardReviewStates(userId: string): Promise<Map<string, CardSchedulingState>> {
  const rows = await db
    .select({
      cardId: cardReviewState.cardId,
      easeFactorBasisPoints: cardReviewState.easeFactorBasisPoints,
      intervalDays: cardReviewState.intervalDays,
      repetitions: cardReviewState.repetitions,
      lapses: cardReviewState.lapses,
      dueAt: cardReviewState.dueAt,
    })
    .from(cardReviewState)
    .where(eq(cardReviewState.userId, userId));
  return new Map(rows.map((row) => [row.cardId, toSchedulingState(row)]));
}

/** One card's state — cheaper than the bulk loader for a single rating in the server action. */
export async function getCardReviewState(userId: string, cardId: string): Promise<CardSchedulingState | null> {
  const [row] = await db
    .select({
      easeFactorBasisPoints: cardReviewState.easeFactorBasisPoints,
      intervalDays: cardReviewState.intervalDays,
      repetitions: cardReviewState.repetitions,
      lapses: cardReviewState.lapses,
      dueAt: cardReviewState.dueAt,
    })
    .from(cardReviewState)
    .where(and(eq(cardReviewState.userId, userId), eq(cardReviewState.cardId, cardId)))
    .limit(1);
  return row ? toSchedulingState(row) : null;
}

/** Single `insert ... on conflict do update` — the Neon HTTP driver used in prod has no interactive transactions. */
export async function upsertCardReviewState(input: {
  userId: string;
  cardId: string;
  moduleId: string;
  state: CardSchedulingState;
  /** The same timestamp passed to `scheduleNextReview` — stored explicitly (not `defaultNow()`) so it matches exactly. */
  reviewedAt: Date;
}): Promise<void> {
  const values = {
    userId: input.userId,
    cardId: input.cardId,
    moduleId: input.moduleId,
    easeFactorBasisPoints: Math.round(input.state.easeFactor * 100),
    intervalDays: input.state.intervalDays,
    repetitions: input.state.repetitions,
    lapses: input.state.lapses,
    dueAt: input.state.dueAt,
    lastReviewedAt: input.reviewedAt,
  };

  await db
    .insert(cardReviewState)
    .values(values)
    .onConflictDoUpdate({
      target: [cardReviewState.userId, cardReviewState.cardId],
      set: {
        moduleId: values.moduleId,
        easeFactorBasisPoints: values.easeFactorBasisPoints,
        intervalDays: values.intervalDays,
        repetitions: values.repetitions,
        lapses: values.lapses,
        dueAt: values.dueAt,
        lastReviewedAt: values.lastReviewedAt,
      },
    });
}
