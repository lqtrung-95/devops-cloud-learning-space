# Phase 04 — Cross-module validation, rollback drill & docs

**Priority:** P2 · **Status:** completed · **Effort:** 1h · **Depends on:** 01, 02, 03 · **Blocks:** —

## Context links
- `plans/reports/fullstack-developer-260917-1404-lab-submission-grading-implementation-report.md` §"Bundle-leak verification" — the grep methodology to repeat
- `plans/reports/code-reviewer-260917-1437-lab-submission-grading-review-report.md` §"Residual ReDoS risk" — the decision owed here
- `docs/system-architecture.md`, `docs/project-changelog.md`, `docs/content-authoring-guide.md`

## Overview
Merge the three parallel content phases, prove nothing leaked and nothing regressed, take an explicit position on the ReDoS note, and update the docs to describe what actually shipped.

## Requirements
- All 4 DevOps Phase-0/1 modules (`m01`–`m04`) validate clean; the other 52 modules are byte-identical.
- No matcher literal reaches the client bundle.
- Docs describe the shipped specs, written **after** the specs are final.

## Test matrix
| Level | What | How |
|---|---|---|
| Unit | grader matchers | existing `src/lib/progress/lab-submission-grader.test.ts` — unchanged, must stay green |
| Content | every new spec's structure | `pnpm validate:module m01-linux-shell`, `… m02-networking`, `… m03-devops-mindset-git`, `… m04-docker-containers` |
| Registry | all 55 modules still load | `pnpm test` (`curriculum-registry.test.ts`) |
| Grading | each of the 11 A labs, pass **and** fail | scratch script calling `gradeLabSubmission(spec, realCapturedOutput)` — 22 outcomes |
| Grading | the 1 B lab | `{passed:false, autoGraded:false, outcomes:[]}`; action still completes on non-empty content; empty content rejected by `submitLabSchema` |
| Leak | no answer key in the browser | rebuild, grep `.next/static` for each new `pattern`/`value` literal; sanity-check the grep isn't vacuous by confirming a public string (a lab id) *does* appear |
| Regression | other modules | `git diff --stat src/content/modules/` touches exactly 3 files |
| Build | whole app | `pnpm typecheck && pnpm lint && pnpm test && BETTER_AUTH_URL=https://example.com pnpm build` (the env override is the known pre-existing local-build gap, not a new failure) |

## Backwards compatibility
- **Existing learners keep every completed lab.** No revoke logic exists anywhere (`setProgressItemCompleted` is only ever called with `true` after a pass, or via the legacy toggle) — adding a spec to an already-ticked lab leaves the `progress_item` row alone. Verified in the M04 review; re-grep `setProgressItemCompleted` call sites to confirm it is still true.
- **Forward-looking change:** a learner who had *not* yet ticked one of these 11 labs can no longer self-tick it. Intended, and the whole point of the feature.
- No schema change, no migration, no `db:push`.
- Module progress %, dashboard and course summaries are untouched — `module-progress-calculator.ts` counts `progress_item` rows and does not know about submissions.

## Rollback plan
| Unit | How to revert | Blast radius |
|---|---|---|
| One module's specs | delete the `submission` blocks from that one `module-meta.ts` | that lab returns to the legacy self-tick; existing `lab_submission` rows become inert, completions persist |
| Phase 00 UI change | revert one boolean in `lab-checklist-card.tsx` | evidence-only labs show the old dual control |
| Everything | `git revert` the phases' commits | back to M04-only; **no data loss, no migration to undo** |
Rollback is safe in any order because every change is additive content plus one render branch.

## Decision owed: the ReDoS note
The M04 review flagged that author regexes run against learner input with no timeout, and recommended a guard "before phase 05 scales to ~197 labs". **Recommendation: do not add a guard in this plan.** Rationale: (a) this rollout adds ~7 regex patterns, all plain alternations/character classes with no nested quantifiers — verify each one explicitly during this phase and record the list; (b) the attack requires an authenticated learner and is capped at 10k chars; (c) a reliable static backtracking detector is not a KISS addition and a wall-clock timeout is not achievable synchronously in JS. **Trigger to revisit:** authoring opens beyond the core maintainer, or the graded-lab count passes ~50. Record this as an accepted risk in `docs/system-architecture.md` rather than leaving it as a floating review note.

## Implementation steps
1. Merge/confirm all three content phases are in.
2. Run the whole test matrix above.
3. List every new `regex`/`numberInRange` pattern and assert each is linear (no `(x+)+`, no nested quantifier over an ambiguous group). Paste the list into the docs note.
4. Update `docs/content-authoring-guide.md` §3a status line to the final scope and add any idiom discovered during authoring that phase 00 did not anticipate.
5. Update `docs/system-architecture.md`: graded-lab coverage (12 of 68 DevOps labs), the evidence-only rendering rule, and the accepted ReDoS risk with its revisit trigger.
6. Add a `docs/project-changelog.md` entry.
7. Mark all phases complete in `plan.md` (`ck plan check <id>`, falling back to editing the table — `ck` did not persist for this plan family last time).

## Todo list
- [ ] 4× `validate:module` clean
- [ ] 22 A-lab grader outcomes + B-lab outcomes correct
- [ ] `.next/static` leak grep clean, with a non-vacuous sanity check
- [ ] `git diff --stat` shows exactly the owned files
- [ ] typecheck + lint + test + build clean
- [ ] Regex linearity list recorded
- [ ] Authoring guide, architecture doc, changelog updated
- [ ] plan.md statuses updated

## Success criteria
- 11 labs auto-graded, 1 evidence-only, across exactly 3 changed content files.
- Zero matcher literals in the client bundle.
- A deliberately wrong paste fails with a hint that names the fix without revealing the matcher — spot-check 3 hints for matcher leakage.
- Docs describe shipped behaviour, not drafted behaviour.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| A phase shipped a matcher authored against guessed output | Med × **High** | Phase 04 spot-audits: for each check, the implementer must be able to point at the captured paste it was written from |
| Hint text leaks the matcher | Med × Med | Explicit hint review pass in step 3 |
| Docs written before the specs settle | Low × Med | Docs are step 4–6, after all validation |
| `pnpm build` fails on the known `BETTER_AUTH_URL` env gap and is misread as a regression | Med × Low | Use the documented env override; do not edit `.env` or `env.ts` |

## Security considerations
Re-verify the two guarantees the M04 review established, since new content is the only thing that could break them: (1) no matcher in the bundle — via the rebuild grep; (2) no completion bypass — `isAutoGradedLabKey` still blocks a legacy `completed:true` toggle on all 11 new graded labs (it reads the registry, so it picks them up automatically; confirm with one manual call). Also confirm no new prompt asks for a file's contents, a token, or a log body.

## Next steps
Terminal phase for this plan. The full-curriculum rollout (`phase-05-rollout-remaining-labs.md` in the original plan) stays not-started; this work supplies 3 more data points for its entry gate.
