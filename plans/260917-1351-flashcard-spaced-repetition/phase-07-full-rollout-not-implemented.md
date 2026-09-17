# Phase 07 — Rollout to all 55 modules (DOCUMENTED, NOT IMPLEMENTED)

> Do **not** execute during the pilot. This file records the decided path so the rollout is a 1-line change plus
> known follow-ups, not a redesign.

## Context links
- Plan: [plan.md](plan.md) · assumes Phases 01–06 shipped
- `src/lib/review/flashcard-deck-builder.ts` (`REVIEW_PILOT_MODULE_IDS`)
- `src/content/curriculum-registry.ts:59-115` (55 modules)

## Entry criteria (all must hold before starting)
- Pilot live ≥ 2 weeks with ≥ 1 real learner.
- ≥ 3 review sessions completed by the same learner (proves scheduling actually resurfaces cards).
- No open correctness bug in the scheduler.
- Learner feedback answers: are 4 rating buttons the right granularity? is `MAX_INTERVAL_DAYS = 180` sensible? are
  derived-from-quiz cards useful, or are hand-written cards needed?

## The rollout itself (small)
1. Delete `REVIEW_PILOT_MODULE_IDS`; `buildPilotDeck()` → `buildDeck()` over `getAllModules()`.
   Deck size ≈ **464 cards** (measured: 464 `question:` occurrences across `src/content/modules/*/module-meta.ts`).
2. Re-run the validator over all modules — Phase 01's option-dependent rule already covers all 55, so no new content
   defects should surface. Spot-check ~20 random cards for standalone readability.
3. Add `?course=<slug>` filter to `/review` + per-course due counts in `CourseProgressSection`
   (module → course via `getCourseForModule`, `curriculum-lookup.ts:21-26`). With 3 courses and 464 cards, an
   unfiltered queue mixes DevOps and System Design in one session — the main reason this is deferred, not dropped.
4. Raise `MAX_CARDS_PER_SESSION` / `MAX_NEW_CARDS_PER_SESSION` based on observed pilot session length.

## Known follow-ups that the pilot deliberately deferred
| Item | Why deferred | What it needs |
|---|---|---|
| Review activity in the heatmap | Needs per-event history; `last_reviewed_at` only keeps the latest | New `card_review_log(user_id, card_id, grade, reviewed_at)` table + include in `getActivityDates` (`learning-progress-repository.ts:59-71`) |
| Day-boundary (timezone-aware) due dates | Timestamp arithmetic is simpler and good enough at pilot scale | Swap the `addDays` helper for an `Asia/Ho_Chi_Minh` day-start computation; scheduler formula unchanged |
| Hand-written flashcards (`front`/`back` authored per module) | Derivation from quiz is free; authoring 464 cards is not | New optional `flashcards?: {id, front, back}[]` on `ModuleDefinition` + validator + authoring guide; deck builder concatenates both sources |
| Leech handling (cards failed repeatedly) | Needs pilot data to pick a threshold | `lapses` column already exists — add a threshold + "suspend / send back to the lesson" action |
| Undo last rating | Extra state, unclear demand | Requires the review log table above |

## Data-volume check before rollout
- `card_review_state` rows ≤ 464 per active learner — trivial for Postgres, one indexed query per page load.
- The `/review` RSC payload is capped by `MAX_CARDS_PER_SESSION`, not by deck size — full rollout does not grow it.

## Risk assessment (rollout)
| Risk | L×I | Mitigation |
|---|---|---|
| 464 cards overwhelm the learner; daily due count becomes demoralising | High × Med | Keep session caps; add the per-course filter **in the same change**, not later |
| Some of the 464 cards read poorly standalone | Med × Med | Validator rule from Phase 01 + 20-card spot check; `recallPrompt` is the per-question escape hatch |
| Rollout regresses the pilot cohort's schedules | Low × High | Change is additive (more cards enter the deck); existing rows untouched |

## Rollback
Re-introduce the allowlist constant with the pilot module ids — one commit, no data migration, existing state rows
for non-pilot modules simply stop being surfaced.
