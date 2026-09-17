# Flashcard spaced-repetition (SM-2) — code review report

Plan: `plans/260917-1351-flashcard-spaced-repetition/plan.md` (phases 01-06). Reviewed against actual uncommitted diff
(`git status`/`git diff`, nothing committed, branch `main`). Prior manual browser QA (orchestrator) + implementer/tester
reports read first; this review independently re-verified the security/correctness claims rather than trusting them.

## Verification run (this session)
- `pnpm typecheck` — green
- `pnpm lint` — green
- `pnpm test` — 146/146 green (9 files)
No fixes were needed — nothing broken found that required a code change.

## Overall assessment
Clean, well-scoped implementation. Matches plan phases 01-06 closely, file ownership boundaries respected, no
overlap/clobbering with the sibling lab-submission-grading feature. SM-2 math is correct. Auth/eligibility/anti-forgery
claims in the implementer and tester reports check out on independent re-read of the source (not just re-running their
tests). One real (but low-severity) design gap found: eligibility is enforced only at queue-build/display time, not at
submission time.

## Critical issues
None.

## High priority
None.

## Medium priority

**1. Eligibility gate not re-checked in `submitCardReviewAction` — self-scoped, no content leak, but breaks the stated invariant.**
`src/app/actions/card-review-actions.ts:29` only calls `isKnownFlashcardId(cardId)`, which is a flat allowlist over
*all* pilot-module cards (`flashcard-deck-builder.ts:51-53`), not filtered by whether the caller has attempted that
module's quiz. `isKnownFlashcardId`/`getFlashcardById` don't take eligibility into account at all — only
`buildReviewQueue` (`review-queue-builder.ts:31`) filters by `eligibleModuleIds`, and that's a *read/display* path
(`/review` page, dashboard banner).

Concretely: an authenticated user who has only attempted m01's quiz can `curl`/devtools-call
`submitCardReviewAction({ cardId: "m02:card:<realQuestionId>", grade: 4 })` for an m02 card without ever taking m02's
quiz, and it succeeds — writes a `card_review_state` row and returns `{ dueAt }`.

Impact is genuinely low: quiz question `id`s are already public (`toPublicQuizQuestions` at
`curriculum-lookup.ts:88-90` returns `{ id, question, options }`, so `id` isn't secret), but the action **never
returns front/back/answer content** — only `dueAt` — so this cannot be used to read quiz answers early. The only
effect is the user polluting their own future review schedule for a card they haven't earned. Self-inflicted, no
cross-user or content-leak vector.

This matches the plan's own architecture diagram in phase-04 exactly (`isKnownFlashcardId` is the only gate listed,
no eligibility re-check) — so it's a **deliberate design choice in the plan**, not an implementation slip. Flagging
because the doc/report narrative ("eligibility gate... protects quiz integrity", tester report §3) reads as if the
gate is enforced everywhere, when it's actually display-only. Recommend either: (a) accept as-is (impact is low, and
"defense in depth" isn't strictly required for a self-scoped write), or (b) add a one-line eligibility check in the
action if this bothers you before rollout to all 55 modules in phase 07 (where the blast radius per module grows).
Not blocking.

## Low priority

**2. Read-then-write race in `submitCardReviewAction` (lost update under rapid double-fire).**
`card-review-actions.ts:40-49` does `getCardReviewState` (SELECT) then `upsertCardReviewState` (UPSERT) as two
separate round-trips, not one transaction — documented as a deliberate tradeoff ("Neon HTTP driver... has no
interactive transactions", same rationale used in the sibling lab-submission feature). Rate buttons are disabled
while `isPending` client-side, so this needs a genuinely concurrent double-fire (e.g. two tabs, or a replayed
request) to matter, and worst case is losing one rating's effect on a user's own schedule — not data corruption or
cross-user impact. Pre-existing architectural pattern in this codebase, not a new bug. No action needed.

**3. Tester report's "pick, not Omit" claim about `PublicQuizQuestion` is imprecise but harmless.**
`content-types.ts:136` defines `PublicQuizQuestion = Omit<QuizQuestion, "answerIndex" | "explanation">` — an `Omit`,
not a `Pick`. The *type* technically still allows an optional `recallPrompt`. But the actual runtime construction in
`toPublicQuizQuestions` (`curriculum-lookup.ts:88-90`) is `learningModule.quiz.map(({ id, question, options }) => ({
id, question, options }))` — an explicit reconstruction that drops `recallPrompt` regardless of what the type
permits. Verified via grep: zero code paths that would leak `recallPrompt`/`explanation`/`answerIndex` into the quiz
page payload. Not a security issue either way — `recallPrompt` is just alternate question phrasing, not an answer —
but the "type is a pick" description in the tester report is inaccurate; only the runtime object-literal is. No code
change needed, just a note for anyone relying on that report's phrasing later.

## Edge cases checked by scout (targeted, not exhaustive re-scout — the two prior reports already did deep scouting)
- Max quiz-question-id length across m01/m02/m03 (19/22/31 chars) — well under the `z.string().max(120)` cardId bound
  in `submitSchema` (`card-review-actions.ts:11`). No truncation risk.
- Keyboard handler in `review-session-runner.tsx:54-70` re-subscribes on `[isRevealed, isPending, currentCard]` — the
  `rate` closure inside is fresh on every effect re-run (dependencies cover every value it reads), so no stale-closure
  bug despite `rate` not being in the dep array (the eslint-disable comment's justification holds up).
- `timestamp()` columns in `spaced-repetition-schema.ts` (`dueAt`, `lastReviewedAt`) omit an explicit `mode`, same as
  existing `progress_item.completedAt` / `quiz_attempt.createdAt` — consistent with codebase convention (default
  drizzle-orm pg timestamp mode is `"date"`, returns `Date`), not a new/introduced inconsistency. Tester's real-Postgres
  round-trip (report §5) already confirms this works.
- `isAutoGradedLabKey` in the sibling `learning-progress-actions.ts` and the flashcard-review action are fully
  independent code paths — no shared mutable state, no import cycle (`card-review-actions.ts` imports only the
  `ActionResult` *type* from `learning-progress-actions.ts`, erased at compile time — confirmed by `pnpm build`
  already green per implementer report, and `pnpm typecheck` green in this session).

## Focus-area verification (independent, not delegated to the two prior reports)

**SM-2 correctness** (`spaced-repetition-scheduler.ts`) — read the full 63-line file line by line:
- EF formula `Math.max(1.3, EF + (0.1 - (5-q)*(0.08+(5-q)*0.02)))` — matches canonical SM-2 exactly for q∈{0,3,4,5}.
- Interval: `current.repetitions === 0 → 1`, `=== 1 → 6`, else `round(prevInterval × EF)`, capped at `MAX_INTERVAL_DAYS
  = 180` via `Math.min`. Matches plan phase-02 spec exactly.
- Again (`grade < 3`) resets `repetitions: 0`, `intervalDays: 1`, `lapses: current.lapses + 1` — correct, and EF still
  updates via the same formula (q=0 → EF - 0.2, floored at 1.3) — correct SM-2 behavior (EF still decays on a lapse).
- `dueAt = addDays(reviewedAt, intervalDays)`, pure timestamp arithmetic, `reviewedAt` never generated internally —
  confirmed no `new Date()` call inside the scheduler module.
- 23 unit tests across the matrix (9 original + 14 added by tester across scheduler/deck/queue) all pass.

**Basis-points ease-factor convention** — grepped every read/write boundary:
- Write: `card-review-repository.ts:64` — `Math.round(input.state.easeFactor * 100)`, only site EF is multiplied.
- Read: `card-review-repository.ts:11` — `row.easeFactorBasisPoints / 100`, only site EF is divided.
- `scheduleNextReview` and everything in `src/lib/review/*` (except the repository) works exclusively in float EF —
  the ×100 conversion is isolated to the DB boundary in exactly one file, no drift risk. Schema default `250` (=2.50)
  matches `INITIAL_EASE_FACTOR = 2.5` in the scheduler.

**`recallPrompt` optionality / other modules unaffected** — spot-checked `m01-linux-shell`, `m04-docker-containers`
(unrelated sibling feature, no `recallPrompt`), and grepped all 8 flagged `module-meta.ts` files: field is additive,
optional (`recallPrompt?: string`), used only via `question.recallPrompt ?? question.question` — every module without
it falls through to `question.question` unchanged. `pnpm test`/`typecheck` green confirms no ripple.

**Card-id forgery / namespace separation** — read `flashcard-card-keys.ts`, `progress-item-keys.ts` was NOT modified
(confirmed by `git diff` scope: `src/lib/progress/progress-item-keys.ts` doesn't appear in the changed-files list at
all). Card pattern `^([a-z0-9]+):card:([a-z0-9-]+)$` vs. progress pattern (lesson|lab) — no overlap possible since
the middle segment differs (`card` vs `lesson`/`lab`). `isKnownFlashcardId` is a `Set.has` exact-match, not a regex
test — confirmed at `flashcard-deck-builder.ts:51-53`.

**Auth gate on `/review` + action** — `page.tsx:10-12` returns early (no `getReviewQueueSnapshot` call, no card data
in the RSC output) when `!session`. Action (`card-review-actions.ts:25-26`) checks session before any zod parse or
card lookup. Neither path can construct/return `back` (answer+explanation) content for an unauthenticated caller —
confirmed the action's success response shape (`SubmitCardReviewResult = { dueAt: string }`) never includes card
content at all, by any caller, authenticated or not.

**Sibling feature (lab-submission-grading) coexistence** — diffed every shared file named in the task:
- `src/content/content-types.ts` — flashcard added `recallPrompt?` on `QuizQuestion`; lab-submission added
  `LabCheckMatcher`/`LabCheck`/`LabSubmissionSpec`/`PublicLabSubmissionSpec`/`LabDefinition.submission`. Disjoint,
  no overlap, no clobber.
- `src/db/schema.ts` — two new export lines (`lab-submission-schema`, `spaced-repetition-schema`), both appended,
  neither removed/reordered the pre-existing exports.
- `src/content/module-definition-validator.ts` — flashcard's `recallPrompt` validation and lab-submission's
  `validateLabSubmission` block sit side by side inside the same `for (const question of quiz)` / `for (const lab of
  labs)` loops without touching each other's logic.
- `docs/content-authoring-guide.md`, `docs/system-architecture.md` — both features' sections inserted independently
  (§3a lab submission, quiz-row + `recallPrompt` note for flashcards); no section overwritten.
- `src/content/curriculum-lookup.ts` — touched only by the lab-submission feature (`toPublicLabSubmissionSpec`); the
  flashcard feature correctly read but never modified this file (per its own file-ownership rule), confirmed by
  the diff containing zero flashcard-related lines here.

## Code quality
- All new files well under the 200-line convention (largest is `review-session-runner.tsx` at 134 lines).
- kebab-case naming consistent throughout `src/lib/review/`, `src/app/review/`.
- No dead code, no scope creep beyond phases 01-06 (phase 07 rollout correctly left undone).
- Comments explain *why* (e.g. `addDays` deviation, no-`revalidatePath` rationale, basis-points rationale) without
  referencing plan/phase numbers — compliant with the "no plan references in code" convention.

## Docs accuracy
`docs/content-authoring-guide.md`, `docs/system-architecture.md`, `README.md` all updated accurately — verified
against actual code (route list, `src/lib`/`src/db` folder comments, data model table, key-flows narrative for
`/review`). No stale or incorrect claims found in the diff.

## Recommended actions
1. Optional, not blocking: add an eligibility check to `submitCardReviewAction` before phase 07 (55-module rollout)
   if you want the "review before quiz = spoiler" invariant enforced at the write path too, not just display.
2. No other changes recommended. Ship as-is from a code-correctness/security standpoint (browser UI already
   confirmed working by orchestrator's manual QA).

## Unresolved questions
- None blocking. The eligibility-gate write-path gap (medium item #1) is a judgment call for the user/lead: accept
  as designed (matches plan) or harden before wider rollout — not something to silently "fix" given it's an
  explicit plan decision, not a bug.

**Status:** DONE
**Summary:** Reviewed flashcard SM-2 feature end-to-end (SM-2 math, basis-points storage, auth/anti-forgery/eligibility gates, sibling-feature coexistence, docs). No critical/high issues; one medium (eligibility not re-checked at submit time — self-scoped, no content leak, matches plan's own design) and two low/informational notes. typecheck/lint/test all green (146/146), no code changes were needed.
**Concerns/Blockers:** None blocking. Recommend the eligibility-gate write-path decision be made explicitly (accept vs. harden) before phase 07 rollout.
