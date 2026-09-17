# Phase 00 — Evidence-only UI gap + authoring-guide unlock

**Priority:** P1 · **Status:** completed · **Effort:** 0.5h · **Depends on:** — · **Blocks:** 01, 02, 03

## Context links
- `src/components/progress/lab-checklist-card.tsx:19-38` — the branch that decides checkbox vs status dot
- `src/app/actions/learning-progress-actions.ts:17-22` (`isAutoGradedLabKey`), `:36-38` (toggle guard)
- `docs/content-authoring-guide.md:61-63` — the "pilot: M04 only" freeze
- `plans/reports/code-reviewer-260917-1437-lab-submission-grading-review-report.md` §"Bug found and fixed" (the sibling evidence-only gap, already fixed server-side)

## Overview
Two blockers before any content is authored: the first-ever evidence-only lab (M03 `slo-dora-baseline`) would render two competing completion controls, and the authoring guide currently forbids adding `submission` outside M04.

## Key insights (verified by reading the code, not the reports)
1. **Dual completion path for `checks: []`.** `isAutoGraded = Boolean(lab.submission && lab.submission.checks.length > 0)` (`lab-checklist-card.tsx:22`). For an evidence-only lab that is `false` → `ProgressItemCheckbox` renders at `:37`, **and** `LabSubmissionPanel` renders at `:58` because that branch only tests `lab.submission`. Learner sees a tick box and a submit form for the same lab. Never exercised by M04 (all 4 labs have `checks.length > 0`).
2. **Server side is already safe.** `submitLabSchema` requires `.trim().min(1)` (fixed during the M04 review), so an empty evidence submission can't complete a lab. The remaining issue is purely the duplicated control.
3. **Do not touch `isAutoGradedLabKey`.** Widening it to `Boolean(lab.submission)` would make the server *reject* the legacy toggle for evidence-only labs. Unnecessary: once the checkbox is not rendered, the UI has exactly one path, and evidence-only is self-attested by definition — an extra server rejection buys nothing and risks breaking the "reset to not-done" path. KISS.
4. The guide freeze at `:63` ("do not add `submission` to other modules without checking with the lead first") is the lead's own instruction; this plan *is* that check. It must be rewritten, not silently violated.

## Requirements
- A lab with `submission` (any `checks` length) shows exactly one completion control.
- Auto-graded labs keep today's behaviour bit-for-bit (status dot, no checkbox).
- Labs with no `submission` keep the legacy checkbox — 52 modules unaffected.
- Guide states the new scope (M01–M04) and the two new authoring idioms below.

## Architecture — data flow
`module-meta.ts` → `page.tsx:140` `toPublicLabSubmissionSpec` → `LabChecklistCard` decides control → `LabSubmissionPanel` → `submitLabAction` → `gradeLabSubmission` → `progress_item`. Only the *decide control* step changes.

```
lab.submission == undefined        → ProgressItemCheckbox   (legacy, 52 modules)
lab.submission, checks.length > 0  → status dot + panel     (A labs, unchanged)
lab.submission, checks.length == 0 → status dot + panel     (B labs, NEW — was checkbox + panel)
```

## Related code files
**Modify**
- `src/components/progress/lab-checklist-card.tsx` — `:22` → `const hasSubmission = Boolean(lab.submission);` and use it at `:27` (rename the local so the name stops lying; it now means "completed via the panel", not "auto-graded").
- `docs/content-authoring-guide.md` §3a — replace the M04-only freeze; add the two idioms.

**Create / delete** — none.

## Implementation steps
1. In `lab-checklist-card.tsx`, replace the `isAutoGraded` const with `hasSubmission = Boolean(lab.submission)` and use it in the `:27` ternary. Update the `:21` comment to say: labs with a submission form are completed by submitting (graded) or by attesting (evidence-only) — never by the legacy checkbox.
2. In `docs/content-authoring-guide.md` §3a: change the status line to "M01–M04 of the DevOps course; other modules stay self-ticked", and note that `checks: []` hides the self-tick checkbox.
3. Add to §3a the **labeled-echo idiom** (the one convention this rollout standardises):
   > Prefer making the shell print a labelled, machine-readable token over parsing a tool's human table: `echo "TIMER_ACTIVE=$(systemctl is-active backup.timer)"`, `cmd; echo "EXIT_CODE=$?"`. Column-formatted output (`systemctl list-timers`, `docker ps`) is terminal-width dependent and truncates; a labelled token is not.
4. Add the **two paste-portability rules** learned while drafting this rollout:
   > - `numberInRange` patterns over a `$(… | wc -l)` value must be written `LABEL=\s*(\d+)` — BSD/macOS `wc -l` emits leading spaces.
   > - Avoid `$` anchors in `regex` matchers. A paste from a Windows terminal carries `\r` before `\n`, so `\S+$` silently fails. Use a leading `^…` with `m` plus a negative lookahead (`^User=(?!root\b)\S`) instead of trailing anchors.
5. `pnpm lint && pnpm typecheck && pnpm test`.

## Todo list
- [ ] `lab-checklist-card.tsx` renders one control per lab
- [ ] Guide §3a freeze lifted to M01–M04
- [ ] Labeled-echo idiom documented
- [ ] `wc -l` / CRLF paste rules documented
- [ ] lint + typecheck + test clean

## Success criteria
- Rendering an M04 lab produces the identical DOM as before (status dot, no checkbox) — verified by reading the branch, and by the fact that `checks.length > 0` short-circuits identically.
- A hand-made lab with `submission: { inputKind:"url", prompt:"x", checks: [] }` renders no `ProgressItemCheckbox` (verify with a temporary local edit, revert it).
- `pnpm test` 109/109 still green.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| Rename breaks the auto-graded branch | Low × High | Single ternary, one file, covered by typecheck + visual check on `/modules/m04-docker-containers` |
| Guide edit contradicts what actually ships | Med × Low | Phase 04 re-reads §3a against the final specs |
| Hiding the checkbox strands a learner who can't submit (no VM/domain) | Med × Med | Only affects labs that get a `submission`; see the phase 02 `https-letsencrypt` question |

## Security considerations
None new. The projection boundary (`toPublicLabSubmissionSpec`) is untouched; this phase only changes which control renders.

## Next steps
Unblocks 01, 02, 03 — those three may then run fully in parallel.
