import { describe, expect, it } from "vitest";
import { buildReviewQueue } from "./review-queue-builder";
import type { CardSchedulingState, FlashCard } from "./review-types";

const NOW = new Date("2026-01-15T00:00:00.000Z");

function card(id: string, moduleId = "m01"): FlashCard {
  return { id, moduleId, front: `front ${id}`, back: { answer: "a", explanation: "e" } };
}

function stateDueAt(daysBeforeNow: number): CardSchedulingState {
  return { easeFactor: 2.5, intervalDays: 1, repetitions: 1, lapses: 0, dueAt: new Date(NOW.getTime() - daysBeforeNow * 24 * 60 * 60 * 1000) };
}

const ELIGIBLE = new Set(["m01"]);

describe("buildReviewQueue", () => {
  it("returns an empty queue for an empty deck", () => {
    const queue = buildReviewQueue([], new Map(), ELIGIBLE, NOW);
    expect(queue).toEqual({ cards: [], dueCount: 0, newCount: 0 });
  });

  it("orders due cards before new cards", () => {
    const deck = [card("new-1"), card("due-1")];
    const states = new Map([["due-1", stateDueAt(1)]]);
    const queue = buildReviewQueue(deck, states, ELIGIBLE, NOW);
    expect(queue.cards.map((c) => c.id)).toEqual(["due-1", "new-1"]);
  });

  it("sorts due cards overdue-longest-first", () => {
    const deck = [card("due-recent"), card("due-old")];
    const states = new Map([
      ["due-recent", stateDueAt(1)],
      ["due-old", stateDueAt(10)],
    ]);
    const queue = buildReviewQueue(deck, states, ELIGIBLE, NOW);
    expect(queue.cards.map((c) => c.id)).toEqual(["due-old", "due-recent"]);
  });

  it("caps new cards at maxNewCardsPerSession", () => {
    const deck = Array.from({ length: 8 }, (_, i) => card(`new-${i}`));
    const queue = buildReviewQueue(deck, new Map(), ELIGIBLE, NOW, { maxCardsPerSession: 20, maxNewCardsPerSession: 5 });
    expect(queue.cards).toHaveLength(5);
    expect(queue.newCount).toBe(8);
  });

  it("caps total session size at maxCardsPerSession", () => {
    const deck = Array.from({ length: 30 }, (_, i) => card(`due-${i}`));
    const states = new Map(deck.map((c) => [c.id, stateDueAt(1)]));
    const queue = buildReviewQueue(deck, states, ELIGIBLE, NOW, { maxCardsPerSession: 20, maxNewCardsPerSession: 5 });
    expect(queue.cards).toHaveLength(20);
    expect(queue.dueCount).toBe(30);
  });

  it("reports untruncated dueCount/newCount even when the session is capped", () => {
    const dueDeck = Array.from({ length: 25 }, (_, i) => card(`due-${i}`));
    const newDeck = Array.from({ length: 10 }, (_, i) => card(`new-${i}`));
    const states = new Map(dueDeck.map((c) => [c.id, stateDueAt(1)]));
    const queue = buildReviewQueue([...dueDeck, ...newDeck], states, ELIGIBLE, NOW);
    expect(queue.dueCount).toBe(25);
    expect(queue.newCount).toBe(10);
    expect(queue.cards).toHaveLength(20);
  });

  it("excludes cards from a module the learner is not eligible for", () => {
    const deck = [card("m01-card", "m01"), card("m02-card", "m02")];
    const queue = buildReviewQueue(deck, new Map(), ELIGIBLE, NOW);
    expect(queue.cards.map((c) => c.id)).toEqual(["m01-card"]);
    expect(queue.newCount).toBe(1);
  });

  it("counts a card due exactly at now as due", () => {
    const deck = [card("exactly-now")];
    const states = new Map([["exactly-now", { easeFactor: 2.5, intervalDays: 1, repetitions: 1, lapses: 0, dueAt: NOW }]]);
    const queue = buildReviewQueue(deck, states, ELIGIBLE, NOW);
    expect(queue.dueCount).toBe(1);
    expect(queue.cards.map((c) => c.id)).toEqual(["exactly-now"]);
  });

  it("excludes a card scheduled in the future from both due and new counts", () => {
    const deck = [card("future")];
    const states = new Map([["future", stateDueAt(-1)]]);
    const queue = buildReviewQueue(deck, states, ELIGIBLE, NOW);
    expect(queue.cards).toEqual([]);
    expect(queue.dueCount).toBe(0);
    expect(queue.newCount).toBe(0);
  });
});
