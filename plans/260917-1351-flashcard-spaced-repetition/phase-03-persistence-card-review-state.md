# Phase 03 — Persistence: `card_review_state` table + repository + snapshot

## Context links
- Plan: [plan.md](plan.md) · depends on [phase-02](phase-02-pure-review-core-sm2-deck-queue.md)
- Schema precedent: `src/db/learning-progress-schema.ts:9-36` (`progress_item` composite PK, `quiz_attempt` index)
- Barrel: `src/db/schema.ts:1-2` · Client: `src/db/database-client.ts:12-33`
- Repository precedent: `src/lib/progress/learning-progress-repository.ts`
- Snapshot precedent: `src/lib/progress/user-progress-snapshot.ts`

## Overview
- **Priority:** P2 · blocks Phases 04–05
- **Status:** pending · **Effort:** 1h
- One additive table + a thin repository + one composition function used by both `/review` and the dashboard.

## Key insights
- **No interactive transactions available in prod.** `database-client.ts:17-19` states the Neon HTTP driver is used
  on Vercel precisely because the app has no multi-statement `db.transaction()`. Every write here must therefore be a
  **single statement** — one `insert ... onConflictDoUpdate` per rating. Do not introduce a read-then-write
  transaction.
- Ease factor stored as **`integer` basis points (×100, default 250)**. Drizzle maps `numeric` to a JS *string* and
  `real` is float4 — both are foot-guns across two different drivers. Integer is exact and driver-identical.
- `quiz_attempt` denormalizes `module_id` for cheap per-module queries (`:29,35`). Same move here: store `module_id`
  so per-module/per-course review counts never need to parse `card_id` in SQL.
- The repo has **no DB integration test harness** (`vitest.config.mts` → `environment: "node"`, no test database,
  every existing `*.test.ts` is pure). Repository code is therefore covered by manual QA in Phase 06, not by unit
  tests — keep it dumb so there is nothing to test.

## Requirements
**Functional**
- Persist per-(user, card): ease factor, interval days, repetitions, lapses, due at, last reviewed at.
- Load all of a user's states in one query.
- Upsert one card's state in one statement.
- `getReviewQueueSnapshot(userId)` composes deck + states + eligibility into a `ReviewQueue`.

**Non-functional**
- `on delete cascade` from `user` (matches `progress_item:12-14`).
- Indexed lookup by `(user_id, due_at)`.
- Additive only: no change to existing tables, no data backfill.

## Architecture / data flow
```
/review page  ─┐
dashboard     ─┴─► getReviewQueueSnapshot(userId)  [server-only]
                        ├─► buildPilotDeck()                        (Phase 02, pure)
                        ├─► getCardReviewStates(userId)             (1 SELECT)
                        ├─► getBestQuizPercentByModule(userId)      (existing, 1 SELECT — supplies eligibility)
                        └─► buildReviewQueue(...)                   (Phase 02, pure)

submitCardReviewAction (Phase 04) ─► upsertCardReviewState(...)  (1 INSERT ... ON CONFLICT DO UPDATE)
```

### Table
```ts
// src/db/spaced-repetition-schema.ts
export const cardReviewState = pgTable(
  "card_review_state",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id").notNull(),              // "<moduleId>:card:<questionId>"
    moduleId: text("module_id").notNull(),          // denormalized for per-module counts
    easeFactorBasisPoints: integer("ease_factor_basis_points").notNull().default(250), // 2.50
    intervalDays: integer("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: timestamp("due_at").notNull(),
    lastReviewedAt: timestamp("last_reviewed_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.cardId] }),
    index("card_review_state_user_due_idx").on(table.userId, table.dueAt),
  ],
);
```
No `course_id` column — module ids are globally unique, same rationale as `docs/system-architecture.md`
"No course column anywhere".

## Related code files
**Create**
- `src/db/spaced-repetition-schema.ts` (table above).
- `src/lib/review/card-review-repository.ts` — `"server-only"`, `getCardReviewStates(userId)`,
  `upsertCardReviewState(input)`.
- `src/lib/review/review-queue-snapshot.ts` — `"server-only"`, `getReviewQueueSnapshot(userId)`.

**Modify**
- `src/db/schema.ts` — add `export * from "./spaced-repetition-schema";` (one line; **only** this phase edits it).

**File ownership:** `src/db/**` + the 2 new files in `src/lib/review/`. Phase 02's files are not touched.

## Implementation steps
1. Create `src/db/spaced-repetition-schema.ts` as above; import `user` from `./auth-schema`.
2. Add the export line to `src/db/schema.ts`.
3. **Before pushing schema:** `git pull` and check for a committed `drizzle/` directory from the parallel
   lab-submission plan (see plan.md → Cross-plan note). If absent → `pnpm db:push`. If present → `pnpm db:generate`
   then `pnpm db:migrate`, and make sure the generated migration only creates `card_review_state`.
4. Verify in `pnpm db:studio`: table, composite PK, index, FK cascade.
5. `card-review-repository.ts`:
   - `getCardReviewStates(userId)` → `select().from(cardReviewState).where(eq(userId))` → `Map<cardId, CardSchedulingState>`
     converting `easeFactorBasisPoints / 100` → `easeFactor`.
   - `upsertCardReviewState({ userId, cardId, moduleId, state })` → single
     `db.insert(cardReviewState).values({...}).onConflictDoUpdate({ target: [cardReviewState.userId, cardReviewState.cardId], set: {...} })`
     with `easeFactorBasisPoints: Math.round(state.easeFactor * 100)` and `lastReviewedAt` set explicitly (not
     `defaultNow()`, so the value matches the `reviewedAt` the scheduler used).
6. `review-queue-snapshot.ts`: `Promise.all([getCardReviewStates, getBestQuizPercentByModule])` →
   `eligibleModuleIds = new Set(bestQuizByModule.keys())` → `buildReviewQueue(buildPilotDeck(), states, eligibleModuleIds, new Date())`.
   Null/absent user → empty queue (mirrors `user-progress-snapshot.ts:13-16`).

## Todo list
- [ ] `spaced-repetition-schema.ts` created, exported from `schema.ts`
- [ ] Migration-conflict check done, schema applied, verified in Studio
- [ ] `card-review-repository.ts` (2 functions, single-statement upsert)
- [ ] `review-queue-snapshot.ts`
- [ ] `pnpm typecheck` + `pnpm lint` green
- [ ] Manual: insert a row via Studio, confirm `getReviewQueueSnapshot` reflects it

## Success criteria
- `card_review_state` exists locally with PK `(user_id, card_id)` and `card_review_state_user_due_idx`.
- Deleting a user in Studio cascades their review rows away.
- `getReviewQueueSnapshot(userId)` returns a queue whose `dueCount` matches a hand-written SQL
  `count(*) where due_at <= now()`.
- Zero rows written to any pre-existing table by this phase.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| `db:push` clobbers/conflicts with the parallel lab-submission schema change | Med × High | Explicit pre-push check in step 3; both features are additive tables so worst case is a re-generate |
| Read-modify-write race across two tabs → a rating lost | Low × Low | Single-user data, last-write-wins is acceptable; documented, not mitigated (a transaction is impossible on neon-http) |
| EF float ↔ integer round-trip drift | Low × Med | `Math.round(ef * 100)` on write, `/100` on read; asserted in Phase 06 manual QA (rate a card 3×, compare Studio value to expected) |
| Snapshot loads every state row per dashboard render | Low × Low | Indexed single query; ≤30 rows pilot, ≤464 at full rollout |

## Security considerations
- Every query filtered by `userId` from the server session — never from a request parameter.
- `card_id` written to the DB must already have passed `isKnownFlashcardId` in the action layer (Phase 04); the
  repository does not validate and must never be called with client input directly.
- FK cascade guarantees account deletion removes review history (no orphan learning data).

## Rollback
`drop table card_review_state;` + revert the export line + delete the 3 files. No other table touched.

## Next steps
Phase 04 wires the action and UI.
