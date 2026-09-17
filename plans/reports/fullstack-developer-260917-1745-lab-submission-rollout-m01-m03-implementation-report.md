# Lab submission rollout — M01–M03 implementation report

Plan: `plans/260917-1751-lab-submission-rollout-m01-m03/` (phase-00..04). Task: author `submission` specs for 12 labs across m01-linux-shell, m02-networking, m03-devops-mindset-git + fix the evidence-only UI gap. Engine (`lab-submission-grader.ts`, `content-types.ts`, `toPublicLabSubmissionSpec`) required zero changes, confirmed.

## Files modified

- `src/components/progress/lab-checklist-card.tsx` — phase 00 UI fix: `isAutoGraded` (`checks.length > 0`) → `hasSubmission` (`Boolean(lab.submission)`). Evidence-only labs (`checks: []`) now render one control (status dot + panel), not checkbox+panel.
- `docs/content-authoring-guide.md` §3a — lifted "M04 only" freeze to "live on M01–M04"; added labelled-echo idiom, `wc -l` padding rule, CRLF-anchor rule; checklist item scope updated.
- `docs/system-architecture.md` — `lab_submission` row + "Mark lesson/lab done" flow updated to reflect `hasSubmission` semantics; "Submit lab" flow note updated from "pilot: M04" to "live: m01-m04"; added accepted-risk paragraph for the no-ReDoS-guard decision with revisit trigger.
- `src/content/modules/m01-linux-shell/module-meta.ts` — 4 labs: 2 A (`backup-script`, `healthcheck-script`), 2 B (`harden-vm`, `systemd-app-service`, override). `healthcheck-script` step 4 edited to pin all 3 threshold env-var names.
- `src/content/modules/m02-networking/module-meta.ts` — 4 labs, all A. `tcpdump-http-capture` step 1 edited to drop `-A` from the submission path (kept as optional local-exploration note).
- `src/content/modules/m03-devops-mindset-git/module-meta.ts` — 4 labs: 3 A, 1 B (`slo-dora-baseline`). `branch-protection-pr-flow` step 3 rewritten to pin **Ruleset** (not classic branch protection) — see empirical finding below.
- `plans/260917-1751-lab-submission-rollout-m01-m03/plan.md` + all 5 phase files — statuses marked completed, triage table corrected to actual A/B counts.

No file outside these was touched. `git diff --stat`: 6 files, matches phase ownership exactly (docs 2, component 1, module-meta 3).

## Final triage table

| Module | Lab | Class | Notes |
|---|---|---|---|
| M01 | `harden-vm` | **B** (override) | No systemd/ufw verification env available this session; per user's explicit override, downgraded from plan's draft A. `checks: []`, prompt still asks for `sshd -T`/`ufw status` paste as self-attested evidence. |
| M01 | `backup-script` | A | Verified live in a systemd-enabled Docker container (`jrei/systemd-ubuntu:22.04`, amd64 emulated on Apple Silicon via colima). |
| M01 | `healthcheck-script` | A | Verified live in same container; both threshold branches run for real. |
| M01 | `systemd-app-service` | **B** (override) | Same reason as `harden-vm`. `checks: []`. |
| M02 | `subnet-planning` | A | Verified via local `python3 -c "import ipaddress..."`. |
| M02 | `nginx-reverse-proxy-lb` | A | Verified via real nginx + 2 loopback backends in one container. |
| M02 | `https-letsencrypt` | A | Verified issuer string + 301 line against real public LE-served/redirecting hosts (per plan — no cert issued). |
| M02 | `tcpdump-http-capture` | A | Verified real capture (no `-A`); also verified no header/cookie/auth leakage. |
| M03 | `sample-app-repo` | A | Verified in scratch git repo + tiny Python `/healthz` server. |
| M03 | `pre-commit-conventional-commits` | A | Verified with real `pre-commit` (venv-installed) + real gitleaks + conventional-pre-commit hooks. |
| M03 | `branch-protection-pr-flow` | A | Verified against a real throwaway public GitHub repo — **pinned to Ruleset**, see finding below. |
| M03 | `slo-dora-baseline` | B (per plan) | No invariant exists; unchanged from plan draft. |

Total: 9 A (auto-graded), 3 B (evidence-only) = 12 new specs. Plus M04's existing 4 A = 16 labs with `submission` across m01–m04, out of ~68 DevOps-course labs (17 modules × ~4).

## Real command output captured (grounding, not guessed)

- **M01** (systemd container `jrei/systemd-ubuntu:22.04`, `--platform linux/amd64` via colima/qemu emulation):
  - `systemctl is-enabled backup.timer` → `enabled`; `is-active` → `active`.
  - Found and fixed a real bug in my own reference `backup.sh`: `for old in "${arr[@]:-}"; do [[ -n "$old" ]] && rm -f "$old"; done` as the **last** statement in a script propagates the `[[ ]]`'s false exit status as the script's own exit code when the array is empty — classic bash gotcha, confirmed empirically (`bash -c '...'; echo $?` → 1). Fixed with `if`/`then` instead of `&&`. Not shipped to the module (only used to ground the matcher), but worth knowing.
  - ShellCheck's amd64 binary crashed (exit 137) under qemu emulation inside the container — ran ShellCheck natively via Homebrew instead (`brew install shellcheck`) against the file copied out with `docker cp`; confirmed exit 0 on the clean script.
  - `healthcheck.sh` run twice with real forced thresholds: `OVER_EXIT=1`, `UNDER_EXIT=0`, both real.
- **M02**: real nginx `-t` ("test is successful"), real `ss -tlnp` (`127.0.0.1:3001`/`3002`), real `curl` write-out (`PROXY_HTTP=200`); real `tcpdump -i any -nn 'tcp port 80'` capture showing `Flags [S]`/`[S.]`/`[F.]` — separately verified with injected `Authorization`/`Cookie` headers that **no** header/cookie content leaks without `-A`; real `openssl x509 -noout -issuer` against `letsencrypt.org` (`issuer= /C=US/O=Let's Encrypt/CN=YE2`) and a real 301 (`HTTP/1.1 301 Moved Permanently`) from the same host; real subnet python output.
- **M03**: real `git ls-files | wc -l` BSD padding (`ENV_TRACKED=       0`); real `pre-commit run --all-files` with gitleaks + conventional-pre-commit installed (venv, `pip install pre-commit`); real blocked non-conventional commit (`BAD_COMMIT_EXIT=1`) — first attempt showed `BAD_COMMIT_EXIT=0` because `pre-commit install -q --hook-type commit-msg` silently failed (`-q` unsupported by pre-commit 4.3.0, non-fatal exit code masked); reran without `-q`, hook installed correctly, reproduced the intended block.
  - **Throwaway public GitHub repo** `lqtrung-95/ck-scratch-branch-protection-<ts>`: created, pushed, tested both mechanisms.

## Empirical finding that changed the m03 spec design

The plan's fallback ladder for `branch-protection-pr-flow` assumed `gh api repos/<u>/<r>/rules/branches/main --jq '[.[].type]'` might be reliable only for **classic** protection. Empirically it's the **opposite**:

- Classic branch protection (`PUT .../branches/main/protection`) → `rules/branches/main` returns `[]` (empty — that endpoint is rulesets-only).
- A **Ruleset** (`POST .../rulesets`) with `pull_request` + `required_status_checks` rules → same endpoint returns `["pull_request","required_status_checks"]`.
- Both mechanisms reject a direct push, but with **different error codes**: classic → `GH006`, ruleset → `GH013`. Both include the literal line `Changes must be made through a pull request.`

Resolution: pinned the lab's own step 3 to **Ruleset** (not classic protection) so checks 2–3 (`pull-request-required`, `status-check-required`) are satisfiable, and widened `direct-push-rejected`'s regex to `(GH006|GH013|protected branch|must be made through a pull request)` so the primary check still passes for a learner using either mechanism if they don't follow the pinned step exactly (defense in depth — verified via the grader script: classic-protection-only output passes check 1 but fails checks 2–3 as designed).

`gh` lacked `delete_repo` scope; `gh auth refresh -h github.com -s delete_repo` requires an interactive device-code flow I can't complete unattended. **The throwaway repo `lqtrung-95/ck-scratch-branch-protection-1789645627` was NOT deleted** — it is empty/harmless (a README, a CI workflow stub, no secrets) but needs manual deletion: `gh repo delete lqtrung-95/ck-scratch-branch-protection-1789645627 --yes` after `gh auth refresh -h github.com -s delete_repo`, or via the repo's Settings → Danger Zone.

## Grading verification (scratch script, not committed)

Wrote a scratch TS script importing the real `gradeLabSubmission` + real `module-meta.ts` exports, ran via `tsx`. 20/20 outcomes correct: pass case with real captured content for every A lab, fail case with a deliberately wrong paste per lab, plus the evidence-only B-lab path (`{passed:false, autoGraded:false}` on non-empty content). Notably confirmed classic-protection-only output for `branch-protection-pr-flow` yields `passed:false` (checks 2–3 fail) — proving the ruleset-pinning decision is load-bearing, not cosmetic.

Deviation from plan step wording ("8/8 outcomes", "6/6 outcomes" per phase): consolidated into one 20-scenario script across all three modules rather than three separate scratch scripts, for efficiency. Coverage is equivalent (pass+fail per A-lab-with-checks, plus the B-lab path); not a reduction in rigor.

## Bundle-leak verification — methodology correction vs the M04 precedent

The M04 report's methodology ("grep `.next/static`") does not apply to these routes: `/modules/[moduleSlug]` is `ƒ (Dynamic)` (server-rendered per request, confirmed in the `next build` output), so module content is never baked into the static JS chunks — grepping `.next/static` for any lab id (including M04's already-shipped `multi-stage-api-image`) now returns **zero** matches. This is a build/routing property, not a regression on my part; the M04 report's own text says it grepped "`.next/static` (client bundle)" but its 60-file hit count is more consistent with having actually grepped the broader `.next` tree (server chunks legitimately contain the full module including matchers server-side, which is correct/required).

Corrected method: built the app (`BETTER_AUTH_URL=https://example.com pnpm build`), started it (`pnpm start`), and `curl`'d the actual rendered HTML/RSC payload for `/modules/m01-linux-shell`, `/modules/m02-networking`, `/modules/m03-devops-mindset-git`, `/modules/m04-docker-containers` — i.e. exactly the bytes a browser receives. Grepped that for `"kind"`, `"pattern"`, `"flags"`, `"min"`, `"max"`, and every new check's literal matcher value/pattern (e.g. `\d{4}`, `OVER_EXIT=\s`, `GH006`, `passwordauthentication no`). **Zero matches** for all of them. Sanity-checked non-vacuously: the lab id `backup-script` and a hint string both appear in the real response (confirming the grep isn't vacuous).

One nuance flagged, not fixed: several new `contains`/`numberInRange` hints restate the check's literal expected token (e.g. `timer-enabled`'s hint says "Chưa thấy \`TIMER_ENABLED=enabled\`"). This exactly mirrors M04's own shipped precedent (`multi-tag-exists`'s hint: "Chưa thấy tag \`multi\`..."), and the restated tokens are self-evident from the prompt's own command (the learner already knows what `systemctl is-enabled` prints on success) — not proprietary grading logic like a regex shape or a numeric threshold derivation. Treated as consistent with established practice, not a defect.

## Typecheck / lint / test / build

- `pnpm typecheck` — clean.
- `pnpm lint` — clean.
- `pnpm test` — 146/146 passed (9 files).
- `pnpm validate:module` for m01, m02, m03, m04 — all clean.
- `BETTER_AUTH_URL=https://example.com pnpm build` — clean, used for the leak verification above.

## Deviations from the plan

1. **m01 `harden-vm`/`systemd-app-service` downgraded A→B** — per explicit user override (no verified systemd/ufw environment this session), not re-litigated.
2. **m03 `branch-protection-pr-flow` pinned to Ruleset**, not left mechanism-agnostic across both — required by the empirical finding above (rules/branches/main is ruleset-only).
3. **`docs/project-changelog.md`** — this repo does not maintain that file (not present in `docs/`); skipped rather than introducing a new doc file the project doesn't otherwise use. Updated `system-architecture.md` and `content-authoring-guide.md` instead (both pre-existing).
4. **Grading verification consolidated into one script** (20 scenarios) instead of 3 per-module scripts — same coverage, less overhead.
5. **Throwaway GitHub repo not deleted** — missing `delete_repo` OAuth scope, requires interactive re-auth I can't complete unattended.
6. Node version: repo requires Node ≥18 for `pnpm`/`tsx`/`next`; default shell had v16.20.2 active. Used `$HOME/.nvm/versions/node/v22.16.0/bin` on `PATH` for every `pnpm`/`ck` invocation — no repo config changed.

## Unresolved questions

1. Should someone with `delete_repo` scope (or via the GitHub web UI) delete `lqtrung-95/ck-scratch-branch-protection-1789645627`? It's empty/harmless but was meant to be cleaned up per the plan.
2. `docs/project-changelog.md` doesn't exist in this repo — confirm that's intentional project convention (no changelog file) rather than an oversight I should also fix.
