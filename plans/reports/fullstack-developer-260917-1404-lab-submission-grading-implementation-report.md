# Lab submission & auto-grading — implementation report (phases 01-04)

Plan: `plans/260917-1351-lab-submission-grading/plan.md`. Implemented phases 01-04 in full. Phase 05 (rollout to remaining labs) explicitly NOT touched, per instructions.

## Files created

- `src/lib/progress/lab-submission-grader.ts` — pure grader, 4 matchers (contains/regex/numberInRange/jsonHasKeys), total function (never throws), 10k-char truncation.
- `src/lib/progress/lab-submission-grader.test.ts` — full test matrix from phase 01 (12 tests).
- `src/db/lab-submission-schema.ts` — `lab_submission` table (serial PK, userId FK cascade, moduleId/labId text, content, passed, checkResults jsonb, createdAt, composite index).
- `src/components/progress/lab-submission-panel.tsx` — client form + result banner + history `<details>`, ~155 lines.

## Files modified

- `src/content/content-types.ts` — added `LabCheckMatcher`, `LabCheck`, `LabSubmissionSpec`, `PublicLabSubmissionSpec`, `PublicLabDefinition`; `LabDefinition.submission?` optional.
- `src/content/curriculum-lookup.ts` — added `toPublicLabSubmissionSpec`.
- `src/content/module-definition-validator.ts` — conditional `validateLabSubmission` + `validateRegexMatcher` helpers, wired into the lab loop.
- `src/db/schema.ts` — `export * from "./lab-submission-schema"` (1 line, shared barrel — no flashcard-plan sibling file existed yet, so no conflict to resolve).
- `src/lib/progress/learning-progress-repository.ts` — `insertLabSubmission`, `getLabSubmissions`, `getLatestLabSubmissionsForModule`.
- `src/app/actions/learning-progress-actions.ts` — `submitLabAction`; hardened `toggleProgressItemAction` via new `isAutoGradedLabKey` helper (rejects `completed:true` on graded labs, allows `completed:false`).
- `src/components/progress/lab-checklist-card.tsx` — takes `PublicLabDefinition`; branches status-dot vs `ProgressItemCheckbox`; renders `LabSubmissionPanel` when `lab.submission` present.
- `src/app/modules/[moduleSlug]/page.tsx` — projects labs via `toPublicLabSubmissionSpec`, loads per-lab `getLabSubmissions(…, 3)` for labs with a spec, passes `moduleSlug`/`recentSubmissions` down.
- `src/content/modules/m04-docker-containers/module-meta.ts` — `submission` added to all 4 labs (lab ids/steps untouched).
- `docs/content-authoring-guide.md` — new §3a (submission field, matcher table, "invariants not machine-specific values" guidance, the two brittleness findings below), §9 checklist item.
- `docs/system-architecture.md` — Layers, Data model (`lab_submission` row + never-revoke note), Key flows ("Submit lab" flow + hardened toggle), Quality gates.

## DB

`pnpm db:push` applied against local `postgres:17-alpine` (docker-compose, already running). Verified via `psql \d lab_submission`: table + `lab_submission_user_lab_idx` + FK to `user(id)` all present as designed.

## Tests / typecheck / lint / build

- `pnpm typecheck`: clean at every phase checkpoint, incl. zero edits to any other `module-meta.ts` (backward-compat proof for phase 01).
- `pnpm test`: 97/97 passing (6 files) — includes new `lab-submission-grader.test.ts` (12 tests) and unchanged `curriculum-registry.test.ts` (all 55 modules, incl. m04 with its new `submission` specs).
- `pnpm lint`: clean, no warnings.
- `pnpm build`: fails locally with `BETTER_AUTH_URL must be the public app URL in production` — this is **pre-existing**, unrelated to this feature (`next build` sets `NODE_ENV=production`, local `.env` has `BETTER_AUTH_URL=http://localhost:...`, and `src/lib/env.ts:26` requires a non-localhost URL in production). Verified by re-running with `BETTER_AUTH_URL=https://example.com pnpm build` (env override only, `.env` untouched) — build succeeds, all routes compile. Did not touch `.env` or `env.ts` (out of file-ownership scope for this plan).
- `pnpm validate:module m04-docker-containers`: clean (`6 lessons, 4 labs, 10 quiz questions`).

## Bundle-leak verification (phase 03 success criterion)

Grepped `.next/static` (client bundle) after the phase-04 build for matcher literals (`sha256:[0-9a-f]{64}`, `EXIT_CODE=(`, `uid=(?!0`, `numberInRange`, `jsonHasKeys`, `"matcher"`, `"pattern"`, `"caseSensitive"`, `"kind":"regex"` etc.) — **zero matches**. Sanity-checked the grep methodology itself: the lab id `multi-stage-api-image` (a legitimately public string) appears in 60 build-output files, and a hint string appears in the client bundle as expected (intentionally public) — confirming the grep isn't silently vacuous. One incidental hit on `"matcher"`/`"pattern"` in a vendor polyfill chunk was traced to `core-js`'s `Symbol.matcher`/`Symbol.patternMatch` well-known-symbol polyfills — unrelated false positive, not our type.

## Manual test matrix (phase 03/04)

No browser/auth tooling available in this session, so the pass/fail/hint/resubmit matrix was verified by calling `gradeLabSubmission` directly (scratch script, not committed) against **genuinely captured** command output for all 4 M04 labs — 8 scenarios (pass + fail per lab), all correct. Details below.

## Real-world verification that changed the M04 spec design

Plan step 1 said "actually run the four labs... reconstruct real output" — I had Docker available locally, so I built real images and ran a real compose stack; installed Trivy (`brew install trivy`, not previously present) to scan a real image rather than guess its output format. This caught two real bugs in the plan's own draft matchers before they shipped:

1. **`compose-full-stack`**: `docker compose ps --format json` prints **one JSON object per line** (NDJSON), not a single JSON document — `jsonHasKeys` can't parse it at all (multiple top-level values). Worse, each line's `Publishers` array contains a nested `{...}` object, which breaks a `[^}]*`-scoped regex (it stops at the *inner* `}`, not the line's own closing brace) — verified this empirically, the plan's own draft regex failed against real output. Fixed by switching the prompt to the **table form** (`docker compose ps`, no `--format json`) and using a per-row `^.*\bSERVICE\b.*\(healthy\).*$` regex (`m` flag) — this is exactly the fallback the plan itself pre-authorized ("if brittle, use contains on healthy + service names"; I used `regex` instead of `contains` since the row's other columns make a single literal substring impossible to pin down, but same underlying idea).
2. **`trivy-scan-fix`**: Trivy's "Total: N (CRITICAL: N)" summary line is **only printed when N > 0** — a genuinely clean scan prints no such line at all (only a separate "Report Summary" table, one row per scan target, not a single aggregate number). The plan's draft `numberInRange` pattern against that line would therefore never match on a real passing submission → permanent false-negative for an honest learner. Fixed by changing the prompt to run `trivy image --severity CRITICAL --exit-code 1 --ignore-unfixed api:multi; echo "EXIT_CODE=$?"` and grading the exit code (`numberInRange`, `max: 0`) — this is Trivy's own documented, stable CI-gating contract, and matches the M04 quiz's own `trivy-exit-code-pipeline` question, so it's pedagogically consistent too.

Matcher coverage achieved: `contains` (labs 1, 3), `regex` (labs 1, 2, 4), `numberInRange` (lab 3). `jsonHasKeys` intentionally unexercised — plan explicitly permits this ("do not invent one; record the gap for phase 05"), and my own testing reinforced why: the one natural `jsonHasKeys` candidate in this module (`docker compose ps --format json`) turned out to be the wrong tool for this content, not a fit worth forcing.

## Deviations from the plan (and why)

1. **`PublicLabSubmissionSpec.checks` now picks `"id" | "label" | "hint"`, not just `"id" | "label"`.** Phase 01's Architecture code snippet only picked `id`/`label`, but phase 01's own Security section says hint text "is shown on failure" and "must not restate the matcher" (implying it reaches the browser), and phase 03's Functional requirement explicitly says the check list "shows `hint` only for failures." Resolved this in-plan contradiction in favor of the two explicit textual requirements over the code snippet — the matcher (the actual secret) stays fully stripped either way, so this doesn't touch the security guarantee the plan is built around.
2. **`recentSubmissions` sourced via per-lab `getLabSubmissions(userId, moduleId, labId, 3)`, not `getLatestLabSubmissionsForModule`.** Phase 02 built both repository functions (present, typechecked, both used — `getLabSubmissions` in the page, `getLatestLabSubmissionsForModule` implemented but not currently called anywhere). Phase 03 requires "History: last 3 attempts" per lab; `getLatestLabSubmissionsForModule` only returns the single latest row per lab, which can't satisfy "last 3" on its own. Used `Promise.all` over the (≤4 for M04) labs with a `submission` spec — bounded, parallel, no perf concern at pilot scale. `getLatestLabSubmissionsForModule` stays available for a future "cheap latest-status" use case; flagging as a minor inconsistency between the plan's own two repository functions rather than silently dropping one.
3. **Trivy and a sample Docker app were installed/built to capture real output** (not in the plan's file ownership, no repo files affected) — `brew install trivy` added a new global CLI tool. Flagging since the user's rules say "never use global pip install" (Python-specific) but say nothing about brew; judged this as in-scope of "actually run the labs" per the plan's own step 1 and directly caught two real defects. Docker images/containers/compose stack were all torn down and removed after capturing output; scratch files live only under the session scratchpad (plus two stray `/tmp` files I created and then deleted — should have used the scratchpad from the start).
4. **Docs updated directly in this session, not delegated to a separate `docs-manager` agent** — this was a solo phase-implementation task (no multi-agent orchestration requested), so I did the `content-authoring-guide.md`/`system-architecture.md` edits myself as phase 04's own step 7 instructs the content ("update... delegated to docs-manager" describes *what* changes, not that a separate invocation was mandatory in this execution mode).
5. **`ck plan check <id>` didn't persist** (plan.md flagged as "not in canonical format — skipping status update" despite printing `[OK] Phase NN: completed`) — fell back to manually editing `plan.md`'s phase table and each phase file's `Status` field + Todo checkboxes, per the documented fallback.

## Confirmed product decision applied

Re-verification/revoke policy: no revoke logic was added anywhere. `toggleProgressItemAction`'s new guard only blocks *setting* `completed:true` on a graded lab from the legacy path — it never touches or deletes an existing `progress_item` row, and nothing in `submitLabAction` reads or compares against a lab's previous submissions before writing. Documented explicitly in `docs/system-architecture.md`'s Data model section ("Progress is never silently revoked").

## Unresolved questions

- None blocking. Two soft notes for the user: (a) `getLatestLabSubmissionsForModule` exists and typechecks but has no current caller — keep it for a future use or remove it, either is fine; (b) M04's `compose-full-stack`/`trivy-scan-fix` prompts now ask for specific command variants (table-form `ps`, exit-code-echoing `trivy` invocation) that differ slightly from the module's existing lab `steps` text (which I left untouched per the plan's file-ownership note) — worth a lesson-content pass later so the step-by-step instructions and the submission prompt read as one coherent flow, not two separately-authored asks.

**Status:** DONE
**Summary:** Phases 01-04 implemented per plan; typecheck/lint/test/`validate:module` all clean, DB pushed+verified, real Docker/Trivy output used to catch and fix two brittle matcher designs before shipping, bundle-leak check re-verified against real content.
**Concerns/Blockers:** None. `pnpm build` fails locally only due to a pre-existing env-validation gap unrelated to this feature (see Tests section) — confirmed not caused by this work.
