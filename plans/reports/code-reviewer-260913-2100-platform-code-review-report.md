# Platform Code Review — DevOps Cloud Learning Space

Date: 2026-09-13 · Reviewer: code-reviewer · Mode: report only (no edits)

## Scope
- Files: env, auth (server/client/email/route), db schema+client, drizzle/docker/env example, server actions, lib/progress (+tests), content registry/lookup/validator/script, all app pages + client widgets, components/**, mdx-components, layout, globals.css, next.config
- Excluded: `src/content/modules/**` (except m01 as reference)
- Checks: `pnpm typecheck` PASS · `pnpm test` PASS (4 files, 19 tests) · `pnpm lint` PASS (0 issues)
- Note: `node_modules` reads blocked by local scout hook; Better Auth behavior verified against official docs (better-auth.com) instead of source.

## Overall Assessment
Solid, small, well-structured codebase. Trust boundaries mostly right: both server actions authenticate first, scope writes to `session.user.id`, zod-validate input, and reject forged progress keys against the registry. Answer key never reaches a client bundle via imports (verified: every `"use client"` file imports only `type`s from `content-types`/`quiz-grader`, plus server-action references). No critical issues. Main risks: timezone/DST bugs in the heatmap, env defaults that silently misconfigure production, duplicate session DB lookups per request, magic-link email abuse surface, and dev Mailpit exposed on LAN.

## Critical Issues
None.

## High Priority

### H1. Heatmap day bucketing uses server timezone, not learner timezone
- `src/lib/progress/activity-heatmap-builder.ts:9-14,27-28`, `src/app/dashboard/page.tsx:24,36`
- `toDateKey` uses `getFullYear/getMonth/getDate` (server local TZ). Prod containers/Vercel run UTC; audience is Vietnamese (UTC+7, `lang="vi"`).
- Failure: learner completes a lesson at 06:00 on 2026-09-13 (ICT) = 23:00 UTC 09-12 → counted on Sept 12. Between 00:00–07:00 ICT the "today" column is yesterday; streak/active-day counts off. Tests pass only because they construct local dates.
- Fix: bucket in an explicit app timezone, e.g. `const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year:"numeric", month:"2-digit", day:"2-digit" })` → `fmt.format(date)` for keys, and derive `today`'s Y/M/D/weekday the same way. `APP_TIME_ZONE = "Asia/Ho_Chi_Minh"` (or a per-user tz cookie later). Add a test with `TZ=UTC` and an early-morning ICT timestamp.

### H2. Heatmap grid shifts to Sunday-first when window crosses DST (server in DST zone)
- `src/lib/progress/activity-heatmap-builder.ts:29`
- `firstMonday = currentMonday.getTime() - (weeks-1)*7*DAY_MS` assumes 24h days. Reproduced with `TZ=America/New_York`, today = 2026-03-31: first column starts **2026-01-11 (Sunday)**, last week ends Saturday 04-04 → Sunday 04-05 missing, labels misaligned. UTC gives correct 2026-01-12.
- Impact: any host/dev machine in a DST zone (e.g. US) for ~12 weeks after each spring-forward.
- Fix: calendar arithmetic only: `new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset - (weeks - 1) * 7)` (drop `DAY_MS`). Subsumed if H1 is done with pure Y/M/D math.

### H3. Session looked up 2x per page render (header + page), each a DB query
- `src/lib/auth/auth-server.ts:34-36`, callers `src/components/layout/site-header.tsx:8` + every page (`page.tsx:15`, `dashboard/page.tsx:20`, `login/page.tsx:10`, `modules/[moduleSlug]/page.tsx:26`, `lessons/[lessonSlug]/page.tsx:27`, `quiz/page.tsx:19`, `roadmap/page.tsx:10`)
- No `session.cookieCache` configured → each `auth.api.getSession` hits `session` (+ `user`) tables. Server actions add a 3rd lookup and `revalidatePath("/", "layout")` re-renders header+page again (another 2).
- Failure: ~4 session queries per checkbox toggle; with `max: 10` pool, modest traffic doubles auth load needlessly.
- Fix: dedupe per request with React `cache`:
  ```ts
  import { cache } from "react";
  export const getCurrentSession = cache(async () => auth.api.getSession({ headers: await headers() }));
  ```
  Optionally enable `session: { cookieCache: { enabled: true, maxAge: 300 } }` (trade-off: revocation lag up to maxAge).

### H4. Env defaults/validation let production boot misconfigured
- `src/lib/env.ts:7-8`, `.env.example:7`
- `BETTER_AUTH_URL` defaults to `http://localhost:3000`: if unset in prod, magic links in emails point to localhost and trusted-origin/CSRF checks use the wrong origin → sign-in silently broken.
- `BETTER_AUTH_SECRET: min(16)` accepts the example placeholder `replace-with-a-long-random-string` (33 chars). Copying `.env.example` to prod = publicly known signing secret → forgeable signed cookies/tokens.
- Fix: in production require `BETTER_AUTH_URL` (no default) and reject placeholder + require `min(32)`:
  ```ts
  BETTER_AUTH_SECRET: z.string().min(32).refine(v => v !== "replace-with-a-long-random-string", "set a real secret"),
  ```
  and `.superRefine` that errors when `NODE_ENV==="production"` and `BETTER_AUTH_URL` is missing/localhost.

## Medium Priority

### M1. Magic-link endpoint = email-bombing / SMTP-cost vector; rate limit weak
- `src/lib/auth/auth-server.ts:12-29`
- Better Auth rate limit is **off in dev**, and in prod defaults to 100 req/60s per IP, in-memory, IP from `x-forwarded-for` (docs). Special strict rule documented only for `/sign-in/email`, not `/sign-in/magic-link`. Sign-up is open (`disableSignUp` false) so any address can be targeted.
- Failure: script POSTs `/api/auth/sign-in/magic-link` for a victim email 100x/min per IP (more by spoofing XFF if origin reachable directly, or across instances since memory store is per-process) → victim inbox flooded, SMTP provider suspends account.
- Fix: `rateLimit: { enabled: true, storage: "database" /* or secondary storage */, customRules: { "/sign-in/magic-link": { window: 60, max: 3 } } }`; configure `advanced.ipAddress.ipAddressHeaders` for the real proxy; consider per-email throttle inside `sendMagicLink`.

### M2. Magic-link tokens stored plaintext
- `src/lib/auth/auth-server.ts:20` — `storeToken` defaults to `"plain"` (docs). A DB read (backup leak, SQL access, `db:studio` screen share) yields live sign-in tokens for 10 min → account takeover.
- Fix: `magicLink({ storeToken: "hashed", ... })`.

### M3. Mailpit and Postgres published on all interfaces
- `docker-compose.yml:11,24-25`
- `"8025:8025"` binds 0.0.0.0: anyone on same Wi-Fi (campus/café) opens `http://<laptop-ip>:8025` and reads every magic link → logs in as any local user. Postgres `devops/devops` on `0.0.0.0:5433` similarly reachable. `mailpit:latest` unpinned.
- Fix: `"127.0.0.1:8025:8025"`, `"127.0.0.1:1025:1025"`, `"127.0.0.1:5433:5432"`; pin mailpit tag.

### M4. Expired/invalid magic link lands user on /login with no explanation
- `src/app/login/magic-link-login-form.tsx:21`, `src/app/login/page.tsx`
- No `errorCallbackURL`; on bad token Better Auth redirects to callbackURL (`/dashboard?error=...`) → dashboard redirects to `/login` and the `error` query is dropped. User clicks an expired link and just sees the login form again.
- Fix: pass `errorCallbackURL: "/login"` and render a message from `searchParams.error` (`await props.searchParams` in LoginPage).

### M5. Quiz "answer key never leaves the server" is only true before first submit
- `src/lib/progress/quiz-grader.ts:26`, `src/app/actions/learning-progress-actions.ts:35,48-63`
- Action returns `correctIndex` for every question, and the schema accepts `-1` (unanswered) even though UI requires all answered. One POST with all `-1` reveals full key; resubmit → 100% → module `isComplete`. Unlimited attempts, no throttling.
- Impact: self-paced learning app, so low stakes; flagging because completion metrics/dashboard trust this. Decide intentionally.
- Options: return `correctIndex` only when `isCorrect` or only after passing; or require `min(0)` for submitted answers server-side; optional per-user attempt throttle.

### M6. Unchecking then rechecking rewrites activity history
- `src/lib/progress/learning-progress-repository.ts:13-18`
- Delete-on-uncheck + insert-on-check resets `completedAt` to now → heatmap loses the original day and moves activity to today. Accidental uncheck erases a past streak day.
- Fix (if history matters): keep row with `completedAt` + nullable `uncompletedAt`/`isCompleted` flag, or log activity to a separate append-only table. Otherwise document as intended.

## Low Priority

- L1. `src/lib/auth/send-magic-link-email.ts:23` — `url` interpolated raw into HTML `href`. Better Auth validates `callbackURL` (rejects `//`, backslashes, control chars; docs) and callbackURL here is hard-coded, so not exploitable today; escape `&"<>` anyway for defense in depth (unable to confirm encoding in source due to hook block).
- L2. `src/content/curriculum-lookup.ts:40-51` — `isKnownProgressItemKey` rebuilds the full key Set on every call; hoist to a module-level lazily-built constant.
- L3. `src/app/dashboard/page.tsx:134` — hard-coded `80`; use `QUIZ_PASS_PERCENT`. `:132` key `createdAt.toISOString()` — select and key by `quizAttempt.id`.
- L4. `src/app/modules/[moduleSlug]/lessons/[lessonSlug]/page.tsx:25-28` — MDX import, session, and progress awaited sequentially; `Promise.all([import(...), getCurrentSession()])` cuts latency. Also every toggle's `revalidatePath("/", "layout")` re-renders the whole lesson (MDX + queries) before `router.push` — acceptable, but `revalidatePath` of only the affected routes or relying on push would halve work.
- L5. `lesson-completion-footer.tsx:28-39`, `module-quiz-runner.tsx:43-46` — `error` never cleared on retry/success path; stale error text persists.
- L6. Dynamic MDX import template `@/content/modules/${slug}/lessons/${slug}.mdx` is safe (slugs whitelisted by registry, verified `getLessonContext`), but bundler context includes **all** `.mdx` under modules — a half-written/unregistered module with an MDX compile error breaks `next build` even though it is not routable.
- L7. `drizzle.config.ts` / no `drizzle/` folder — schema only applied via `db:push`; no migration history for prod. Fine for now; switch to `generate`+`migrate` before first deploy.
- L8. `src/lib/env.ts` throws at import; `next build` page-data collection imports it → CI builds need full env. Informational.
- L9. Sessions refreshed only where cookies can be set (route handler/server actions via `nextCookies`); RSC-only browsing cannot refresh cookie — users may be logged out ~7 days after sign-in despite activity. Low confidence; verify with a long-lived session test.

## Accessibility
- A1. `module-quiz-runner.tsx:81-108` — legend is only "Câu N"; question text not in legend, options are `aria-pressed` toggle buttons. Use radio semantics (`role="radiogroup"`/`role="radio"` + `aria-checked`, or native `<input type="radio">`), put question text in `<legend>`. Result banner appears via `scrollTo` with no focus move/`aria-live`; add `role="status"` or focus the heading.
- A2. `user-account-menu.tsx:26-53` — no Escape / outside-click close, no `aria-haspopup`/`aria-controls`; focus not moved into menu.
- A3. `activity-heatmap-grid.tsx:14-35` — cells are `title`-only spans, invisible to screen readers and keyboard. Wrap in `role="img"` with `aria-label` summary (e.g. "N ngày học trong 12 tuần") or sr-only table.
- A4. `progress-item-checkbox.tsx:41` — `disabled={isPending}` drops keyboard focus after activation in some browsers; prefer `aria-disabled` + guard in handler. Error text not linked (`aria-describedby`) or live.
- A5. `quick-check-question.tsx` — result feedback not announced (`aria-live` missing).

## Edge Cases Found by Scout
- Heatmap TZ + DST (H1, H2) — DST reproduced via `TZ=America/New_York tsx`.
- Quiz reorder between page load and submit (content deploy) grades by index against new order; stored `answers` history becomes meaningless. Consider storing `{questionId: selectedIndex}`.
- Access via `127.0.0.1` / LAN IP instead of `BETTER_AUTH_URL` origin → Better Auth origin check rejects auth requests (add dev `trustedOrigins` if needed).
- Removed lessons/labs: stale progress keys ignored by calculator (verified `module-progress-calculator.ts:23-24`) — OK.
- Quiz length validated equal to module quiz length (action `:44`) — OK.

## Positive Observations
- Auth-first then validate in both actions; user id only from session; forged keys rejected against registry.
- Answer key isolation via `PublicQuizQuestion` + `toPublicQuizQuestions`; no client file imports registry/module-meta (grep-verified).
- `server-only` on env, db, auth-server, repository.
- `nextCookies()` last in plugins — correct. Callback URL hard-coded relative (no open redirect).
- Next 16 conventions correct: async `params`, global `PageProps`/`LayoutProps`, `notFound()` narrowing; `useOptimistic` updates invoked inside `startTransition`; `useSyncExternalStore` with server snapshot avoids theme hydration mismatch.
- Error messages to client are generic; DB errors only logged server-side.
- Composite PK on `progress_item`, index on `quiz_attempt(user_id, module_id)` cover all user-scoped queries; no N+1.

## Recommended Actions
1. H1+H2: timezone-explicit, calendar-math heatmap + TZ tests.
2. H4: harden env validation (secret placeholder, required prod URL).
3. H3: `cache()` wrap `getCurrentSession`.
4. M1–M3: magic-link rate limit + hashed tokens; bind docker ports to 127.0.0.1.
5. M4: `errorCallbackURL` + login error message.
6. Decide M5/M6 semantics (quiz key reveal, activity history).
7. A1–A3 a11y fixes.

## Metrics
- Type Coverage: strict tsc clean (no errors)
- Test Coverage: pure logic covered (grader, calculator, keys, heatmap, registry); no tests for actions/repository/TZ
- Linting Issues: 0

## Unresolved Questions
- Deployment target timezone and whether learners are all ICT (decides fixed app TZ vs per-user tz).
- Is quiz answer reveal on failed attempts an intentional pedagogy choice (M5)?
- Should unchecking a lesson erase its activity day (M6)?
- Better Auth magic-link URL encoding (L1) and RSC session refresh (L9) not source-verified — `node_modules` access blocked by hook.
