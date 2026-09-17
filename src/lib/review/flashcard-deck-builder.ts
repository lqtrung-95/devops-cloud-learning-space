import { getModuleById } from "@/content/curriculum-lookup";
import { flashcardId } from "./flashcard-card-keys";
import type { FlashCard } from "./review-types";

/**
 * Pilot scope: DevOps Phase 0 (earliest-learned, highest forgetting risk). Emptying this
 * disables the feature; deleting it (and the eligibility gate) ships the full 55-module deck.
 */
export const REVIEW_PILOT_MODULE_IDS = ["m01", "m02", "m03"] as const;

let memoizedDeck: FlashCard[] | undefined;
let memoizedIdSet: ReadonlySet<string> | undefined;

/** Builds the flashcard deck for the pilot modules. Content is compile-time constant, so the result is memoized. */
export function buildPilotDeck(): FlashCard[] {
  if (memoizedDeck) return memoizedDeck;

  const deck: FlashCard[] = [];
  for (const moduleId of REVIEW_PILOT_MODULE_IDS) {
    const learningModule = getModuleById(moduleId);
    if (!learningModule) throw new Error(`Review pilot module id "${moduleId}" is not in the curriculum registry`);

    for (const question of learningModule.quiz) {
      deck.push({
        id: flashcardId(learningModule.id, question.id),
        moduleId: learningModule.id,
        front: question.recallPrompt ?? question.question,
        back: {
          answer: question.options[question.answerIndex],
          explanation: question.explanation,
        },
      });
    }
  }

  memoizedDeck = deck;
  return deck;
}

function getIdSet(): ReadonlySet<string> {
  if (!memoizedIdSet) memoizedIdSet = new Set(buildPilotDeck().map((card) => card.id));
  return memoizedIdSet;
}

/** Looks up one pilot card by id — undefined when the id is unknown or belongs to a non-pilot module. */
export function getFlashcardById(cardId: string): FlashCard | undefined {
  return buildPilotDeck().find((card) => card.id === cardId);
}

/** Anti-forgery allowlist: exact-match over the memoized pilot deck id set. */
export function isKnownFlashcardId(cardId: string): boolean {
  return getIdSet().has(cardId);
}
