---
date: 2026-09-17T19:13Z
type: code-review
scope: Lab submission & grading rollout to M01, M02, M03
verdict: approve-with-one-fix-applied
---

# Lab Submission Rollout M01–M03 — Code Review

Independently re-verified (not trusted from reports). Read plan + all 5 phase files + both agent reports first, then read the actual diff and ran matchers/tests myself.

## Verdict

**Ship it.** One real doc/code mismatch found and fixed directly (docs-only, safe). One design gap in scope (a) confirmed real but is a documented, deliberate KISS trade-off, not a regression — flagged for the record, not blocking. Everything else the two reports claimed holds up under independent re-derivation.

## Focus area (a) — class-B labs: `checks: []` confirmed, but "can never be silently auto-completed" is only true through the UI, not at the server boundary

**`checks: []` claim: TRUE, re-verified by reading the diff directly**, not trusting the reports:
- M01 `harden-vm` — `git diff` line: `submission: { inputKind: "output", prompt: "...", checks: [] }`
- M01 `systemd-app-service` — same, `checks: []`
- M03 `slo-dora-baseline` — `inputKind: "url"`, `checks: []`

`gradeLabSubmission` (`src/lib/progress/lab-submission-grader.ts:103-105`) short-circuits `checks.length === 0` to `{passed:false, autoGraded:false, outcomes:[]}` before ever touching `spec.checks.map(...)` — no matcher logic runs at all for B labs. Confirmed by reading the function, not the test.

**"Can never be silently auto-completed without a real submission" — found a gap.** `isAutoGradedLabKey` (`src/app/actions/learning-progress-actions.ts:17-22`) is:
```ts
return Boolean(lab?.submission && lab.submission.checks.length > 0);
```
This is `false` for any B lab (`checks.length === 0`). The guard in `toggleProgressItemAction` (`:35`) is `if (parsed.data.completed && isAutoGradedLabKey(...))` — so a direct `toggleProgressItemAction({ itemKey: "m01:lab:harden-vm", completed: true })` call **succeeds** for a B lab, with no `lab_submission` row ever written. `itemKey` format (`<moduleId>:lab:<labId>`, `src/lib/progress/progress-item-keys.ts`) is fully public/derivable from the lab's own public `id`, so this isn't a guessing exercise.

This is **not a code bug introduced by this rollout** — it is a deliberate decision made explicitly in phase-00 ("Do not touch `isAutoGradedLabKey`... an extra server rejection buys nothing... KISS") and it mirrors the pre-existing legacy-checkbox trust model exactly (52 other modules already let a learner self-tick with zero verification). Practical impact is low: self-only (no cross-tenant exposure), requires deliberately bypassing your own UI, and evidence-only labs are explicitly "self-attested by definition" per the plan's own framing.

**But the shipped docs overclaimed it.** `docs/system-architecture.md`'s new "Mark lesson/lab done" flow line (added by this rollout, phase 04) said: *"any lab with a `submission` spec is rejected here (whether auto-graded or evidence-only)"* — this is factually wrong; only `checks.length > 0` labs are rejected. This is exactly the kind of doc-vs-code mismatch the review task asked me to hunt for, and it's the only place in the whole diff where the docs actively assert something the code does not do (as opposed to just being silent about a nuance). **Fixed directly** (docs-only change, low risk): `docs/system-architecture.md:56` now states the real `isAutoGradedLabKey` behavior, names the gap, and says explicitly it's UI-only enforcement and a deliberate trade-off, not a server hard gate. Re-ran `pnpm typecheck && pnpm lint && pnpm test` after the edit — 146/146 clean, no other files touched.

**Recommendation (not applied, design call for the lead):** if "every completed B lab has a stored evidence submission" is meant to be an actual guarantee (the phase-03 lab copy literally promises the learner "hệ thống lưu lại bằng chứng"), consider widening `isAutoGradedLabKey` to `Boolean(lab?.submission)` — the toggle guard is gated on `completed &&`, so unchecking (`completed:false`) already bypasses it regardless; widening would not break the "reset to not-done" path phase-00 worried about. That reasoning in phase-00 point 3 appears to have a subtle flaw (conflates "UI has one path" with "server enforces one path", and the stated risk to the reset path doesn't actually apply given the `completed &&` short-circuit). Not fixing this myself — it's a design decision already made once, reversing it belongs to the lead, not to me redesigning mid-review.

## Focus area (b) — `hasSubmission` fix: correct rendering for A, B, and legacy; no regression across the other ~51 modules

Read `lab-checklist-card.tsx` directly (not the reports' summary):
```tsx
const hasSubmission = Boolean(lab.submission);
...
{hasSubmission ? <status-dot/> : <ProgressItemCheckbox .../>}
...
{lab.submission && <LabSubmissionPanel .../>}
```
- Legacy (no `submission`): `hasSubmission=false` → checkbox only, no panel. One control.
- Class A (`checks.length>0`): `hasSubmission=true` → dot + panel. One control.
- Class B (`checks:[]`): `hasSubmission=true` → dot + panel (was the bug: old `isAutoGraded` const gated on `checks.length>0` so B labs got checkbox+panel). One control now.

Verified no other file references the old `isAutoGraded` local (grep for `isAutoGraded\b` outside `isAutoGradedLabKey` — zero hits). Verified only 4 of 55 modules have any `submission` field at all (`grep -rl "submission:" src/content/modules/*/module-meta.ts` → m01/m02/m03/m04 only) — the other ~51 modules' labs have `lab.submission === undefined`, so `hasSubmission` is `false` for every one of them and they render byte-identical to before (single ternary, no other branch touched). `git diff --stat` for `lab-checklist-card.tsx` is 7 lines (rename + comment), confirming no other logic moved. No legacy-checkbox regression.

## Matcher correctness — re-derived independently (not trusted from either report)

Ran real JS (`node -e`, same normalization logic as `lab-submission-grader.ts`) and a real `python3 -c "import ipaddress"` against synthetic-but-realistic captured output:

| Check | My independent result |
|---|---|
| `subnet-planning`: 8×`/19` from `10.0.0.0/16`, 2nd block, last block | `python3 ipaddress.subnets(new_prefix=19)` → 8 blocks, `[1]=10.0.32.0/19`, `[-1]=10.0.224.0/19` — matches both `contains` literals exactly |
| `dated-archive-exists` regex `\d{4}-\d{2}-\d{2}[^\s]*\.tar\.gz` | matches `backup-2026-09-17-full.tar.gz`, correctly rejects a `.zip` |
| `https-letsencrypt` regex `HTTP/[\d.]+ 30[18]` | matches `HTTP/1.1 301 Moved Permanently` and `HTTP/2 308`, correctly rejects `HTTP/1.1 200 OK` |
| `shellcheck-clean` numberInRange `SHELLCHECK_EXIT=\s*(\d+)`, max 0 | exit 0 passes, exit 1 correctly fails |
| `tcpdump connection-closed` regex `Flags \[F` | matches `[F.]` and `[FP.]` |
| `tcpdump syn-observed` contains `Flags [S]` | correctly does **not** false-positive on `Flags [S.]` (whitespace-collapse doesn't strip the `.`, so no accidental substring match) |
| `branch-protection direct-push-rejected` regex `(GH006\|GH013\|protected branch\|must be made through a pull request)`, flag `i` | matches a synthetic classic-protection message (`GH006` + the literal sentence) and a synthetic ruleset message (`GH013` + the same sentence) |
| `gitleaks-hook-configured` — edge case I found not covered by either report | `grep -c gitleaks .pre-commit-config.yaml` on a **missing** config file writes nothing to stdout (error goes to stderr), so `GITLEAKS_CONFIGURED=` is empty. `numberInRange` then has no digit to capture → **fails closed** (no crash, no false pass). Confirmed correct behavior, just noting it as the actual failure mode for a learner who never created `.pre-commit-config.yaml`. |

All match the plan's/reports' claims. `module-definition-validator.ts:121-131` also independently re-read — capture-group counting (`/\((?!\?)/g`, i.e. count `(` not immediately followed by `?`) is correct for every shipped pattern (all have exactly 1 plain group, no lookarounds inside a `numberInRange` pattern).

## Regex linearity (ReDoS) — recount

Tester's report says "4 regex patterns... 7 numberInRange patterns... all linear." I independently grepped: **4 regex matchers confirmed** (`grep -c '"regex"'` across the 3 files → 1+2+1). **numberInRange is actually 11, not 7** (`grep -c '"numberInRange"'` → m01:4, m02:1, m03:6 = 11). The tester undercounted by 4. Conclusion is unaffected — every one of the 11 shares the identical linear shape `LABEL=\s*(\d+)` (single non-nested `\s*` then a bounded digit class), so "no ReDoS risk" still holds — but the report's own count doesn't match the diff, worth a note for report-writing hygiene going forward. Not fixed (report is a historical artifact, not code).

Also note: the plan's draft `runs-as-non-root` regex `^User=(?!root\b)\S` (for `systemd-app-service`) was **never shipped** — that lab was downgraded to B (`checks:[]`) per the deviation, so this pattern doesn't exist in `module-meta.ts`. `docs/content-authoring-guide.md:99` still cites it as the worked example for the "avoid trailing `$` anchors" idiom — that's fine as a generic pattern example (the guide never claimed it's a live check), but a future reader grepping for `runs-as-non-root` in `module-meta.ts` won't find it. Cosmetic, not a defect.

## Docs accuracy vs. what actually shipped

- `docs/content-authoring-guide.md` §3a: scope line, `checks:[]` semantics, labelled-echo idiom, `wc -l` padding rule, CRLF-anchor rule — all read and cross-checked against the actual shipped specs. Accurate.
- `docs/system-architecture.md`: `lab_submission` row description, lab counts (16 labs across m01-m04: 13 auto-graded + 3 evidence-only — recount: M04 has 4 A labs + this rollout's 9 A + 3 B = 13 A + 3 B = 16 total, matches), "Submit lab" flow, ReDoS accepted-risk paragraph — all accurate **except** the one "Mark lesson/lab done" line fixed above.
- `docs/project-changelog.md` does not exist in this repo (confirmed via `ls docs/`) — skipping it was the correct call, not an oversight to fix. This conflicts with my own global instruction template (which assumes a changelog file exists for every project) — that's a process gap for the human to resolve, not something for me to silently create (not asked for, and inventing a changelog entry file wasn't requested).

## Branch-protection UX correctness (Ruleset pin)

Read the actual shipped step text (`module-meta.ts:111`, not the plan draft):
> "Bật bảo vệ nhánh `main` bằng **Ruleset** (Settings → Rules → Rulesets, **KHÔNG dùng branch protection kiểu cũ**): rule `pull_request`... + rule `required_status_checks`..."

This is unambiguous — explicitly names the GitHub UI path (Settings → Rules → Rulesets) and explicitly says "do NOT use the old-style branch protection" in bold. The two follow-up check hints ("...thêm rule Pull Request vào **Ruleset** của nhánh main", "...vào **Ruleset**") reinforce the same mechanism, and the rule-type names in backticks (`pull_request`, `required_status_checks`) match verbatim what `gh api .../rules/branches/main --jq '[.[].type]'` will print back, so the learner's mental model bridges cleanly from "click this in Settings" to "see this in the API output." A learner who ignores the instruction and still sets up classic protection gets a **defense-in-depth partial credit**, not silent confusion: `direct-push-rejected` still passes (regex covers both `GH006` and `GH013`), only the two Ruleset-specific checks fail, and each of those checks' own hint says to add the rule to a Ruleset — so the failure path itself re-teaches the correct mechanism. No UX gap here.

One thing not covered by the step text: no migration note for "what if I already configured classic protection before reading this." Given this is new content with no live learners yet, this is a non-issue today; flag only as a note for whoever eventually needs a "already did it the old way?" callout if/when this becomes a live course with pre-existing learner state.

## File size / conventions

`module-meta.ts` files now 249 (m01), 286 (m02), 291 (m03) lines — over the 200-line guideline. **Not a new problem**: `wc -l src/content/modules/*/module-meta.ts` shows 12+ other modules already exceed 200 lines, including the M04 reference file itself (272 lines, pre-existing before this rollout). This is an established, accepted convention for this file type (one atomic content record per module; splitting would hurt authoring ergonomics, and the authoring guide doesn't ask for it). No action needed. Kebab-case file/dir naming intact. No dead code found (`isAutoGraded` old identifier fully removed, no orphaned imports).

## Engine / trust-boundary re-verification (independent grep, not copied from the plan's own "re-grepped" claim)

- `toPublicLabSubmissionSpec` (`curriculum-lookup.ts:93-99`) strips down to `{inputKind, prompt, checks:[{id,label,hint}]}` — read directly, confirmed no `matcher` field leaves this function.
- `PublicLabDefinition`/`PublicLabSubmissionSpec` types (`content-types.ts:81-94`) have no matcher field at the type level — a future accidental leak would be a compile error, not just a runtime bug.
- Zod input boundary (`submitLabSchema`, `learning-progress-actions.ts:81-87`): `.trim().min(1).max(LAB_SUBMISSION_MAX_LENGTH)` — confirmed an empty/whitespace paste can never complete a B lab.
- `gradeLabSubmission` is a pure function, never throws (confirmed by reading every matcher's try/catch and null-guard), so a hostile/malformed paste degrades to a failing outcome, never a 500.
- Ran `pnpm typecheck && pnpm lint && pnpm test` myself (fresh, node v22.16.0 as the implementer noted is required): typecheck clean, lint clean, **146/146 tests pass**. Ran `pnpm validate:module` for m01/m02/m03 myself: all three clean, lab/lesson/quiz counts match both reports exactly.
- `git diff --stat` — exactly 6 files touched, matches both reports' file-ownership claims and the plan's phase table with zero overlap.

## Fix applied this session

`docs/system-architecture.md:56` — corrected the "Mark lesson/lab done" flow description to state the real `isAutoGradedLabKey` semantics (only `checks.length > 0` labs are server-rejected on direct toggle; evidence-only labs are only UI-gated, by design). Docs-only change. Re-ran `pnpm typecheck && pnpm lint && pnpm test` after — clean, 146/146.

## Unresolved questions (carried from the two agent reports, still open)

1. Throwaway repo `lqtrung-95/ck-scratch-branch-protection-1789645627` still needs manual deletion (missing `delete_repo` OAuth scope) — explicitly out of scope for me per this task's rules, not touched.
2. `docs/project-changelog.md` doesn't exist in this repo — confirm intentional (no changelog convention here) vs. something the lead wants added as a new doc going forward.
3. Design question for the lead (not blocking): should `isAutoGradedLabKey` be widened to cover evidence-only labs too, closing the toggle-bypass gap described above, given the "unchecking stays allowed" reasoning doesn't actually depend on the narrow check?
