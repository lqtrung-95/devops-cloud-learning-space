"use server";

import { z } from "zod";
import type { ActionResult } from "@/app/actions/learning-progress-actions";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { getCardReviewState, upsertCardReviewState } from "@/lib/review/card-review-repository";
import { getFlashcardById, isKnownFlashcardId } from "@/lib/review/flashcard-deck-builder";
import { INITIAL_SCHEDULING_STATE, scheduleNextReview } from "@/lib/review/spaced-repetition-scheduler";

const gradeSchema = z.union([z.literal(0), z.literal(3), z.literal(4), z.literal(5)]);
const submitSchema = z.object({ cardId: z.string().max(120), grade: gradeSchema });

export interface SubmitCardReviewResult {
  dueAt: string;
}

/**
 * Rates one flashcard and persists the resulting SM-2 state. Deliberately does NOT call
 * `revalidatePath`: a review session fires ~20 times, and revalidating the dashboard layout
 * on every rating would rebuild it repeatedly for nothing. The dashboard is already
 * dynamically rendered (awaits the session per request), so the next navigation there reads
 * fresh data without any revalidation here.
 */
export async function submitCardReviewAction(input: { cardId: string; grade: number }): Promise<ActionResult<SubmitCardReviewResult>> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "Bạn cần đăng nhập để ôn tập." };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success || !isKnownFlashcardId(parsed.data.cardId)) {
    return { ok: false, error: "Thẻ ôn tập không hợp lệ." };
  }

  const card = getFlashcardById(parsed.data.cardId);
  if (!card) return { ok: false, error: "Thẻ ôn tập không hợp lệ." };

  try {
    // `reviewedAt` is generated server-side only — accepting it from the client would let a
    // learner fast-forward or freeze their own schedule.
    const reviewedAt = new Date();
    const currentState = (await getCardReviewState(session.user.id, parsed.data.cardId)) ?? INITIAL_SCHEDULING_STATE;
    const nextState = scheduleNextReview(currentState, parsed.data.grade, reviewedAt);

    await upsertCardReviewState({
      userId: session.user.id,
      cardId: parsed.data.cardId,
      moduleId: card.moduleId,
      state: nextState,
      reviewedAt,
    });

    return { ok: true, data: { dueAt: nextState.dueAt.toISOString() } };
  } catch (error) {
    console.error("submitCardReviewAction failed", error);
    return { ok: false, error: "Không lưu được kết quả ôn tập, thử lại sau." };
  }
}
