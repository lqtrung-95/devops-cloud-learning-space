---
title: "Flashcard spaced-repetition review (SM-2)"
description: "Anki-style SM-2 review loop over flashcards derived from existing quiz questions, piloted on DevOps Phase 0 (m01–m03)."
status: pending
priority: P2
effort: 8.5h
branch: main
tags: [learning, spaced-repetition, drizzle, server-actions, sm2]
created: 2026-09-17
---

# Flashcard spaced-repetition review

Courses run 24–28 weeks; content learned in week 2 is never revisited. Add a real SM-2 review loop:
per-(user, card) ease factor / interval / repetitions / due date, a `/review` page with flip-and-rate, and a
"đến hạn ôn" CTA on the dashboard.

## User decisions (confirmed — do not re-litigate)
- **Real spaced repetition** (SM-2), not a static "review these" banner.
- **Pilot first**, then a documented (not-implemented) rollout phase for all 55 modules.

## Planner decisions (rationale in phase files)
- **Pilot scope = DevOps Phase 0: `m01`, `m02`, `m03`** (10+11+11 = **32 cards**, counted from the module metas) — earliest-learned, highest forgetting risk. Gated by one constant `REVIEW_PILOT_MODULE_IDS`; emptying it disables the feature, deleting it ships everything.
- **Cards are derived from existing `QuizQuestion`s** (front = question, back = correct option + `explanation`). Zero new content authoring for the pilot. One additive optional field `recallPrompt?: string` covers the 7 questions whose wording depends on the option list.
- **New table `card_review_state`** (PK `user_id, card_id`), ease factor stored as integer ×100 (driver-safe, no float/`numeric`-as-string surprises).
- **Route `/review`** (global queue), `?course=` filter deferred to rollout phase.
- **SM-2 = small pure module + unit tests**, no external library (matches `src/lib/progress/*` precedent).

## Phases
| # | Phase | Effort | Status |
|---|---|---|---|
| 01 | [Content foundation: `recallPrompt` + validator](phase-01-content-foundation-recall-prompt.md) | 1h | pending |
| 02 | [Pure review core: SM-2, deck, queue](phase-02-pure-review-core-sm2-deck-queue.md) | 2h | pending |
| 03 | [Persistence: `card_review_state` + repository](phase-03-persistence-card-review-state.md) | 1h | pending |
| 04 | [Server action + `/review` UI](phase-04-review-route-and-server-action.md) | 2.5h | pending |
| 05 | [Dashboard + nav integration](phase-05-dashboard-and-nav-integration.md) | 1h | pending |
| 06 | [Verification + docs](phase-06-verification-and-docs.md) | 1h | pending |
| 07 | [Rollout to all 55 modules (documented, NOT implemented)](phase-07-full-rollout-not-implemented.md) | — | deferred |

## Dependency graph
```
01 (content field) ──► 02 (pure core) ──► 03 (db+repo) ──► 04 (action+UI) ──► 05 (dashboard) ──► 06 (verify+docs)
                                    └────► 03 and 04 both consume types from 02
```
No phase may start before its predecessor lands. 01 is the only phase touching `src/content/**`; 03 is the only
phase touching `src/db/**` — no two phases edit the same file (see per-phase **File ownership**).

## Cross-plan note (migration conflict)
A parallel plan adds lab-submission tables (`plans/260917-1351-lab-submission-grading/`). Table name here is
`card_review_state` — no plausible collision. The repo syncs schema with `pnpm db:push` (`drizzle.config.ts:5-7`;
`./drizzle` migration dir does **not** exist yet). **Before running `db:push` for Phase 03**: `git pull` and check
whether the lab plan introduced a committed `drizzle/` migration folder — if so, switch to `db:generate` +
`db:migrate` for both features instead of `push`, and generate after rebasing onto their migration.

## Out of scope (pilot)
Review event log / review activity in the heatmap, per-course review filter, hand-authored flashcards,
day-boundary (timezone-aware) due dates, leech handling, undo of a rating, mobile swipe gestures.
