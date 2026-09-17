---
title: "Lab submission rollout — M01, M02, M03 (DevOps Phase 0)"
description: "Extend the shipped lab auto-grading from the M04 pilot to 12 labs across m01-linux-shell, m02-networking and m03-devops-mindset-git."
status: completed
priority: P2
effort: 8.5h
branch: main
tags: [content, lab-submission, grading, rollout, devops-course]
created: 2026-09-17
---

# Lab submission rollout — M01–M03

The feature is live (`plans/260917-1351-lab-submission-grading/`, commit `26c41f2`). M04's 4 labs are auto-graded. This plan applies phase-05's A/B/C triage to the next **3 modules / 12 labs**, scoped exactly as the user requested — not the full 197-lab rollout.

## Engine verification (re-grepped, not copied from reports)
- `toPublicLabSubmissionSpec` (`src/content/curriculum-lookup.ts:93-99`) is a pure structural projection; `page.tsx:140` applies it to `learningModule.labs` for **any** module. `PublicLabDefinition` (`content-types.ts:88-94`) has no matcher field → leakage is compiler-caught. **Zero engine changes needed for new modules.** ✅
- `validateLabSubmission` runs for any lab with `submission` (`module-definition-validator.ts:81`) — generic. ✅
- **One real gap found** (M04 never hit it, M03 will): `lab-checklist-card.tsx:22` computes `isAutoGraded = Boolean(lab.submission && lab.submission.checks.length > 0)`, so an **evidence-only** lab (`checks: []`) renders the legacy self-tick checkbox (`:37`) *and* the submit panel (`:58`). → phase 00.

## Triage result (12 labs — per-lab reasoning in the phase files)
| Class | Count | Labs |
|---|---|---|
| **A** auto-gradable | 9 | M01 `backup-script`, `healthcheck-script` · all M02 · M03 `sample-app-repo`, `pre-commit-conventional-commits`, `branch-protection-pr-flow` |
| **B** evidence-only | 3 | M01 `harden-vm`, `systemd-app-service` (downgraded from the draft A — no systemd/ufw-capable verification environment available; see phase-01 deviation note) · M03 `slo-dora-baseline` (every number is learner-chosen — no invariant exists) |
| **C** leave legacy | 0 | — |

## Phases
| # | Phase | Effort | Status |
|---|---|---|---|
| 00 | [Evidence-only UI gap + authoring-guide unlock](phase-00-evidence-only-ui-gap-and-authoring-guide.md) | 0.5h | completed |
| 01 | [M01 linux-shell — 4 labs](phase-01-m01-linux-shell-lab-submissions.md) | 2h | completed (2 A + 2 B — see deviation note) |
| 02 | [M02 networking — 4 labs](phase-02-m02-networking-lab-submissions.md) | 2.5h | completed |
| 03 | [M03 devops-mindset-git — 4 labs](phase-03-m03-devops-git-lab-submissions.md) | 2.5h | completed (branch-protection pinned to ruleset) |
| 04 | [Cross-module validation + docs](phase-04-validation-and-docs.md) | 1h | completed |

## Dependency graph
`00 → (01 ‖ 02 ‖ 03) → 04`. 00 unblocks all three (it lifts the guide's "M04 only" freeze and fixes the B-lab UI that phase 03 needs). 01/02/03 are fully parallel — **one `module-meta.ts` each, zero shared files**.

## File ownership (no overlap)
| Phase | Owns |
|---|---|
| 00 | `src/components/progress/lab-checklist-card.tsx`, `docs/content-authoring-guide.md` §3a |
| 01 | `src/content/modules/m01-linux-shell/module-meta.ts` |
| 02 | `src/content/modules/m02-networking/module-meta.ts` |
| 03 | `src/content/modules/m03-devops-mindset-git/module-meta.ts` |
| 04 | `docs/system-architecture.md`, `docs/project-changelog.md`, plan files |

## Locked constraints (do not relitigate)
`submission` stays optional · no revoke on spec change · the same 4 matchers (no 5th) · matchers never reach the browser · **every matcher authored against really-captured output, never guessed** (this caught 2 shipped-spec bugs in M04).

## Out of scope
The other 52 modules · making `submission` required in `contentRules` · submission retention policy · a ReDoS guard in the grader (accepted risk, see phase 04).
