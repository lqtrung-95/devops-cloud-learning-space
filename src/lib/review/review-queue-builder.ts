import type { CardSchedulingState, FlashCard, ReviewQueue } from "./review-types";

export const MAX_CARDS_PER_SESSION = 20;
export const MAX_NEW_CARDS_PER_SESSION = 5;

export interface ReviewQueueLimits {
  maxCardsPerSession: number;
  maxNewCardsPerSession: number;
}

const DEFAULT_LIMITS: ReviewQueueLimits = {
  maxCardsPerSession: MAX_CARDS_PER_SESSION,
  maxNewCardsPerSession: MAX_NEW_CARDS_PER_SESSION,
};

/**
 * Builds a bounded review session from the full deck, stored per-card state and module
 * eligibility. A module's cards only enter the deck once its quiz has been attempted
 * (`eligibleModuleIds`) — reviewing a card before the quiz would spoil/preview the quiz.
 *
 * Order: overdue-longest-first, then new cards. `dueCount`/`newCount` report the
 * untruncated totals so the dashboard badge shows the real backlog, not the capped session size.
 */
export function buildReviewQueue(
  deck: readonly FlashCard[],
  statesByCardId: ReadonlyMap<string, CardSchedulingState>,
  eligibleModuleIds: ReadonlySet<string>,
  now: Date,
  limits: ReviewQueueLimits = DEFAULT_LIMITS,
): ReviewQueue {
  const eligibleDeck = deck.filter((card) => eligibleModuleIds.has(card.moduleId));

  const dueCards: FlashCard[] = [];
  const newCards: FlashCard[] = [];

  for (const card of eligibleDeck) {
    const state = statesByCardId.get(card.id);
    if (!state) {
      newCards.push(card);
    } else if (state.dueAt.getTime() <= now.getTime()) {
      dueCards.push(card);
    }
    // else: scheduled for the future — not shown this session, not counted as due/new.
  }

  dueCards.sort((a, b) => statesByCardId.get(a.id)!.dueAt.getTime() - statesByCardId.get(b.id)!.dueAt.getTime());

  const cappedNewCards = newCards.slice(0, limits.maxNewCardsPerSession);
  const cards = [...dueCards, ...cappedNewCards].slice(0, limits.maxCardsPerSession);

  return { cards, dueCount: dueCards.length, newCount: newCards.length };
}
