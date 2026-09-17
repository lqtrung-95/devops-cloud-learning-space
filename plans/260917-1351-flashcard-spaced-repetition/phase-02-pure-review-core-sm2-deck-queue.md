# Phase 02 — Pure review core: SM-2 scheduler, deck builder, queue builder

## Context links
- Plan: [plan.md](plan.md) · depends on [phase-01](phase-01-content-foundation-recall-prompt.md)
- Pattern to follow: `src/lib/progress/module-progress-calculator.ts` + `.test.ts` (pure fn + vitest, node env)
- Key format precedent: `src/lib/progress/progress-item-keys.ts:1-17`
- Content access: `src/content/curriculum-lookup.ts:29-45`

## Overview
- **Priority:** P2 · blocks Phases 03–05
- **Status:** pending · **Effort:** 2h
- All scheduling/derivation logic as pure, dependency-free, unit-tested functions. No DB, no React, no `server-only`.

## Key insights
- Repo precedent is explicit: domain logic = pure functions in `src/lib/*`, DB in a `*-repository.ts`, composition in
  a `*-snapshot.ts` (`docs/system-architecture.md` "Layers" table). Mirror it under `src/lib/review/`.
- Card ids must live in a **separate namespace** from progress item keys. `parseItemKey`
  (`progress-item-keys.ts:14`) only accepts `lesson|lab`, and `isKnownProgressItemKey`
  (`curriculum-lookup.ts:83-85`) is the anti-forgery allowlist for the progress action. Widening either would let a
  forged card id mark a lesson complete. → new file, new allowlist, no edits to `progress-item-keys.ts`.
- Vitest only picks up `src/**/*.test.ts` (`vitest.config.mts`), node environment — pure modules are testable, React
  components are not. Everything worth asserting must land in this phase.

## Requirements
**Functional**
- Derive a deck of `{ id, moduleId, front, back }` from pilot modules' quiz questions.
- SM-2: given current state + grade + timestamp → next state (ease factor, interval, repetitions, due date, lapses).
- Build a bounded review queue from deck + stored states + eligibility.
- Recognize/validate a card id (anti-forgery for the server action).

**Non-functional**
- Zero imports of `server-only`, `db`, React.
- Every branch covered by unit tests; deterministic (time passed in, never `new Date()` inside).

## Architecture / data flow
```
curriculum-lookup.getModuleById ──► flashcard-deck-builder ──► FlashCard[]  (id, moduleId, front, back)
                                                │
card_review_state rows (Phase 03) ──────────────┼──► review-queue-builder ──► ReviewQueue { cards[], dueCount, newCount }
                                                │
grade + current state + now ─────────────────────► spaced-repetition-scheduler ──► next CardSchedulingState
```

### Card id
`<moduleId>:card:<quizQuestionId>` — e.g. `m01:card:chmod-750`. Parser regex
`/^([a-z0-9]+):card:([a-z0-9-]+)$/`. Quiz ids are kebab-case and "never rename after publishing"
(`docs/content-authoring-guide.md:37`) → stable primary key material.

### SM-2 (canonical, with two documented deviations)
State: `{ easeFactor: number (2.5 default, floor 1.3), intervalDays: number, repetitions: number, lapses: number, dueAt: Date }`.
Grade buttons → q: **Again = 0, Hard = 3, Good = 4, Easy = 5**.
- `q < 3` → `repetitions = 0`, `intervalDays = 1`, `lapses += 1`
- `q >= 3` → `repetitions 0 → intervalDays 1`; `repetitions 1 → 6`; else `round(prev.intervalDays * EF)`; `repetitions += 1`
- `EF' = max(1.3, EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))`
- **Deviation 1 — interval cap `MAX_INTERVAL_DAYS = 180`**: courses are 24–28 weeks; an uncapped interval can push a
  card past course end, defeating the whole point.
- **Deviation 2 — `dueAt = reviewedAt + intervalDays × 24h`** (timestamp arithmetic, not Anki's day boundaries).
  Avoids all timezone code. Consequence: a card rated at 23:00 is due at 23:00 the next day. Accepted for the pilot;
  day-boundary scheduling is a documented follow-up. The policy lives in one helper (`addDays`) so it is swappable.

### Queue policy (constants in the queue builder)
- `MAX_CARDS_PER_SESSION = 20`, `MAX_NEW_CARDS_PER_SESSION = 5`.
- Order: overdue-longest-first, then new cards.
- **Eligibility gate:** a module's cards only enter the deck once the learner has **attempted that module's quiz**
  (module id present in `getBestQuizPercentByModule` result — `learning-progress-repository.ts:26-36`). Rationale:
  the card *is* a quiz question; reviewing it before the quiz would spoil the quiz and test unseen material.

## Related code files
**Create**
- `src/lib/review/review-types.ts` — `FlashCard`, `CardSchedulingState`, `ReviewGrade`, `ReviewQueue`.
- `src/lib/review/flashcard-card-keys.ts` — `flashcardId(moduleId, questionId)`, `parseFlashcardId(id)`.
- `src/lib/review/flashcard-deck-builder.ts` — `REVIEW_PILOT_MODULE_IDS`, `buildPilotDeck()`, `getFlashcardById()`,
  `isKnownFlashcardId()` (memoized `Set`, same shape as `getAllProgressItemKeys()` at `curriculum-lookup.ts:69-81`).
- `src/lib/review/spaced-repetition-scheduler.ts` — `INITIAL_SCHEDULING_STATE`, `scheduleNextReview()`, grade mapping.
- `src/lib/review/review-queue-builder.ts` — `buildReviewQueue(deck, statesByCardId, eligibleModuleIds, now, limits)`.
- Tests: `spaced-repetition-scheduler.test.ts`, `flashcard-deck-builder.test.ts`, `review-queue-builder.test.ts`
  (card-key round-trip asserted inside the deck-builder test, mirroring
  `module-progress-calculator.test.ts:70-81`).

**Modify / delete:** none. **File ownership:** `src/lib/review/**` only.

## Implementation steps
1. `review-types.ts`: `ReviewGrade = 0 | 3 | 4 | 5`; `CardSchedulingState = { easeFactor, intervalDays, repetitions, lapses, dueAt }`.
2. `flashcard-card-keys.ts`: format + parse, no content imports.
3. `flashcard-deck-builder.ts`:
   - `export const REVIEW_PILOT_MODULE_IDS = ["m01", "m02", "m03"] as const;`
   - `buildPilotDeck()` maps each pilot module's `quiz` → `{ id: flashcardId(mod.id, q.id), moduleId: mod.id,
     front: q.recallPrompt ?? q.question, back: { answer: q.options[q.answerIndex], explanation: q.explanation } }`.
   - Memoize deck + id `Set` at module scope (content is compile-time constant — safe, matches existing precedent).
   - Throw at build time if a pilot module id is not in the registry (fail loudly, not silently empty).
4. `spaced-repetition-scheduler.ts`: implement the formula above; clamp EF ≥ 1.3, interval ≤ 180, repetitions ≥ 0;
   reject unknown grades with a thrown error (server action validates first, so this is defence in depth).
5. `review-queue-builder.ts`: filter deck by eligible modules → split into due (`state.dueAt <= now`) and new
   (no state) → sort due by `dueAt` asc → take new up to `MAX_NEW_CARDS_PER_SESSION` → concat → cap at
   `MAX_CARDS_PER_SESSION` → return `{ cards, dueCount, newCount }` where the counts are the **untruncated** totals
   (the dashboard badge must show the real backlog, not the capped session size).
6. Write tests (matrix below).

## Test matrix
| Unit | Cases |
|---|---|
| `scheduleNextReview` | first Good → 1d · second Good → 6d · third Good → `round(6 × EF)` · Again resets reps to 0, interval 1, `lapses+1` · repeated Again floors EF at 1.3 · Easy raises EF · interval never exceeds 180 · `dueAt` = `reviewedAt + interval` · unknown grade throws |
| `buildPilotDeck` | one card per quiz question of m01/m02/m03 · ids globally unique · `recallPrompt` wins over `question` · back contains correct option + explanation · unknown pilot module id throws |
| `isKnownFlashcardId` | accepts a real id · rejects `m01:lesson:x`, `m99:card:x`, `""`, `m01:card:../../etc` |
| `buildReviewQueue` | empty deck → empty · due-before-new ordering · overdue-longest-first · new capped at 5 · session capped at 20 · counts report untruncated totals · ineligible module excluded · card due exactly at `now` counts as due |

## Todo list
- [ ] `review-types.ts`, `flashcard-card-keys.ts` created
- [ ] `flashcard-deck-builder.ts` with pilot allowlist + memoized id set
- [ ] `spaced-repetition-scheduler.ts` with cap + EF floor
- [ ] `review-queue-builder.ts` with eligibility gate + caps
- [ ] 3 test files, full matrix above, `pnpm test` green
- [ ] `pnpm typecheck` + `pnpm lint` green

## Success criteria
- `pnpm test` green; every row of the test matrix has a named `it(...)`.
- `grep -r "server-only\|@/db" src/lib/review` returns nothing.
- `buildPilotDeck().length` = 32 today (m01 10 + m02 11 + m03 11) — asserted in the test **against the registry**
  (`sum of pilot modules' quiz.length`), never hardcoded, so adding a quiz question cannot break the suite.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| SM-2 implemented subtly wrong (off-by-one on repetitions) | Med × High | Test matrix pins the canonical 1/6/`6×EF` sequence explicitly |
| Float drift in EF across many reviews | Low × Low | Phase 03 stores EF as integer ×100; round-trip asserted there |
| Timestamp-based due dates annoy learners (late-evening reviews) | Med × Low | Single `addDays` helper; follow-up phase can swap to day boundaries without touching the formula |
| Pilot allowlist drifts from registry after a module rename | Low × Med | `buildPilotDeck` throws on unknown module id — build/test fails loudly |

## Security considerations
- `isKnownFlashcardId` is the anti-forgery allowlist for Phase 04's server action — must be exact-match over the
  memoized `Set`, never a regex-only check.
- Card **backs contain quiz answers.** They may only be sent to the browser for cards the learner is entitled to
  (eligibility gate + auth check in Phase 04). Never render a deck on a public/unauthenticated page.

## Rollback
Delete `src/lib/review/`. Nothing else imports it yet.

## Next steps
Phase 03 persists `CardSchedulingState`.
