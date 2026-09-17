import { describe, expect, it } from "vitest";
import { curriculumModules } from "@/content/curriculum-registry";
import { getModuleById } from "@/content/curriculum-lookup";
import { flashcardId, parseFlashcardId } from "./flashcard-card-keys";
import { buildPilotDeck, isKnownFlashcardId, REVIEW_PILOT_MODULE_IDS } from "./flashcard-deck-builder";

describe("buildPilotDeck", () => {
  it("derives exactly one card per quiz question across the pilot modules (against the registry, never hardcoded)", () => {
    const expectedCount = REVIEW_PILOT_MODULE_IDS.reduce((sum, moduleId) => sum + (getModuleById(moduleId)?.quiz.length ?? 0), 0);
    expect(buildPilotDeck().length).toBe(expectedCount);
  });

  it("produces globally unique card ids", () => {
    const ids = buildPilotDeck().map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses recallPrompt over question when set", () => {
    const m02 = getModuleById("m02")!;
    const question = m02.quiz.find((q) => q.recallPrompt)!;
    const card = buildPilotDeck().find((c) => c.id === flashcardId("m02", question.id))!;
    expect(card.front).toBe(question.recallPrompt);
    expect(card.front).not.toBe(question.question);
  });

  it("falls back to the raw question text when recallPrompt is unset", () => {
    const m01 = getModuleById("m01")!;
    const question = m01.quiz.find((q) => !q.recallPrompt)!;
    const card = buildPilotDeck().find((c) => c.id === flashcardId("m01", question.id))!;
    expect(card.front).toBe(question.question);
  });

  it("back contains the correct option and the explanation", () => {
    const m01 = getModuleById("m01")!;
    const question = m01.quiz[0];
    const card = buildPilotDeck().find((c) => c.id === flashcardId("m01", question.id))!;
    expect(card.back.answer).toBe(question.options[question.answerIndex]);
    expect(card.back.explanation).toBe(question.explanation);
  });

  it("round-trips card ids through flashcardId/parseFlashcardId", () => {
    for (const card of buildPilotDeck()) {
      const parsed = parseFlashcardId(card.id);
      expect(parsed?.moduleId).toBe(card.moduleId);
      expect(flashcardId(parsed!.moduleId, parsed!.questionId)).toBe(card.id);
    }
  });

  it("every pilot module id exists in the curriculum registry", () => {
    for (const moduleId of REVIEW_PILOT_MODULE_IDS) {
      expect(curriculumModules.some((learningModule) => learningModule.id === moduleId)).toBe(true);
    }
  });
});

describe("isKnownFlashcardId", () => {
  it("accepts a real pilot card id", () => {
    const [firstCard] = buildPilotDeck();
    expect(isKnownFlashcardId(firstCard.id)).toBe(true);
  });

  it("rejects a progress-item-shaped key", () => {
    expect(isKnownFlashcardId("m01:lesson:x")).toBe(false);
  });

  it("rejects a card id for a non-pilot module", () => {
    expect(isKnownFlashcardId("m99:card:x")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isKnownFlashcardId("")).toBe(false);
  });

  it("rejects a path-traversal-shaped id", () => {
    expect(isKnownFlashcardId("m01:card:../../etc")).toBe(false);
  });
});
