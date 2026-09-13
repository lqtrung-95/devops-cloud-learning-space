# Phase 01 — Scaffold, infra, DB, auth

**Priority:** P0 · **Status:** pending

## Requirements
- `docker compose up -d` → Postgres 17 + Mailpit (SMTP 1025, UI 8025)
- Next.js 16 app at repo root (`src/`), Tailwind v4, Be Vietnam Pro + JetBrains Mono fonts
- Drizzle schema: Better Auth tables (user, session, account, verification) + `progress_item` + `quiz_attempt`
- Better Auth: magic link (nodemailer → Mailpit), GitHub OAuth enabled only when env present
- Env validated with zod (`src/lib/env.ts`); `.env.example` committed

## Data model
- `progress_item(user_id, item_key, completed_at)` PK(user_id,item_key); item_key = `m01:lesson:<slug>` | `m01:lab:<id>`
- `quiz_attempt(id, user_id, module_id, score, total, answers jsonb, created_at)`

## Files
- `docker-compose.yml`, `.env.example`, `drizzle.config.ts`
- `src/db/{client,auth-schema,progress-schema,index}.ts`
- `src/lib/auth/{auth-server,auth-client,send-magic-link-email}.ts`
- `src/app/api/auth/[...all]/route.ts`

## Success criteria
- `pnpm db:push` creates tables; magic link email visible in Mailpit; login creates session
- `pnpm build` passes

## Risks
- Better Auth / Next 16 API drift → verify against installed package docs before coding
