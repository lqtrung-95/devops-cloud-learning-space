---
title: Interactive DevOps & Cloud learning platform
status: in-progress
created: 2026-09-13
---

# Interactive DevOps & Cloud Learning Platform

Build Next.js web app teaching full curriculum (`docs/curriculum.md`) with ELI5 explanations, interactive SVG diagrams, accounts, server-side progress.

## User decisions (confirmed 2026-09-13)
- Backend: **local first** — Postgres in Docker (deploy later)
- Auth: **GitHub OAuth + email magic link**
- Illustrations: **hand-coded interactive/animated SVG** (no AI images)
- Scope: **platform + full content for all 17 modules**
- Content style: **ELI5 first** (everyday analogy), then technical detail
- Language: Vietnamese + English technical terms

## Stack
Next.js 16 (App Router, TS) · Tailwind v4 · @next/mdx · Better Auth (github + magicLink) · Drizzle ORM + Postgres 17 · Mailpit (local SMTP) · zod · Vitest

## Phases
| # | Phase | Status |
|---|---|---|
| 01 | [Scaffold, infra, DB, auth](phase-01-scaffold-infra-db-auth.md) | pending |
| 02 | [Content framework + app pages + progress](phase-02-content-framework-pages-progress.md) | pending |
| 03 | [Reference module M01 + authoring guide](phase-03-reference-module-and-authoring-guide.md) | pending |
| 04 | [Content M02–M17 (parallel agents)](phase-04-content-modules-parallel.md) | pending |
| 05 | [Test, review, docs, push](phase-05-test-review-docs-push.md) | pending |

## Key dependencies
- Phase 04 depends on 02 (components) + 03 (reference module & guide)
- Content agents own disjoint folders `src/content/modules/mXX-*/` → no conflicts; registry index edited only by lead

## Out of scope (later)
Cloud deploy, admin CMS, comments/community, AI tutor
