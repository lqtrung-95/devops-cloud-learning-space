# Phase 05 — Dashboard integration ("đến hạn ôn tập" CTA)

## Context links
- Plan: [plan.md](plan.md) · depends on [phase-03](phase-03-persistence-card-review-state.md),
  [phase-04](phase-04-review-route-and-server-action.md)
- `src/app/dashboard/page.tsx:27-32` (parallel data loads), `:55-60` (stat cards), `:79-94` (continue banner)
- `src/components/progress/course-progress-section.tsx` (section card styling)
- `src/lib/progress/continue-course-picker.ts:12-22` (banner-selection precedent)

## Overview
- **Priority:** P2
- **Status:** pending · **Effort:** 1h
- Make the review loop discoverable: a due-count stat and a CTA banner. Without this, `/review` is a dead route.

## Key insights
- The dashboard already fans out 4 queries with `Promise.all` (`dashboard/page.tsx:27-32`). Add
  `getReviewQueueSnapshot(userId)` as a 5th member — no extra round-trip latency (it is 2 queries in parallel
  internally, one of which — `getBestQuizPercentByModule` — is *already* being run by `getUserProgressSnapshot`
  (`user-progress-snapshot.ts:14-16`)).
  **Consequence to handle:** naively adding the snapshot duplicates that query on every dashboard render. Fix:
  `getReviewQueueSnapshot` accepts an optional pre-computed `eligibleModuleIds`, and the dashboard derives it from
  data it already has:
  `new Set([...snapshot.moduleProgressById].filter(([, p]) => p.bestQuizPercent !== null).map(([id]) => id))`.
  Verified against `module-progress-calculator.ts:10,22` — `bestQuizPercent` is `null` exactly when the module has no
  quiz attempt. Zero duplicate queries.
- The existing "continue learning" banner is the prime slot. Two competing banners would be noise → render the review
  CTA as a **compact bar above** the continue banner only when `dueCount > 0`, else nothing.
- Stat cards are a 4-up grid (`:67`). Adding a 5th breaks the `lg:grid-cols-4` rhythm → replace the least useful stat
  or switch to `lg:grid-cols-5`. Decision: **`lg:grid-cols-5`** — keeps all existing information (do not silently
  drop a stat the learner already relies on).

## Requirements
**Functional**
- Stat card: "🔁 Thẻ đến hạn" = `dueCount` (+ `newCount` as sub-text when > 0).
- CTA bar above the continue banner when `dueCount > 0`: "Bạn có N thẻ đến hạn ôn tập" → `Ôn ngay →` → `/review`.
- Zero due + nothing scheduled yet → no bar (no empty-state nag).

**Non-functional**
- No additional DB round-trip versus today's dashboard.
- Dashboard must still render for a brand-new user (empty queue, no crash).

## Architecture / data flow
```
DashboardPage (RSC)
  Promise.all([ getUserProgressSnapshot, getRecentQuizAttempts, getActivityDates, getLatestCompletedItem ])
        │
        ├─ eligibleModuleIds ← snapshot.moduleProgressById where bestQuizPercent !== null
        └─ getReviewQueueSnapshot(userId, { eligibleModuleIds })   ← 1 SELECT (states only)
                 └─► { dueCount, newCount, nextDueAt }  →  stat card + CTA bar
```

## Related code files
**Modify**
- `src/app/dashboard/page.tsx` — load the snapshot, add the stat, render the CTA bar, `lg:grid-cols-5`.
- `src/lib/review/review-queue-snapshot.ts` — optional `{ eligibleModuleIds }` override param (defaults to loading
  it itself, so `/review` keeps calling it with one argument).

**Create**
- `src/components/progress/review-due-banner.tsx` — presentational only (props: `dueCount`, `newCount`), consistent
  with the other components in `src/components/progress/` being dumb renderers.

**File ownership:** `dashboard/page.tsx`, the new component, and the snapshot signature. Phase 04's files untouched.

## Implementation steps
1. Extend `getReviewQueueSnapshot(userId, options?: { eligibleModuleIds?: ReadonlySet<string> })`.
2. In `dashboard/page.tsx`, derive `eligibleModuleIds` from `snapshot.moduleProgressById` **after** the existing
   `Promise.all`, then `await getReviewQueueSnapshot(userId, { eligibleModuleIds })`.
   (Sequential by necessity — it depends on the snapshot. One extra fast indexed query; acceptable.)
3. Add the stat card object to the `stats` array (`:55-60`) and change the grid to `lg:grid-cols-5`.
4. Render `<ReviewDueBanner>` above the continue banner block (`:79`), only when `dueCount > 0`.
5. Visual check in light + dark mode, mobile width.

## Todo list
- [ ] Snapshot accepts pre-computed eligibility (no duplicate quiz query)
- [ ] Stat card + `lg:grid-cols-5`
- [ ] `ReviewDueBanner` component + conditional render
- [ ] New-user dashboard renders (0 due, no bar)
- [ ] Light/dark + mobile check
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` green

## Success criteria
- Dashboard query count is unchanged + exactly 1 (verify by counting `db.select` calls on the path, or Postgres
  `log_statement=all` locally).
- With a card due, the bar links to `/review` and the count matches what `/review` then shows.
- With nothing due, the dashboard is visually identical to today except the 5th stat reading 0.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| Duplicate `getBestQuizPercentByModule` query per render | Med × Low | Eligibility derived from the already-loaded snapshot (verified at `module-progress-calculator.ts:22`) |
| 5-up stat grid looks cramped on tablet | Med × Low | `sm:grid-cols-2 lg:grid-cols-5`; visual check in the todo list |
| Two banners compete for attention | Med × Low | Review bar is compact and only shown when `dueCount > 0` |
| Dashboard crashes for users with no review rows | Low × High | Snapshot returns an empty queue for missing rows; explicitly exercised by the new-user check |

## Security considerations
- Counts derive from the session user only; nothing new is exposed. The banner shows a **count**, never card content.

## Rollback
Revert `dashboard/page.tsx` and delete the banner component. `/review` remains reachable via the header link.

## Next steps
Phase 06 verifies and documents.
