// Card ids live in their own namespace (`<moduleId>:card:<questionId>`), separate from
// `progress-item-keys.ts` (`lesson`/`lab`) — this is deliberate: a card id must never be
// accepted by `parseItemKey`/`isKnownProgressItemKey`, or a forged card id could mark a
// lesson/lab complete.

const CARD_KEY_PATTERN = /^([a-z0-9]+):card:([a-z0-9-]+)$/;

export function flashcardId(moduleId: string, questionId: string): string {
  return `${moduleId}:card:${questionId}`;
}

export function parseFlashcardId(cardId: string): { moduleId: string; questionId: string } | null {
  const match = CARD_KEY_PATTERN.exec(cardId);
  if (!match) return null;
  return { moduleId: match[1], questionId: match[2] };
}
