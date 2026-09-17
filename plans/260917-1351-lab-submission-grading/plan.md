---
title: "Lab submission & auto-grading (pilot: M04 Docker)"
description: "Replace self-ticked lab checkboxes with a submit-results form that the server auto-grades against an author-written expected-result spec."
status: pending
priority: P1
effort: 8h
branch: main
tags: [content-schema, drizzle, server-actions, grading, pilot]
created: 2026-09-17
---

# Lab submission & grading

Labs today are a self-ticked checkbox (`src/components/progress/progress-item-checkbox.tsx:15`) — zero verification. Replace with: learner pastes lab output → server grades it against a per-lab expected-result spec → pass writes the existing `progress_item` row.

## Confirmed product decisions
- Mechanism: **"Nộp kết quả lên hệ thống"** — paste output/link/value in a web form; grading runs on the server, not in a local shell script.
- Rollout: **pilot one module first** (M04 Docker & Containers), mass rollout is a separate, later phase.
- Pilot module: **`m04-docker-containers`** — 4 labs whose outputs are objectively checkable (image size delta, `docker run … id`, `docker compose ps`, Trivy totals, GHCR digest). Fallback candidate: `m01-linux-shell`.

## Core design (KISS)
- `LabDefinition.submission?` — **optional** field, so all 55 existing `module-meta.ts` files stay valid unchanged.
- 4 matchers only: `contains`, `regex`, `numberInRange`, `jsonHasKeys`.
- Passing all checks → `setProgressItemCompleted(userId, "<moduleId>:lab:<labId>", true)`. **No change** to `module-progress-calculator.ts`, dashboard, or course summaries.
- Expected-result spec is **server-only** — stripped before reaching the client, mirroring `toPublicQuizQuestions` (`src/content/curriculum-lookup.ts:88`).

## Phases
| # | Phase | Effort | Status |
|---|---|---|---|
| 01 | [Content schema + grading engine](phase-01-lab-submission-schema-and-grading-engine.md) | 2h | completed |
| 02 | [DB table, repository, server action](phase-02-submission-persistence-and-server-action.md) | 1.5h | completed |
| 03 | [Submission UI on the module page](phase-03-lab-submission-ui.md) | 2.5h | completed |
| 04 | [Pilot M04 content + docs + validation](phase-04-pilot-m04-content-and-docs.md) | 2h | completed |
| 05 | [Rollout to remaining 197 labs](phase-05-rollout-remaining-labs.md) | — | **not started** (post-pilot) |

## Key dependencies
- 01 → 02 (`LabCheckOutcome` type) → 03 (`submitLabAction`) → 04 (needs all three to author + verify) → 05 (needs pilot validation).
- Phase 05 is deliberately **not** implemented here: it only starts after the pilot is used for real and the spec format survives contact with 4 real labs.

## Cross-plan conflict watch
A parallel plan (`plans/260917-1351-flashcard-spaced-repetition/`) also adds Drizzle tables. Both plans edit exactly one shared file: **`src/db/schema.ts`** (2-line barrel). Table prefix here is `lab_submission*`; no other file overlaps. There is **no `drizzle/` migration directory** — this repo uses `pnpm db:push` (`drizzle.config.ts:5`), so "migration conflict" = both plans must be re-`push`ed after the barrel is merged. Run `pnpm db:push` once, after both schema files exist.

## Out of scope
Peer review, screenshot/file upload, AI-graded free text, instructor dashboard, per-lab leaderboards.
