# Phase 05 — Rollout to the remaining labs

**Priority:** P2 · **Status:** **NOT STARTED — do not implement in this plan** · **Effort:** ~10–14h (estimate) · **Depends on:** 04 + real-world pilot usage

## Context links
- `docs/content-authoring-guide.md` §1 "only the lead edits shared files", §8, §9
- Precedent for parallel content work: `plans/260913-2012-interactive-learning-platform/phase-04-content-modules-parallel.md`

## Overview
Apply the (now-proven) submission format to the rest of the curriculum. This phase is **documented, not executed**. It starts only after the pilot has been used against real learner behaviour and the spec format survived contact with four real labs.

## Verified scope
Actual lab count, counted from `src/content/modules/*/module-meta.ts`:

| Course | Modules | Labs |
|---|---|---|
| DevOps & Cloud (`m01`–`m17`) | 17 | 68 |
| System Design (`sd01`–`sd19`) | 19 | 70 |
| Backend (`b01`–`b19`) | 19 | 63 |
| **Total** | **55** | **201** |

Minus the 4 pilot labs → **197 labs remaining**. (The original brief said "~50+"; the real number is ~4× that — the single biggest input to this phase's sizing.)

## Entry gate (all must hold before starting)
- [ ] Pilot live ≥ 2 weeks with real submissions in `lab_submission`
- [ ] No false-negative reports (honest work graded as failing) on the M04 specs
- [ ] `jsonHasKeys` either exercised by a real lab or dropped from the format
- [ ] The "size reduction" gap from phase 04 either solved or accepted as non-checkable
- [ ] Decision made on whether `contentRules` (`src/content/module-definition-validator.ts:15-21`) should require submissions — that flips this from additive to breaking

## Triage first (do this before any authoring)
Not every lab can or should be auto-graded. Classify all 197:
- **A — auto-gradable**: deterministic textual output. Full spec with checks.
- **B — evidence-only**: real work, non-deterministic output (design docs in SD14–SD19, `sd-playground` load-test narratives, architecture write-ups). `checks: []`, still stores evidence.
- **C — leave legacy**: no `submission`; keeps the self-tick checkbox.

Expect System Design (design-doc heavy, `docs/content-authoring-guide.md:126`) to skew hard to B, and DevOps/Backend (CLI + `taskflow-api` + Docker Compose, `:124`, `:134`) to skew to A.

## Execution options
**Option 1 — parallel agents per module (recommended; matches the existing precedent).**
- One agent owns exactly one `src/content/modules/<slug>/module-meta.ts`. Zero shared files → zero conflicts.
- Batch ~6 modules at a time; each batch must pass `pnpm validate:module <slug>` + `pnpm test` before the next.
- Each agent gets: the authoring-guide section, the M04 file as the worked reference, and the A/B/C classification for its labs.

**Option 2 — codemod script (`scripts/…`).** Rejected as the primary path: matchers require judgement about what output is invariant, which is exactly what a script cannot do. A script is useful only for a mechanical pre-pass that stubs `submission: { inputKind, prompt: "TODO", checks: [] }` into every lab for a human/agent to fill.

There is no `register-module.sh` in this repo (`scripts/` contains only `validate-content-module.mts`) — the referenced precedent is the parallel-agent pattern, not a shell script.

## Related code files
**Modify (per module, agent-owned)** — `src/content/modules/<slug>/module-meta.ts` × 54

**Modify (lead-owned, only if the gate decides so)**
- `src/content/module-definition-validator.ts` — raise `contentRules` to require submissions
- `docs/content-authoring-guide.md` — make `submission` mandatory in §3/§9

## Implementation steps (when started)
1. Verify the entry gate.
2. Classify all 197 labs A/B/C into a triage table in this file.
3. Fix any format gaps the pilot exposed — **before** touching 54 files, not after.
4. Batch modules to parallel agents, course by course, DevOps first (highest A ratio, highest learner traffic).
5. After each batch: `pnpm validate:module` per slug, `pnpm test`, `pnpm typecheck`.
6. Once ≥ 90 % of labs have a spec, consider making `submission` required in the validator; ship that as its own small change with all stragglers already fixed.
7. `docs-manager` final pass on the authoring guide + architecture doc.

## Todo list
- [ ] Entry gate verified
- [ ] 197 labs triaged A/B/C
- [ ] Format gaps from the pilot closed
- [ ] DevOps course — 64 remaining labs (68 − 4 pilot) authored + validated
- [ ] Backend course — 63 labs authored + validated
- [ ] System Design course — 70 labs authored + validated
- [ ] Validator/authoring-guide hardening decision made and applied
- [ ] Docs updated

## Success criteria
- Every lab is A, B, or an explicitly justified C.
- `pnpm test` + `pnpm typecheck` + `pnpm build` clean across all 55 modules.
- No learner-facing regression: a lab that used to be tickable is either auto-graded, evidence-only, or still tickable — never silently unreachable.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| Scope shock — 197 labs, not 50 | Confirmed × High | Triage before authoring; A-only first; B is cheap; C is free |
| Format change discovered at lab #120 | Med × **High** | Entry gate + step 3 force format stabilisation before the mass edit |
| Existing learners' completed labs get invalidated | Low × High | Additive only — existing `progress_item` rows are never deleted. Adding a spec to an already-completed lab does not revoke it (phase 02 decision) |
| Parallel agents drift on prompt style/tone | High × Med | M04 is the mandatory worked reference; per-batch validation |
| Matchers authored against imagined output at scale | High × High | Agents must cite the source of the expected output (curriculum doc / lesson `<Terminal>` block); anything uncertain → class B |

## Security considerations
- Same as phase 04, ×197: review every prompt for "paste a file" phrasing, especially in Backend labs touching `.env`, JWT secrets (`b05`), and object-storage credentials (`b08`).
- Storage growth becomes real at this scale — revisit the deliberately-skipped submission retention policy (phase 02 risk table) once `lab_submission` row count is observable.

## Next steps
None — terminal phase. Re-plan if the entry gate fails.
