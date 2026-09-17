# Phase 04 — Pilot: M04 Docker labs + docs + validation

**Priority:** P1 · **Status:** completed · **Effort:** 2h · **Depends on:** 01, 02, 03 · **Blocks:** 05

## Context links
- `src/content/modules/m04-docker-containers/module-meta.ts:28-80` — the four labs
- `docs/content-authoring-guide.md` §3 (field table), §8 (validate), §9 (checklist)
- `docs/system-architecture.md` — "Data model" + "Key flows" need the new table and flow

## Overview
Author `submission` specs for all four M04 labs, validate, walk the phase-03 manual matrix against them, then hand the doc updates to `docs-manager`.

## Key insights (verified)
1. **Why M04 is the pilot:** its four labs (`module-meta.ts:30, 44, 57, 69`) produce output that is objectively checkable with the 4 matchers — image size delta, `id` output, `docker compose ps`, Trivy totals, a GHCR digest. M01's labs (VM/SSH hardening) are checkable too but need more per-machine variance handling. M04 is also Phase-1, `order: 4` (`:7`), i.e. early enough that most learners reach it.
2. **Exactly 4 labs** — enough to exercise every matcher once, small enough to redo if the spec format turns out wrong. That is the point of a pilot.
3. Lab ids are frozen progress keys (`docs/content-authoring-guide.md:37`) — `multi-stage-api-image`, `compose-full-stack`, `trivy-scan-fix`, `push-ghcr-git-sha` must not be touched. Only the new `submission` field is added.
4. `pnpm validate:module m04-docker-containers` (`scripts/validate-content-module.mts:29`) runs the phase-01 validator rules, so authoring errors surface before commit.
5. Learners run these labs on their own machines — outputs vary (user names, image ids, paths). Matchers must key off the **invariant** part of the output, never on incidental values.

## Requirements
- Every M04 lab gets a `submission` with a Vietnamese `prompt` naming the exact command to run.
- ≥ 1 lab per matcher kind across the module.
- Every check has a `hint` that nudges without revealing the matcher.
- `pnpm validate:module m04-docker-containers` passes.
- `docs/content-authoring-guide.md` and `docs/system-architecture.md` updated (delegated to `docs-manager`).

## Architecture — draft specs (starting point, refine while testing real output)

**1. `multi-stage-api-image`** — `inputKind: "output"`, prompt: run `docker images api --format "{{.Tag}} {{.Size}}"` then `docker run --rm api:multi id`, paste both.
- `non-root-user` — `regex` `uid=(?!0\b)\d+` · hint: "Container vẫn chạy bằng root — thêm `USER node` vào stage runtime."
- `multi-tag-exists` — `contains` `multi` · hint: "Chưa thấy tag `api:multi` trong output."
- (size reduction is *not* machine-checkable from this paste without parsing two units — keep it as a step, not a check. Recorded as a spec-format gap for phase 05.)

**2. `compose-full-stack`** — `inputKind: "output"`, prompt: paste `docker compose ps --format json`.
- `four-services` — `regex` `(?:"Service")(?:.|\n)*?(?:"Service")(?:.|\n)*?(?:"Service")(?:.|\n)*?"Service"` · hint: "Cần đủ 4 service: frontend, api, db, redis."
- `db-healthy` — `regex` `"Service"\s*:\s*"db"[^}]*"Health"\s*:\s*"healthy"` · hint: "`db` chưa `healthy` — kiểm tra `healthcheck` với `pg_isready`."
- `redis-healthy` — `regex` `"Service"\s*:\s*"redis"[^}]*"Health"\s*:\s*"healthy"` · hint: "`redis` chưa `healthy` — thử `redis-cli ping` trong healthcheck."
- If the per-line JSON shape makes these brittle in practice, switch the prompt to `docker compose ps` (table form) and use `contains` on `healthy` + service names.

**3. `trivy-scan-fix`** — `inputKind: "output"`, prompt: paste the tail of `trivy image --severity CRITICAL api:multi`.
- `zero-critical` — `numberInRange` pattern `Total:\s*(\d+)\s*\(CRITICAL:\s*\d+\)` … simpler: `CRITICAL:\s*(\d+)`, `max: 0` · hint: "Vẫn còn lỗ hổng CRITICAL — nâng base image hoặc package có `Fixed Version`."
- `scanned-right-image` — `contains` `api:multi` · hint: "Output không phải của image `api:multi`."

**4. `push-ghcr-git-sha`** — `inputKind: "value"`, prompt: paste the `sha256:…` digest printed by `docker push`.
- `valid-digest` — `regex` `^sha256:[0-9a-f]{64}$` · hint: "Digest phải có dạng `sha256:` + 64 ký tự hex."

**Matcher coverage:** `contains` ✓ (1, 3) · `regex` ✓ (1, 2, 4) · `numberInRange` ✓ (3) · `jsonHasKeys` ✗. If no M04 lab naturally needs `jsonHasKeys`, **do not invent one** — record that the matcher is unexercised and let phase 05 decide whether to keep or drop it (a curl-a-JSON-endpoint lab in M07/M12 is its natural home).

## Related code files
**Modify**
- `src/content/modules/m04-docker-containers/module-meta.ts` — add `submission` to 4 labs
- `docs/content-authoring-guide.md` — §3 field table row for `submission`, new subsection on writing checks, §9 checklist item (→ `docs-manager`)
- `docs/system-architecture.md` — `lab_submission` in "Data model", new "Submit lab" key flow, "Progress domain" row (→ `docs-manager`)

**Create / delete** — none.

## Implementation steps
1. Actually run the four labs (or reconstruct real output from the existing steps) and capture genuine terminal output — matchers written against imagined output are the top failure mode here.
2. Add `submission` to each lab in `module-meta.ts`.
3. `pnpm validate:module m04-docker-containers` → clean.
4. `pnpm test` → `curriculum-registry.test.ts` still green for all 55 modules.
5. Run the app, walk the phase-03 manual matrix against real M04 pastes: one passing, one failing, one resubmit.
6. Tune matchers against what actually came out of the terminal; re-validate.
7. Delegate to `docs-manager`: update `docs/content-authoring-guide.md` + `docs/system-architecture.md` (content decided only after step 6, so the doc describes the shipped format, not the planned one).
8. `pnpm lint` · `pnpm typecheck` · `pnpm build`.

## Todo list
- [x] Real terminal output captured for all 4 labs (built `api:single`/`api:multi` with real Docker, ran real `docker compose up --wait` with db/redis healthchecks, installed and ran real Trivy against `api:multi`, inspected a real image digest)
- [x] `submission` authored for `multi-stage-api-image`
- [x] `submission` authored for `compose-full-stack`
- [x] `submission` authored for `trivy-scan-fix`
- [x] `submission` authored for `push-ghcr-git-sha`
- [x] `pnpm validate:module m04-docker-containers` clean
- [x] Phase-03 manual matrix walked with real pastes (via scratch script calling `gradeLabSubmission` directly with genuine captured output — pass/fail verified per check per lab; browser click-through not performed, no auth/browser tooling in this session)
- [x] Matchers tuned post-testing (see deviations in the implementation report — `compose-full-stack` switched from `--format json` + `jsonHasKeys`-style draft to table form + `regex`; `trivy-scan-fix` switched from parsing the "Total:" summary line to `--exit-code` + `numberInRange`, because both drafted approaches failed against real captured output)
- [x] Docs updated: `docs/content-authoring-guide.md` (new §3a) + `docs/system-architecture.md` (Data model, Key flows, Layers, Quality gates) — done directly in this session, not via a separate `docs-manager` delegation
- [x] lint / typecheck / test / build clean

## Success criteria
- All 4 M04 labs are auto-graded; the module can be completed only by submitting real output.
- A deliberately wrong paste fails with a hint that actually helps.
- A correct paste from a *different* machine (different user, image id, paths) still passes — matchers keyed on invariants.
- Zero changes to the other 54 modules.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| Matchers written against imagined output → false negatives for honest learners | **High** × High | Step 1 mandates real captured output before authoring; step 6 tunes after testing |
| Matcher keys off a machine-specific value (user name, image id, path) | Med × High | Explicit review pass: every matcher must be justified as invariant across machines |
| Grading too strict → learner blocked with no way forward | Med × High | Hints on every check; evidence-only (`checks: []`) is always the escape hatch for a lab that resists checking |
| Grading trivially gameable (learner types the expected string) | **High** × Low | Accepted and explicit: this is a self-study platform with no proctoring. The goal is to stop *accidental* skipping, not a determined cheater. Do not add anti-cheat complexity |
| Docs updated before format stabilises | Med × Low | Doc step is last, after matcher tuning |

## Security considerations
- Prompts must tell learners to paste **command output**, not files — e.g. never "paste your `.env`". Review all four prompts for this.
- `trivy image --scanners secret` output can contain a matched secret; keep that step out of the submission prompt.
- Digest/tag values are not secrets; GHCR PAT must never be part of any prompt.

## Next steps
Only after the pilot has been used for real: phase 05.
