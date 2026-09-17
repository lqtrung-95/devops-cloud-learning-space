# Phase 03 — M03 DevOps mindset & Git: 3 graded + 1 evidence-only

**Priority:** P2 · **Status:** completed · **Effort:** 2.5h · **Depends on:** 00 (needs the evidence-only UI fix) · **Blocks:** 04

## Context links
- `src/content/modules/m03-devops-mindset-git/module-meta.ts:28-77` — the 4 labs
- `plans/260917-1351-lab-submission-grading/phase-05-rollout-remaining-labs.md` — the A/B/C definitions
- `docs/content-authoring-guide.md` §3a

## Overview
The module where the triage actually bites. Three labs are gradable **because git and `gh` expose machine-readable state**; one (`slo-dora-baseline`) is pure prose with learner-chosen numbers and is the first **class B** lab in the codebase.

## Key insights
1. **Grade the enforcement, not the configuration.** For `branch-protection-pr-flow` the durable signal is GitHub's own rejection of a direct push (`remote: error: GH006: Protected branch update failed` / "Changes must be made through a pull request"). That message is emitted whether the learner used classic branch protection *or* a ruleset, so the check never forces a choice between the two mechanisms. API introspection is a useful *second* check, not the primary one.
2. **Behavioural checks for hooks.** `pre-commit-conventional-commits` is best proven by deliberately attempting a non-conforming commit and grading the exit code — that proves `--hook-type commit-msg` was actually installed, which grepping the YAML never does.
3. **`git ls-files` is the secret-hygiene oracle.** `git ls-files .env | wc -l` = 0 proves `.env` is untracked far more reliably than grepping `.gitignore` (which can list `.env` while the file is already tracked).
4. **`wc -l` pads on BSD/macOS** (`ENV_TRACKED=       0`). Every `numberInRange` pattern over a `wc -l` value must be written `LABEL=\s*(\d+)` — still exactly one capture group, so the validator's group counter (`module-definition-validator.ts:125`) is satisfied.
5. **`slo-dora-baseline` has no invariant at all.** SLO target, error-budget window, baseline numbers are all the learner's own judgement. Adding a token check (e.g. "is a URL") to dodge class B would be a fake check — exactly what the repo rules forbid. It is B, and phase 00 makes B render correctly.
6. **`jsonHasKeys` is still unexercised after this rollout** unless step 3's empirical verification shows the classic-protection endpoint is the right tool (see spec 3). Do not force it — the M04 precedent is explicit.

## Requirements
**Functional** — 3 graded specs + 1 evidence-only spec; `pnpm validate:module m03-devops-mindset-git` clean.
**Non-functional** — no prompt may elicit a PAT, a gitleaks finding, or `.env` contents.

## Architecture — draft specs

### 1. `sample-app-repo` — **A**
`inputKind: "output"` · prompt: in the `sample-app` repo with the app running locally, run and paste (do **not** paste `.env` itself):
`echo "ENV_TRACKED=$(git ls-files .env | wc -l)"`
`echo "ENV_EXAMPLE=$(git ls-files .env.example | wc -l)"`
`curl -s -o /dev/null -w "HEALTHZ=%{http_code}\n" http://localhost:$PORT/healthz`
| check id | matcher | hint direction |
|---|---|---|
| `env-not-committed` | `numberInRange` `ENV_TRACKED=\s*(\d+)`, `max: 0` | "`.env` đang bị git theo dõi — `git rm --cached .env` và thêm vào `.gitignore`." |
| `env-example-committed` | `numberInRange` `ENV_EXAMPLE=\s*(\d+)`, `min: 1` | "Chưa commit `.env.example` — người khác không biết app cần biến nào." |
| `healthz-returns-200` | `numberInRange` `HEALTHZ=\s*(\d+)`, `min: 200`, `max: 200` | "`/healthz` chưa trả 200 — app chưa chạy, hoặc DB/Redis chưa kết nối được, hoặc `$PORT` sai." |
Not checked (by design): language choice, JSON logging, SIGTERM handling, README quality — no invariant paste exists for any of them.

### 2. `pre-commit-conventional-commits` — **A**
`inputKind: "output"` · prompt: **first delete the fake-key file from step 4** (never paste gitleaks findings), then run and paste:
`pre-commit run --all-files; echo "PRECOMMIT_EXIT=$?"`
`echo "GITLEAKS_CONFIGURED=$(grep -c gitleaks .pre-commit-config.yaml)"`
`git commit --allow-empty -m "sai chuan commit"; echo "BAD_COMMIT_EXIT=$?"`
(if that last commit unexpectedly succeeds, undo it with `git reset --hard HEAD~1`)
| check id | matcher | hint direction |
|---|---|---|
| `hooks-pass-on-clean-repo` | `numberInRange` `PRECOMMIT_EXIT=\s*(\d+)`, `max: 0` | "Còn hook fail — chạy `pre-commit run --all-files` và sửa hết trước khi nộp." |
| `gitleaks-hook-configured` | `numberInRange` `GITLEAKS_CONFIGURED=\s*(\d+)`, `min: 1` | "`.pre-commit-config.yaml` chưa khai báo hook quét secret." |
| `bad-commit-message-blocked` | `numberInRange` `BAD_COMMIT_EXIT=\s*(\d+)`, `min: 1` | "Commit sai chuẩn vẫn tạo được — thiếu `pre-commit install --hook-type commit-msg` hoặc thiếu hook `conventional-pre-commit`." |

### 3. `branch-protection-pr-flow` — **A** (empirical verification mandatory)
`inputKind: "output"` · prompt: on local `main`, try a direct push, then read the branch's rules; paste both. **Redact any token embedded in the remote URL before pasting.**
`git push origin main 2>&1 | tail -20`
`gh api repos/<user>/<repo>/rules/branches/main --jq '[.[].type]'`
| check id | matcher | note |
|---|---|---|
| `direct-push-rejected` | `regex` `(GH006\|protected branch\|must be made through a pull request)`, flags `i` | primary, mechanism-agnostic; plain alternation, linear |
| `pull-request-required` | `contains` `pull_request` | from the rules list |
| `status-check-required` | `contains` `required_status_checks` | proves the CI gate, the lab's actual point |
**Fallback ladder** if step 3 verification fails: (a) keep `direct-push-rejected` alone — it still proves the lab's core outcome; (b) if the `rules/branches` endpoint proves reliable only for classic protection, replace checks 2–3 with a single `jsonHasKeys` over `gh api repos/<u>/<r>/branches/main/protection` with keys `required_pull_request_reviews.required_approving_review_count` + `required_status_checks.contexts` + `allow_force_pushes.enabled`, **and** pin the lab step to classic branch protection; (c) if neither verifies, downgrade the whole lab to B. Record which rung was taken and why.

### 4. `slo-dora-baseline` — **B (evidence-only, `checks: []`)**
`inputKind: "url"` · prompt: paste the link to `docs/slo.md` in your `sample-app` repo (e.g. `https://github.com/<user>/sample-app/blob/main/docs/slo.md`). State plainly that this lab is not auto-graded: the system stores the evidence and the learner self-certifies that SLI, SLO, error budget policy and the DORA measurement method are all written down.
**Why B:** every value is a judgement call (99.5% vs 99.9%, 30-day vs 7-day window, which DORA proxy). There is no output whose *content* is invariant, and a "starts with https://" check would verify nothing about the work.

**Matcher coverage this module:** `numberInRange` ✓ (dominant) · `contains` ✓ · `regex` ✓ · `jsonHasKeys` only via fallback rung (b).

## Related code files
**Modify** — `src/content/modules/m03-devops-mindset-git/module-meta.ts` (add `submission` ×4; possibly pin `branch-protection-pr-flow` step 3 to one mechanism if rung (b) is taken; lab `id`s untouched)
**Create / delete** — none

## Implementation steps
1. Capture real output for `sample-app-repo` and `pre-commit-conventional-commits` in a scratch git repo: `git init`, a `.env` + `.env.example`, a real `pre-commit` install with `gitleaks` + `conventional-pre-commit`, a real rejected commit, and a tiny HTTP server answering `/healthz`. Both a passing and a failing variant.
2. Confirm the `wc -l` padding behaviour on this machine and that `LABEL=\s*(\d+)` matches both padded and unpadded forms.
3. **Throwaway public GitHub repo** (`gh repo create --public`): enable branch protection on `main` requiring a PR + the `test` status check, attempt `git push origin main`, capture the verbatim rejection, and capture `gh api repos/<u>/<r>/rules/branches/main --jq '[.[].type]'`. Repeat with a **ruleset** instead of classic protection and compare — this is what decides the fallback rung. Delete the repo afterwards.
4. Author all 4 `submission` blocks.
5. `pnpm validate:module m03-devops-mindset-git` → clean.
6. Scratch-script `gradeLabSubmission`: pass + fail per graded lab (6 outcomes) plus one evidence-only submission asserting `{passed:false, autoGraded:false}` and that the action still completes the lab on non-empty content.
7. Verify in the running app that the B lab renders exactly one control (phase 00's fix).
8. `pnpm typecheck && pnpm lint && pnpm test`.

## Todo list
- [ ] Scratch git repo with real pre-commit hooks; pass + fail output captured
- [ ] `wc -l` padding behaviour confirmed
- [ ] Throwaway public GitHub repo: rejection message + rules output captured for **both** classic protection and ruleset
- [ ] Fallback rung chosen and documented
- [ ] `submission` authored ×4 (3 graded + 1 evidence-only)
- [ ] `pnpm validate:module m03-devops-mindset-git` clean
- [ ] 6/6 graded outcomes correct + evidence-only path verified
- [ ] B lab renders one control in the browser
- [ ] Throwaway repo deleted
- [ ] typecheck + lint + test clean

## Success criteria
- 3 labs auto-graded, 1 stores evidence and completes on submit.
- The `branch-protection` check passes for a learner using a ruleset **and** for one using classic protection — or the lab explicitly pins one mechanism in its own steps.
- No check depends on the learner's username, repo name, language, or chosen SLO values.
- Zero diff in any other `module-meta.ts`.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| `gh api …/rules/branches/main` behaves differently for rulesets vs classic protection | **High** × High | Step 3 tests both; the fallback ladder is pre-authorised so the implementer never has to guess |
| Learner has no GitHub PAT / `gh auth` ⇒ second command fails ⇒ honest fail | Med × Med | Primary check (`direct-push-rejected`) comes from plain `git push` and needs no `gh` |
| Token embedded in remote URL gets pasted into `lab_submission` | Med × **High** | Explicit redaction instruction in the prompt; `tail -20` limits the paste; call it out in the docs pass |
| `git commit --allow-empty` leaves a junk commit when hooks are misconfigured | Med × Low | Prompt tells the learner to `git reset --hard HEAD~1` in that case |
| Evidence-only lab reads as "free completion" to the learner | Med × Low | Prompt says plainly it is self-certified, not graded |
| `$PORT` unset in the learner's shell ⇒ curl hits a bad URL | Med × Med | Hint names `$PORT` and suggests substituting the literal port |

## Security considerations
- **Never paste gitleaks findings** — a finding embeds the matched secret. The prompt requires deleting the planted fake key and submitting a clean run only.
- **PAT in remote URL** — the one realistic way a live credential could land in `lab_submission` from this module. Redaction instruction is mandatory prompt text.
- `.env` contents are never requested; only the *count* of tracked `.env` paths.
- `gh api` output for branch rules contains no secrets (rule types and settings only).

## Next steps
Phase 04.
