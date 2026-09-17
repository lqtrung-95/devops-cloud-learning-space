# Phase 06 — Verification, manual QA, docs

## Context links
- Plan: [plan.md](plan.md) · depends on Phases 01–05
- `docs/system-architecture.md` (Layers / Data model / Key flows sections)
- `docs/content-authoring-guide.md` (updated in Phase 01)
- `README.md:55-73` (structure), `:45-53` (scripts)

## Overview
- **Priority:** P2
- **Status:** pending · **Effort:** 1h
- Gate before shipping the pilot. Automated suite + the manual checks that cannot be automated in this repo.

## Key insights
- The repo has **no DB or browser test harness** — `vitest.config.mts` runs `environment: "node"` over
  `src/**/*.test.ts`, and every existing test is a pure-function test. Claiming "integration tested" would be false.
  Anything touching Postgres, server actions or React is verified **manually** here, with the checklist below as the
  record.
- `docs/system-architecture.md` has three sections that go stale with this feature: **Layers** table, **Data model**
  bullets, **Key flows**. All three must be updated or the doc actively misleads.

## Requirements
- `pnpm lint`, `pnpm typecheck`, `pnpm test` all green.
- Manual QA checklist fully executed against local Postgres.
- Docs reflect the new table, layer and flow.

## Automated checks
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm validate:module m01-linux-shell && pnpm validate:module m02-networking && pnpm validate:module m03-devops-mindset-git
pnpm build      # catches RSC/client-boundary mistakes that typecheck misses
```

## Manual QA checklist (local, `pnpm services:up` + `pnpm dev`)
**Scheduling correctness**
- [ ] Rate a fresh card **Good** → `interval_days = 1`, `repetitions = 1`, `due_at ≈ now + 1d` (Drizzle Studio)
- [ ] Manually set `due_at` to the past, rate **Good** again → `interval_days = 6`, `repetitions = 2`
- [ ] Third **Good** → `interval_days = round(6 × ease)`; `ease_factor_basis_points` rose above 250
- [ ] Rate **Again** → `repetitions = 0`, `interval_days = 1`, `lapses` incremented, ease dropped
- [ ] Repeated **Again** never drops `ease_factor_basis_points` below 130
- [ ] EF round-trip: value in Studio equals `round(ease × 100)` after 3 ratings (no float drift)

**Queue + eligibility**
- [ ] Brand-new account → `/review` empty state, dashboard shows 0 due, no CTA bar
- [ ] Complete m01 quiz → m01 cards appear as "new"; m02/m03 cards do **not** (quiz not attempted)
- [ ] New cards per session capped at 5; total session capped at 20
- [ ] Dashboard `dueCount` equals the number of cards `/review` serves (when under the cap)

**Security**
- [ ] Signed-out `/review` → login prompt; `view-source` contains no explanation/answer text
- [ ] Forged `cardId` (`m99:card:x`, `m01:lesson:linux-filesystem`) via dev-console action call → error, no DB row
- [ ] Grade `2` or `"5"` → rejected by zod
- [ ] A second account never sees the first account's review state

**Regression**
- [ ] `/modules/m01-linux-shell/quiz` behaves exactly as before; no `recallPrompt` in the payload
- [ ] Lesson/lab checkboxes still persist
- [ ] Dashboard heatmap, quiz history, continue banner unchanged
- [ ] Mid-session offline → inline error, same card retriable, no duplicate row

## Docs to update
- `docs/system-architecture.md`
  - Layers table: add `Review domain | src/lib/review | pure scheduler/deck/queue + card-review-repository.ts + review-queue-snapshot.ts`
  - Data model: `card_review_state (user_id, card_id, module_id, ease_factor_basis_points, interval_days, repetitions, lapses, due_at, last_reviewed_at)` — PK `(user_id, card_id)`; ease stored ×100; cards derived from quiz questions, id `<moduleId>:card:<questionId>`
  - Key flows: **Spaced-repetition review** — eligibility (quiz attempted) → queue → reveal → rate → SM-2 → single upsert; note the deliberate absence of `revalidatePath` and the pilot allowlist
- `docs/content-authoring-guide.md` — confirm the Phase 01 `recallPrompt` edit is present and mentions that quiz
  explanations double as flashcard backs (so authors keep writing them standalone-readable)
- `README.md` — add `/review` to the routes line in the structure block; one bullet in the feature list
  ("🔁 Ôn tập giãn cách (SM-2)")

## Todo list
- [ ] All automated checks green (including `pnpm build`)
- [ ] Manual QA checklist executed, failures fixed and re-run
- [ ] `docs/system-architecture.md` — 3 sections updated
- [ ] `docs/content-authoring-guide.md` verified
- [ ] `README.md` updated
- [ ] `code-reviewer` agent run over the diff
- [ ] Conventional commit(s), no plan/phase references in code comments or commit messages

## Success criteria
- Green lint/typecheck/test/build.
- Every manual checkbox ticked.
- A reader of `docs/system-architecture.md` alone can describe the review data model and flow correctly.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| Manual checklist skipped under time pressure | Med × High | Checklist is the phase deliverable; phase is not "done" with unticked boxes |
| Docs drift immediately after the rollout phase | Med × Low | Phase 07 lists its own doc updates |
| `pnpm build` surfaces a client/server boundary error late | Med × Med | `build` is in the automated list, not optional |

## Security considerations
- The security block of the checklist is mandatory: answer leakage and cardId forgery are the two failure modes that
  matter; both are explicitly exercised.

## Next steps
Pilot runs; collect feedback for ≥ 2 weeks before executing [phase-07](phase-07-full-rollout-not-implemented.md).
