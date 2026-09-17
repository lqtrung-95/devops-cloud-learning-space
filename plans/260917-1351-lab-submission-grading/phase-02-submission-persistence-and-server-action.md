# Phase 02 — DB table, repository, server action

**Priority:** P1 · **Status:** completed · **Effort:** 1.5h · **Depends on:** 01 · **Blocks:** 03, 04

## Context links
- Precedent: `quizAttempt` table (`src/db/learning-progress-schema.ts:22-36`) + `insertQuizAttempt` (`src/lib/progress/learning-progress-repository.ts:21-23`) + `submitQuizAction` (`src/app/actions/learning-progress-actions.ts:38-64`)
- `docs/system-architecture.md` → "Data model", "Key flows"

## Overview
Store every submission (history, like quiz attempts), grade it server-side, and on a full pass write the **existing** `progress_item` row so nothing downstream changes.

## Key insights (verified)
1. **`quizAttempt` is the precedent to copy**, not invent around: `serial` PK, `userId` FK cascade, `moduleId` text, jsonb payload, `createdAt`, one composite index (`src/db/learning-progress-schema.ts:22-36`). Same shape here.
2. **Completion stays in `progress_item`.** `calculateModuleProgress` counts labs via `completedKeys.has(labItemKey(...))` (`src/lib/progress/module-progress-calculator.ts:24`), and `firstUnfinishedLab` on the module page uses the same set (`src/app/modules/[moduleSlug]/page.tsx:34`). Writing `progress_item` on pass means **zero edits** to the calculator, snapshot, dashboard, course summary, or their tests.
3. **`toggleProgressItemAction` is a grading bypass.** It accepts any registry-known key (`src/app/actions/learning-progress-actions.ts:20`), and `m04:lab:trivy-scan-fix` is registry-known (`src/content/curriculum-lookup.ts:77`). Without a guard, a learner can still tick a graded lab from the network tab. Must be closed in this phase.
4. **No migration files exist.** `drizzle.config.ts:6` points `out: "./drizzle"` but that directory is absent; README documents `pnpm db:push`. So there is no migration to order against the parallel flashcard plan — only the shared `src/db/schema.ts` barrel.
5. Neon HTTP driver has **no interactive transactions** (`src/db/database-client.ts:18-19`). The two writes here (insert submission, upsert progress) must therefore be sequential and independently safe — see data flow.

## Requirements
**Functional**
- `submitLabAction({ moduleSlug, labId, content })` → grade → persist submission → on pass, mark the lab complete → return per-check outcomes.
- Submission history retained per `(userId, moduleId, labId)`.
- Evidence-only labs (`checks: []`) are stored and mark the lab complete on submit.
- Labs with no `submission` spec keep the legacy toggle path untouched.

**Non-functional**
- Content capped at 10 000 chars (`LAB_SUBMISSION_MAX_LENGTH`).
- Action never leaks the matcher in its return value.
- Idempotent-ish: resubmitting is always allowed; `progress_item` upsert already uses `onConflictDoNothing` (`src/lib/progress/learning-progress-repository.ts:15`).

## Architecture

### Data flow
```
client form ─ content ─▶ submitLabAction
                          ├─ getCurrentSession()            → 401-equivalent if null
                          ├─ zod parse (moduleSlug, labId, content ≤ 10 000)
                          ├─ getModuleBySlug → find lab → lab.submission must exist
                          ├─ gradeLabSubmission(spec, content)   [pure, phase 01]
                          ├─ insertLabSubmission(...)            [write 1]
                          ├─ if (passed || !autoGraded)
                          │     setProgressItemCompleted(key, true)  [write 2]
                          ├─ revalidatePath("/", "layout")
                          └─ return { passed, autoGraded, outcomes }   ← no matchers
```
Write 1 before write 2: if write 2 fails, the learner has a stored passing submission and can resubmit to re-trigger the progress write. The reverse order would mark a lab done with no evidence row.

### Table — `src/db/lab-submission-schema.ts` (new file)
```ts
export const labSubmission = pgTable(
  "lab_submission",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull(),
    labId: text("lab_id").notNull(),
    /** Raw pasted evidence, capped by the action. Never rendered as HTML. */
    content: text("content").notNull(),
    passed: boolean("passed").notNull(),
    checkResults: jsonb("check_results").$type<LabCheckOutcome[]>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("lab_submission_user_lab_idx").on(table.userId, table.moduleId, table.labId)],
);
```
`LabCheckOutcome` is a **type-only** import from `@/lib/progress/lab-submission-grader` (that module has no `server-only` import and no DB import, so no cycle).

New file rather than appending to `learning-progress-schema.ts`: keeps that file focused and makes the barrel diff a single line, which is the only file the parallel flashcard plan also touches.

### Repository — `src/lib/progress/learning-progress-repository.ts`
```ts
insertLabSubmission(input: { userId; moduleId; labId; content; passed; checkResults })
getLabSubmissions(userId, moduleId, labId, limit = 5)   // newest first, for the history strip
getLatestLabSubmissionsForModule(userId, moduleId)      // latest row per labId, for SSR of the module page
```
`getLatestLabSubmissionsForModule` uses `DISTINCT ON (lab_id) … ORDER BY lab_id, created_at DESC` — one query for the whole labs section instead of N.

### Action — `src/app/actions/learning-progress-actions.ts`
Add `submitLabAction` next to `submitQuizAction` (same `ActionResult<T>` envelope, `:10`). Vietnamese error strings, matching the existing tone (`:17`, `:40`).

**Also harden `toggleProgressItemAction` (`:15-33`):** after key validation, parse the key with `parseItemKey` (`src/lib/progress/progress-item-keys.ts:13`); if `kind === "lab"` and that lab has `submission.checks.length > 0`, reject `completed: true` with `"Lab này cần nộp kết quả để hoàn thành."`. Allow `completed: false` (a learner resetting their own progress has no cheat value and keeps the UI honest).

### Barrel — `src/db/schema.ts`
Add `export * from "./lab-submission-schema";`. **Shared with the flashcard plan** — apply last, then `pnpm db:push` once.

## Related code files
**Create**
- `src/db/lab-submission-schema.ts`

**Modify**
- `src/db/schema.ts` (1 line — shared file, see conflict watch)
- `src/lib/progress/learning-progress-repository.ts` (+3 functions)
- `src/app/actions/learning-progress-actions.ts` (+`submitLabAction`, harden `toggleProgressItemAction`)

**Delete** — none.

## Implementation steps
1. Create `lab-submission-schema.ts`; export from `src/db/schema.ts`.
2. Check whether `plans/260917-1351-flashcard-spaced-repetition/` has already landed a schema file; if so, add both exports and `pnpm db:push` once.
3. `pnpm db:push`, then `pnpm db:studio` to confirm `lab_submission` exists with the index.
4. Add the three repository functions.
5. Add `submitLabAction`; mirror `submitQuizAction` structure (session → zod → registry lookup → grade → persist → `revalidatePath("/", "layout")`).
6. Harden `toggleProgressItemAction`.
7. Add `src/lib/progress/progress-item-keys.test.ts` coverage? Not needed — add the guard test in phase 03's manual matrix instead; the guard's logic is 3 lines against registry data.
8. `pnpm typecheck` · `pnpm lint` · `pnpm test`.

## Todo list
- [x] `lab_submission` table created and exported from the barrel
- [x] `pnpm db:push` applied locally; table + index verified (via `psql \d lab_submission`, Drizzle Studio not used)
- [x] `insertLabSubmission` / `getLabSubmissions` / `getLatestLabSubmissionsForModule` added
- [x] `submitLabAction` returns `{ passed, autoGraded, outcomes }` and never a matcher
- [x] `toggleProgressItemAction` rejects `completed: true` on auto-graded labs
- [x] typecheck / lint / test clean

## Success criteria
- A pass writes exactly one `lab_submission` row **and** one `progress_item` row; the module page's lab counter increments without any change to `module-progress-calculator.ts`.
- A fail writes a `lab_submission` row and **no** `progress_item` row.
- Calling `toggleProgressItemAction({ itemKey: "m04:lab:trivy-scan-fix", completed: true })` directly returns an error after phase 04 lands that spec.
- All existing progress tests still pass unchanged.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| Barrel edit collides with flashcard plan | High × Low | Single-line append; step 2 checks for the sibling file first and pushes once |
| Partial write (submission stored, progress not) — no transactions on Neon HTTP | Med × Low | Order writes evidence-first; resubmit re-triggers the progress write; `onConflictDoNothing` makes it idempotent |
| Unbounded submission rows per user | Med × Low | 10 000-char cap + auth gate. Deliberately no throttle: `quizAttempt` has none either, and a solo-maintained platform should not add a per-request COUNT query on speculation. If abuse appears, add `retain latest 20 per (user, lab)` cleanup — recorded here, not built |
| Stale `progress_item` row after an author tightens a spec | Low × Low | Accepted: progress is never silently revoked. Phase 05 defines the re-verification policy if it ever matters |
| `parseItemKey` guard mis-scoped and blocks non-graded labs | Med × Med | Guard keys off `submission?.checks.length > 0`, not off "lab has a submission"; evidence-only labs must stay tickable |

## Security considerations
- Auth required (`getCurrentSession`), same as every other action.
- Ownership is implicit: `userId` always comes from the session, never from input — no IDOR surface. All reads filter on `eq(labSubmission.userId, session.user.id)`.
- zod bounds: `moduleSlug` ≤ 80, `labId` ≤ 80, `content` ≤ 10 000. Reject before grading.
- Lab must be resolved **from the registry**, never trusted from the client, mirroring `submitQuizAction:43`.
- `content` is arbitrary user text (often containing tokens/paths from the learner's machine). It is stored as-is and rendered only as escaped text (phase 03). Never log it.
- The grading bypass via `toggleProgressItemAction` is the highest-value finding of this plan — closing it is what makes the whole feature real rather than decorative.

## Next steps
Phase 03 wires `submitLabAction` + `getLatestLabSubmissionsForModule` into the labs section of the module page.
