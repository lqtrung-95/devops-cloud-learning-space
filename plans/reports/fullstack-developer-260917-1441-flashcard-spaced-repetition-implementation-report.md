# Flashcard spaced-repetition (SM-2) — implementation report

Plan: `plans/260917-1351-flashcard-spaced-repetition/plan.md`, phases 01-06 implemented. Phase 07 (full rollout) intentionally not implemented per plan.

## Files created

**Phase 01 (content)**
- `src/content/content-types.ts` — `QuizQuestion.recallPrompt?: string` added
- `src/content/module-definition-validator.ts` — `OPTION_DEPENDENT_PATTERN` + validator rule + blank-string guard
- 8 module-meta.ts files given `recallPrompt` on the flagged question (see deviation below):
  `b07-testing-backend`, `b13-grpc-internal-services`, `b16-observability-for-backend`,
  `b17-containerization-cicd-backend`, `m02-networking`, `m16-sre-practices`,
  `sd10-consensus-coordination`, `sd19-mock-interview-capstone`
- `docs/content-authoring-guide.md` — quiz row + checklist updated

**Phase 02 (pure core)** — `src/lib/review/`:
- `review-types.ts`, `flashcard-card-keys.ts`, `flashcard-deck-builder.ts`, `spaced-repetition-scheduler.ts`, `review-queue-builder.ts`
- `spaced-repetition-scheduler.test.ts` (9 tests), `flashcard-deck-builder.test.ts` (11 tests), `review-queue-builder.test.ts` (9 tests)

**Phase 03 (persistence)**
- `src/db/spaced-repetition-schema.ts` — `card_review_state` table
- `src/db/schema.ts` — added `export * from "./spaced-repetition-schema"` (appended after existing `lab-submission-schema` export, did not reorder/remove it)
- `src/lib/review/card-review-repository.ts` — `getCardReviewStates`, `getCardReviewState`, `upsertCardReviewState`
- `src/lib/review/review-queue-snapshot.ts` — `getReviewQueueSnapshot(userId, options?)`

**Phase 04 (action + route)**
- `src/app/actions/card-review-actions.ts` — `submitCardReviewAction`
- `src/app/review/page.tsx`, `src/app/review/loading.tsx`, `src/app/review/review-session-runner.tsx`
- `src/components/layout/site-header.tsx` — added "Ôn tập" nav link inside existing `{session && ...}` block

**Phase 05 (dashboard)**
- `src/components/progress/review-due-banner.tsx`
- `src/app/dashboard/page.tsx` — 5th stat card, `lg:grid-cols-5`, conditional CTA banner, eligibility derived from already-loaded snapshot (no duplicate query)

**Phase 06 (docs)**
- `docs/system-architecture.md` — Layers table, Data model, Key flows sections updated
- `README.md` — feature bullet, `/review` route, `src/lib`/`src/db` folder comments

## Deviations from plan

1. **8 `recallPrompt` hits, not 7.** Plan's verified list of option-dependent questions (grounding notes) missed `sd19-mock-interview-capstone:jump-to-boxes` — its question text contains the substring "câu nào" (from "chưa hỏi câu nào" = "hadn't asked a single question") which the plan's own `OPTION_DEPENDENT_PATTERN` regex matches as a false positive (question is actually standalone-answerable). Per the plan's own risk mitigation ("adding a `recallPrompt` is always a valid fix, never a blocker"), added a `recallPrompt` there too rather than special-casing the regex. `pnpm test` green with 8 hits.
2. **`upsertCardReviewState` signature** takes an explicit `reviewedAt: Date` param (plan said "not `defaultNow()`, so the value matches the `reviewedAt` the scheduler used" but didn't spell out how the repo receives it) — cleaner than trying to derive it from `state.dueAt`.
3. **`pnpm build` env workaround (not persisted):** local `pnpm build` runs with `NODE_ENV=production`, and `src/lib/env.ts` (pre-existing, unrelated file) requires a non-localhost `BETTER_AUTH_URL` in production. Ran `BETTER_AUTH_URL=https://learning-space.example.com pnpm build` as a one-off shell env override for verification only — `.env` untouched, nothing committed. This is a pre-existing repo constraint, not caused by this feature.

## Manual QA (phase 06 checklist) — what was actually exercised

No browser/computer-use tool was available in this session, so browser-driven UI checks (flip/reveal/keyboard shortcuts, live session flow) were **not** executed and are flagged below as unverified. Everything reachable via `curl`/direct Postgres was exercised against the real local Postgres (`pnpm services:up`) with a throwaway user (`qa-review-pilot-user`, deleted after, zero residual rows):

- **Scheduling correctness** — verified via 9 unit tests (Phase 02 matrix: 1d → 6d → round(6×EF), Again resets reps/interval/lapses+1, EF floor 1.3 after 50 repeated Agains, Easy raises EF, cap at 180d, dueAt=reviewedAt+interval, unknown grade throws) AND by running the actual pure `scheduleNextReview` sequence (Good→Good→Good→Again) and persisting each resulting state via the exact SQL shape `upsertCardReviewState` uses (`insert ... on conflict do update`), then reading it back — matched exactly (interval 1→6→15, EF 2.5→1.70 after lapse, EF basis points integer round-trip exact).
- **Queue + eligibility** — `getReviewQueueSnapshot` with a real `quiz_attempt` row for `m01` only returned m01 cards as new, excluded m02/m03 (not attempted) — verified with the actual pure query/filter logic against `buildPilotDeck()`.
- **dueCount accuracy** — hand-written SQL `count(*) where due_at <= now()` matched `dueCount` (1 due row → 1).
- **FK cascade** — deleting the QA user cascaded `card_review_state` and `quiz_attempt` to 0 rows.
- **Security: forged cardId** — `isKnownFlashcardId`/`getFlashcardById` (the exact functions the action calls) tested directly against `m99:card:x`, `m01:lesson:linux-filesystem`, `""`, `m01:card:../../etc` — all rejected/undefined.
- **Security: no answer leakage** — dev server (`pnpm dev`) hit via `curl` at `http://127.0.0.1:3000/review` signed-out: login prompt present, zero occurrences of `explanation`/`recallPrompt`/card front-back JSON in the HTML.
- **Regression: quiz payload** — `curl http://127.0.0.1:3000/modules/m02-networking/quiz`: zero occurrences of `recallPrompt`/`answerIndex`/`"explanation"` (server-only `PublicQuizQuestion` whitelist confirmed still a pick, not `Omit`, in `curriculum-lookup.ts`).
- **Routes load** — `/`, `/dashboard` (signed-out → 200, renders login-redirect path), `/review`, `/modules/m01-linux-shell` all 200 via curl.
- **`pnpm build`** — clean, `/review` listed as dynamic (ƒ), no RSC/client-boundary errors.

**Not verified (no browser tool available this session) — recommend a manual pass before shipping:**
- Full flip → reveal → rate → advance UI flow, end-of-session summary screen
- Keyboard shortcuts (Space/Enter reveal, 1-4 rate)
- Dashboard visual check (5-up grid on tablet, banner placement, light/dark)
- Mid-session offline retry behavior
- Two-account isolation (code-reviewed: every query is `userId`-scoped from session, never client input — same pattern as existing `learning-progress-repository.ts`)

## Automated checks (final run)
- `pnpm typecheck` — green
- `pnpm lint` — green
- `pnpm test` — 139/139 passed (9 files; 29 new tests for `src/lib/review`)
- `pnpm validate:module m01-linux-shell / m02-networking / m03-devops-mindset-git` — all green (10/11/11 quiz questions = 32-card pilot deck, matches plan)
- `pnpm build` — green (env override for local verification only, see deviation #3)
- `pnpm db:push` — applied cleanly; `card_review_state` verified in Studio-equivalent (`psql \d`): composite PK `(user_id, card_id)`, index `card_review_state_user_due_idx`, FK cascade on `user.id`. No `drizzle/` migration dir existed (confirmed before push, per plan's cross-plan note), so `push` (not `generate`+`migrate`) was correct.

## File ownership / cross-plan boundary check
- `src/content/curriculum-lookup.ts` — read, not modified (already changed by the sibling lab-submission feature; `isKnownProgressItemKey`/`parseItemKey` untouched, card ids live in a separate `src/lib/review/flashcard-card-keys.ts` allowlist as required).
- `src/db/schema.ts` — appended one export line after the existing `lab_submission` export, did not reorder or remove it.
- `src/content/content-types.ts` — added `recallPrompt?` only; did not touch the sibling's `LabDefinition.submission` field.
- `src/content/module-definition-validator.ts` — added the recallPrompt rule alongside the existing (sibling-added) lab-submission validation; did not revert it.
- `docs/content-authoring-guide.md`, `docs/system-architecture.md` — edits inserted alongside existing lab-submission sections, nothing clobbered.

## Unresolved questions
- None blocking. Browser-driven UI/keyboard QA (listed above) should be done by the user or a follow-up session with browser tooling before this ships.

**Status:** DONE
**Summary:** Phases 01-06 implemented per plan; 139/139 unit tests pass, typecheck/lint/build green, DB schema pushed and verified, security/eligibility/scheduling logic verified against real Postgres and via curl; UI-only checks (flip/keyboard/visual) not verified — no browser tool available this session.
