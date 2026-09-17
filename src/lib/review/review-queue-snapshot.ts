import "server-only";
import { getBestQuizPercentByModule } from "@/lib/progress/learning-progress-repository";
import { getCardReviewStates } from "./card-review-repository";
import { buildPilotDeck } from "./flashcard-deck-builder";
import { buildReviewQueue } from "./review-queue-builder";
import type { ReviewQueue } from "./review-types";

/**
 * Composes deck + stored states + eligibility into one `ReviewQueue`, used by both `/review`
 * and the dashboard. `eligibleModuleIds` can be supplied by the caller (dashboard already has
 * it from `getUserProgressSnapshot`) to avoid a duplicate `getBestQuizPercentByModule` query;
 * defaults to loading it itself so `/review` can call this with one argument.
 */
export async function getReviewQueueSnapshot(userId: string | null, options?: { eligibleModuleIds?: ReadonlySet<string> }): Promise<ReviewQueue> {
  if (!userId) return { cards: [], dueCount: 0, newCount: 0 };

  const [states, eligibleModuleIds] = await Promise.all([
    getCardReviewStates(userId),
    options?.eligibleModuleIds ? Promise.resolve(options.eligibleModuleIds) : getBestQuizPercentByModule(userId).then((byModule) => new Set(byModule.keys())),
  ]);

  return buildReviewQueue(buildPilotDeck(), states, eligibleModuleIds, new Date());
}
