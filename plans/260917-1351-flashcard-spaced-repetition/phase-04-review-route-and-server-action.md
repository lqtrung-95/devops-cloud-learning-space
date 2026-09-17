# Phase 04 — Server action + `/review` route (flip and rate)

## Context links
- Plan: [plan.md](plan.md) · depends on [phase-02](phase-02-pure-review-core-sm2-deck-queue.md),
  [phase-03](phase-03-persistence-card-review-state.md)
- Action precedent: `src/app/actions/learning-progress-actions.ts:10-33` (`ActionResult`, session → zod → registry
  allowlist → DB → revalidate)
- Client-runner precedent: `src/app/modules/[moduleSlug]/quiz/module-quiz-runner.tsx:18-47`
  (`useState` + `useTransition` + server action)
- Page precedent: `src/app/modules/[moduleSlug]/quiz/page.tsx:15-44` (signed-out fallback block)
- UI kit: `src/components/ui/button-styles.ts:13`, `src/components/ui/inline-code-text.tsx`

## Overview
- **Priority:** P2 · blocks Phase 05
- **Status:** pending · **Effort:** 2.5h
- One server action, one route, one client component. Vietnamese copy, matches existing visual language
  (rounded-2xl cards, stone/indigo palette, emoji headings).

## Key insights
- **Do not call `revalidatePath` per rating.** Existing actions do (`learning-progress-actions.ts:31,62`) because
  they fire once. A review session fires ~20 times; revalidating the whole `"/"` layout each time would rebuild the
  dashboard repeatedly for nothing. The dashboard is already **dynamically rendered** (it awaits `getCurrentSession()`
  → `headers()` → `dashboard/page.tsx:21`), so the next navigation reads fresh data without any revalidation.
  Decision: the rating action performs **no** `revalidatePath`; document the reason in a code comment.
- Card **backs contain quiz answers** → the whole page must be behind an auth check, and the deck sent to the browser
  must be exactly the eligibility-filtered queue from Phase 03 (never `buildPilotDeck()` raw).
- Sending the whole session's cards to the client up-front (one RSC payload) keeps the interaction instant and avoids
  a fetch per flip. ~20 cards × ~400 bytes is negligible.
- Grades come back from the client as untrusted input → zod `z.union([z.literal(0), z.literal(3), z.literal(4), z.literal(5)])`.

## Requirements
**Functional**
- `/review` shows the due queue: card front → "Hiện đáp án" → back (correct option + explanation) → 4 rating buttons.
- Rating persists immediately and advances to the next card; progress indicator "Thẻ 3/12".
- End-of-session summary: số thẻ đã ôn, số thẻ "Again", CTA back to `/dashboard`.
- Empty state: "Hôm nay không có thẻ nào đến hạn 🎉" + when the next card is due.
- Signed-out: login prompt, no deck in the payload.
- Header nav gets a "Ôn tập" link when signed in.

**Non-functional**
- Keyboard: `Space`/`Enter` reveals, `1`–`4` rate. Buttons are real `<button>`s with `aria-label`s.
- Rating is optimistic-free: disable buttons while the transition is pending (same as
  `module-quiz-runner.tsx:125`), show inline error on failure and allow retry of the same card.
- No new dependency.

## Architecture / data flow
```
GET /review (RSC, dynamic)
  getCurrentSession() ── null ──► login prompt (no deck rendered)
        │ user
        ▼
  getReviewQueueSnapshot(userId)  →  { cards[], dueCount, newCount, nextDueAt }
        ▼
  <ReviewSessionRunner cards={...} />   "use client"
        │  per card: reveal → rate
        ▼
  submitCardReviewAction({ cardId, grade })   "use server"
        ├─ session required                          → 401-ish ActionResult
        ├─ zod parse { cardId: string(max 120), grade: 0|3|4|5 }
        ├─ isKnownFlashcardId(cardId)                → reject forged
        ├─ getCardReviewStates(userId).get(cardId) ?? INITIAL_SCHEDULING_STATE
        ├─ scheduleNextReview(state, grade, new Date())
        └─ upsertCardReviewState(...)                → { ok: true, data: { dueAt } }
```
`reviewedAt` is generated **server-side** (`new Date()`), never accepted from the client — otherwise a learner could
fast-forward or freeze their schedule.

Per-rating cost: 1 SELECT + 1 UPSERT. Loading all states per rating is wasteful at scale; add
`getCardReviewState(userId, cardId)` (single-row select) in the repository if not already present — cheaper and
clearer than reusing the bulk loader.

## Related code files
**Create**
- `src/app/actions/card-review-actions.ts` — `submitCardReviewAction`, reusing the exported `ActionResult` type from
  `learning-progress-actions.ts` (import it; do not redefine — DRY).
- `src/app/review/page.tsx` — RSC, `metadata: { title: "Ôn tập" }`.
- `src/app/review/loading.tsx` — mirror `src/app/dashboard/loading.tsx`.
- `src/app/review/review-session-runner.tsx` — `"use client"`, the flip-and-rate loop.

**Modify**
- `src/components/layout/site-header.tsx:20-28` — add `<Link href="/review">Ôn tập</Link>` inside the existing
  `{session && ...}` block.
- `src/lib/review/card-review-repository.ts` — add single-row `getCardReviewState(userId, cardId)`.

**File ownership:** `src/app/review/**`, `src/app/actions/card-review-actions.ts`, `site-header.tsx`, plus the one
repository function. Does not touch `dashboard/page.tsx` (Phase 05 owns it).

## Implementation steps
1. Action file: `"use server"`, zod schema, session check, `isKnownFlashcardId` guard, load-or-init state, schedule,
   upsert, try/catch with `console.error` + Vietnamese error string (copy the shape of
   `learning-progress-actions.ts:24-29`). Add the comment explaining the deliberate absence of `revalidatePath`.
2. `page.tsx`: session check (render login prompt like `quiz/page.tsx:32-41` rather than `redirect`, so the route is
   linkable) → `getReviewQueueSnapshot` → empty state or `<ReviewSessionRunner>`.
3. `review-session-runner.tsx`:
   - state: `index`, `isRevealed`, `ratedCount`, `againCount`, `error`, `isPending`.
   - reveal button; on rate → `startTransition(async () => ...)`; on `ok` advance and reset `isRevealed`; on error
     show message, stay on the card.
   - `useEffect` keyboard handler (`Space`/`Enter` reveal, `1`–`4` rate) — guard with `isPending`.
   - summary screen when `index >= cards.length`.
4. Header link.
5. Manual pass: signed out, empty queue, full session, mid-session network failure (throttle offline → error shown,
   retry works).

## Test matrix
| Layer | What | How |
|---|---|---|
| Unit | scheduler/queue/deck | already covered in Phase 02 |
| Action | forged `cardId` rejected · signed-out rejected · grade outside `{0,3,4,5}` rejected | manual dev-console invocation, recorded in Phase 06 QA checklist (no DB test harness in repo) |
| E2E manual | reveal → rate → advance · last card → summary · empty state · signed-out prompt · keyboard shortcuts | Phase 06 checklist |
| Regression | `/modules/[slug]/quiz` unchanged, `/dashboard` unchanged | manual |

## Todo list
- [ ] `submitCardReviewAction` with auth + zod + allowlist + server-side `reviewedAt`
- [ ] `getCardReviewState(userId, cardId)` added
- [ ] `/review` page + loading skeleton + empty + signed-out states
- [ ] `ReviewSessionRunner` with reveal, 4 ratings, pending/error handling, summary
- [ ] Keyboard shortcuts + aria labels
- [ ] Header "Ôn tập" link (signed-in only)
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` green

## Success criteria
- Rating a card writes exactly one row and the `due_at` matches `scheduleNextReview` expectations (checked in Studio).
- Reloading `/review` after finishing a session shows the empty state (no card re-appears same day for interval ≥ 1).
- Signed-out `/review` HTML contains **no** `explanation` text (check page source).
- A forged `cardId` returns an error and writes nothing.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| Answers leak to unauthenticated users | Low × High | Deck built after the session check; signed-out branch renders no card data; verified by source inspection in success criteria |
| Client sends a forged/foreign `cardId` | Med × Med | `isKnownFlashcardId` exact-set allowlist; `userId` always from session |
| Client manipulates `reviewedAt` to game scheduling | Low × Low | Timestamp generated server-side only |
| Per-rating `revalidatePath` causes dashboard thrash | Med × Med | Deliberately omitted; dashboard is dynamic so data stays correct |
| Learner closes the tab mid-session | High × Low | Each rating is persisted independently — no session-level state to lose |
| Rating spam / accidental double-submit | Med × Low | Buttons disabled while `isPending`; upsert is idempotent per card |

## Security considerations
- Auth check first, before any deck construction.
- zod bounds on `cardId` length (≤ 120, same as `toggleSchema` at `learning-progress-actions.ts:12`) and grade literal union.
- Errors logged server-side with `console.error`, generic Vietnamese message returned (no internals leaked) —
  matches existing action behaviour.
- No new public API route; server actions only.

## Rollback
Delete `src/app/review/`, the action file and the header link. Table and pure libs can stay (inert).

## Next steps
Phase 05 surfaces the due count on the dashboard.
