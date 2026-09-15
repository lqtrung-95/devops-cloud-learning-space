# System Architecture

## Overview

```mermaid
flowchart LR
  Browser -->|HTTP| Next["Next.js 16 app (RSC + server actions)"]
  Next -->|/api/auth/*| BetterAuth[Better Auth]
  BetterAuth --> PG[(PostgreSQL)]
  BetterAuth -->|SMTP magic link| Mail[Mailpit / SMTP]
  BetterAuth -->|OAuth| GitHub
  Next -->|Drizzle| PG
  Next -->|import| Content["Content modules (TS meta + MDX + SVG diagrams)"]
```

Single Next.js application. Content is **compiled into the app** (MDX via `@next/mdx`); only user data lives in the database.

## Layers

| Layer | Location | Notes |
|---|---|---|
| Routes / pages | `src/app` | Server components; per-request session lookup → dynamic rendering |
| Server actions | `src/app/actions/learning-progress-actions.ts` | Auth check, zod validation, registry validation, DB write, `revalidatePath` |
| Auth | `src/lib/auth` | Better Auth + Drizzle adapter; plugins: `magicLink`, `nextCookies`; GitHub provider enabled only if env set |
| Progress domain | `src/lib/progress` | Pure functions (grader, calculator, heatmap, item keys) + `learning-progress-repository.ts` (DB) + `user-progress-snapshot.ts` (composition) |
| Content | `src/content` | `course-registry.ts` (courses + phases), `curriculum-registry.ts` (modules), lookup helpers, validator |
| UI kit | `src/components` | Lesson MDX components, diagram kit, progress widgets |
| DB | `src/db` | Drizzle schema: Better Auth tables + `progress_item`, `quiz_attempt` |

## Content model (multi-course)

```
Course (course-registry.ts) ─┬─ Phase (devops-course-phases.ts, system-design-course-phases.ts; phase.courseId)
                             └─ Module (modules/<slug>/module-meta.ts; module.phaseId → phase → course)
```

- A module's course is **derived from its phase** — module meta files carry no `courseId`.
- Module `id` (`m01`, `sd01`) and `slug` are **unique across all courses**; `order` is unique within a course. Enforced by `curriculum-registry.test.ts`.
- Routes: `/` course picker · `/courses/[courseSlug]` roadmap · `/modules/[moduleSlug]/…` (course-agnostic) · `/roadmap` 308 → `/courses/devops-cloud` (`next.config.ts`).

## Data model

- `user`, `session`, `account`, `verification` — Better Auth core tables.
- `progress_item (user_id, item_key, completed_at)` — PK `(user_id, item_key)`. `item_key` = `<moduleId>:lesson:<slug>` or `<moduleId>:lab:<id>`. Presence = done.
- `quiz_attempt (id, user_id, module_id, score, total, answers jsonb, created_at)` — every attempt kept; best score drives completion.

No course column anywhere: globally unique module ids make progress rows unambiguous, so adding a course needs no migration.

Module complete ⇔ all lessons ✓ + all labs ✓ + best quiz ≥ 80%. Module % counts lessons, labs and quiz as equal units; course % averages that course's modules (`summarizeCourseProgress`). Dashboard "continue" banner picks the most recently active unfinished course (`continue-course-picker.ts`).

## Key flows

**Mark lesson/lab done** — client checkbox (optimistic via `useOptimistic`) → `toggleProgressItemAction` → session required → key must exist in registry (rejects forged keys) → upsert/delete → revalidate.

**Quiz** — quiz page sends questions **without** answers/explanations (`toPublicQuizQuestions`) → learner submits indices → `submitQuizAction` grades with server-side answer key → stores attempt → returns per-question results + explanations.

**Lesson rendering** — `/modules/[moduleSlug]/lessons/[lessonSlug]` validates slugs against registry, then calls the module's loader in `src/content/lesson-content-loaders.ts` (one scoped dynamic import per registered module, so an unregistered in-progress module can't break the bundle). Global MDX components come from `src/mdx-components.tsx`; diagrams are client components imported inside each MDX file.

**Theme** — class-based dark mode (`.dark` on `<html>`), `next/script` `beforeInteractive` applies saved/system theme before paint; code blocks use rehype-pretty-code dual themes.

## Quality gates

- `pnpm validate:module <slug>` — content rules + MDX compile per module
- `src/content/curriculum-registry.test.ts` — courses/phases/modules consistent, ids/slugs globally unique, orders unique per course, every module has a loader and passes the validator
- Unit tests for grading, progress math, course summary, continue-course picker, item keys, heatmap
- `pnpm lint`, `pnpm typecheck` (runs `next typegen` for `PageProps`/`LayoutProps`), `pnpm build`

## Local infrastructure

`docker-compose.yml`: `postgres:17-alpine` on host port 5433 (volume `postgres-data`), `axllent/mailpit` SMTP 1025 / UI 8025.

## Production

Vercel (functions pinned to `sin1` via `vercel.json`) + Neon Postgres (Singapore) through Neon's HTTP driver when `VERCEL` is set (`src/db/database-client.ts`), Resend SMTP for magic links. See `docs/deployment-guide.md`.
