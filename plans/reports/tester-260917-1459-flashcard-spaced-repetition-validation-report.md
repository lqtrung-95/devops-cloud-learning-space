# Flashcard Spaced-Repetition (SM-2) — Deep Validation Report

Plan: `plans/260917-1351-flashcard-spaced-repetition/plan.md`, phases 01-06  
Implementer report: `fullstack-developer-260917-1441-flashcard-spaced-repetition-implementation-report.md`  
Date: 2026-09-17

## Scope

Validation performed beyond re-running the same test suite. Focus: security, correctness, design verification, boundary-case testing.

## Validation Results

### 1. SM-2 Algorithm Correctness ✅ PASS

**Existing tests:** 9 tests in `spaced-repetition-scheduler.test.ts` — all pass  
**New boundary-case tests added:** 7 tests for edge cases:
- `ease factor floor 1.3 is enforced even at exactly 1.3` — verifies EF never drops below 1.3 after 50+ Again reviews
- `interval exactly hits 180-day cap and does not exceed` — verifies MAX_INTERVAL_DAYS=180 is enforced over 25 consecutive reviews
- `review after lapse resets repetitions and interval but preserves lapses` — verifies Again (q=0) resets reps→0, interval→1, lapses+=1, and sequence restarts correctly
- `SM-2 ease factor formula applies correctly for grade=3 (Hard)` — verifies EF' = EF + (0.1 - 2 * 0.12) = EF - 0.14
- `SM-2 ease factor formula applies correctly for grade=5 (Easy)` — verifies EF' = EF + 0.1
- `dueAt timestamp is exact (reviewedAt + interval_days milliseconds)` — verifies due date arithmetic
- `no state field is undefined after scheduling` — guards against NaN/undefined propagation

**Result:** All 146 tests pass (139 original + 7 new). SM-2 implementation matches canonical spec:
- EF floor: 1.3 enforced ✅
- EF formula: `0.1 - (5-q)*(0.08 + (5-q)*0.02)` applied ✅
- Interval progression: 1 day → 6 days → `round(6 × EF)` ✅
- Again resets: repetitions→0, interval→1, lapses+=1 ✅
- MAX_INTERVAL_DAYS cap: 180 days enforced ✅
- dueAt calculation: `reviewedAt + intervalDays` via timestamp arithmetic ✅

**Files verified:**
- `src/lib/review/spaced-repetition-scheduler.ts` — implementation
- `src/lib/review/spaced-repetition-scheduler.test.ts` — test coverage

---

### 2. Card-ID Forgery Protection ✅ PASS

**Threat model:** Forged card IDs could:
1. Mark a lesson/lab complete if card keys were accepted by `isKnownProgressItemKey`
2. Submit ratings for non-existent cards if not validated server-side

**Verification:**

**Namespace separation — verified distinct patterns:**
- Card keys: `<moduleId>:card:<questionId>` (e.g., `m01:card:linux-fundamentals`)
- Lesson keys: `<moduleId>:lesson:<slug>` (e.g., `m01:lesson:linux-filesystem`)
- Lab keys: `<moduleId>:lab:<labId>` (e.g., `m01:lab:sh-scripting`)

**Progress key allowlist — verified does NOT include card keys:**
- `getAllProgressItemKeys()` in `curriculum-lookup.ts` iterates modules, adds only `lessonItemKey()` and `labItemKey()` — no card keys
- `isKnownProgressItemKey(cardId)` checks this set — `m01:card:x` returns false ✅
- `parseItemKey()` regex `/^([a-z0-9]+):(lesson|lab):([a-z0-9-]+)$/` only matches lesson/lab — rejects `m01:card:x` ✅

**Server-side card validation — verified:**
- `card-review-actions.ts` line 29: `isKnownFlashcardId(parsed.data.cardId)` rejects unknown cards before scheduling
- `isKnownFlashcardId()` checks against memoized allowlist built from pilot modules only
- `getFlashcardById()` verifies card exists and contains no extra fields

**Anti-forgery test coverage — verified in `flashcard-deck-builder.test.ts`:**
- Rejects progress-item-shaped keys: `isKnownFlashcardId("m01:lesson:x")` → false ✅
- Rejects non-pilot modules: `isKnownFlashcardId("m99:card:x")` → false ✅
- Rejects empty strings: `isKnownFlashcardId("")` → false ✅
- Rejects path traversal: `isKnownFlashcardId("m01:card:../../etc")` → false ✅

**Result:** Card-ID forgery protection is sound. Card keys cannot bypass progress tracking, and only known pilot cards are accepted for review.

**Files verified:**
- `src/lib/review/flashcard-card-keys.ts` — namespace definition + parsing
- `src/lib/review/flashcard-deck-builder.ts` — allowlist building + validation functions
- `src/lib/progress/progress-item-keys.ts` — confirms no card key handling
- `src/content/curriculum-lookup.ts` — confirms card keys absent from progress allowlist
- Tests in `src/lib/review/flashcard-deck-builder.test.ts`

---

### 3. Eligibility Gate Enforcement ✅ PASS

**Design requirement:** Cards only enter review queue after module's quiz has been attempted (to avoid spoiling the quiz).

**Verification:**

**Gate logic — traced execution path:**
1. `getReviewQueueSnapshot(userId)` calls `getBestQuizPercentByModule(userId)`
2. `getBestQuizPercentByModule()` queries `quiz_attempt` table grouped by `module_id`
   - Returns only modules with at least one quiz attempt row
   - Returns empty map if user has zero quiz attempts
3. `buildReviewQueue(..., eligibleModuleIds, ...)` at line 31: `const eligibleDeck = deck.filter((card) => eligibleModuleIds.has(card.moduleId))`
   - Filters to only modules in eligibleModuleIds
   - Non-eligible modules → zero cards in session
4. `/review` page and dashboard both use this same flow

**Test coverage — verified in `review-queue-builder.test.ts`:**
- Line 65-70: `excludes cards from a module the learner is not eligible for`
  - Deck: [m01 card, m02 card]
  - Eligible: {m01}
  - Result: only m01 card returned ✅
  - Also verified newCount=1, dueCount=0

**Edge case — verified no cards for new user:**
- User with zero quiz attempts → `getBestQuizPercentByModule()` returns empty Map
- Empty eligible set → all cards filtered out
- Result: `{ cards: [], dueCount: 0, newCount: 0 }` ✅

**Result:** Eligibility gate is correctly enforced. Cards cannot be accessed before quiz attempt, protecting quiz integrity.

**Files verified:**
- `src/lib/review/review-queue-builder.ts` — eligibility filtering logic
- `src/lib/review/review-queue-snapshot.ts` — eligibility derivation
- `src/lib/progress/learning-progress-repository.ts` — `getBestQuizPercentByModule()`
- Tests in `src/lib/review/review-queue-builder.test.ts`

---

### 4. Auth Gate on Card Content ✅ PASS

**Threat model:** Unauthenticated user could access card answers/explanations (valuable study material).

**Verification:**

**Route-level auth — verified in `/review` (page.tsx):**
- Line 10: `const session = await getCurrentSession()`
- Line 12: `if (!session) { return login prompt }`
- No card data accessed if unauthenticated ✅
- Unauthenticated requests receive HTML with login link only, zero JSON/card data

**Action-level auth — verified in `submitCardReviewAction` (card-review-actions.ts):**
- Line 25-26: `const session = await getCurrentSession(); if (!session) return error("Bạn cần đăng nhập...")`
- Unauthenticated requests cannot submit ratings ✅
- Server-side validation (not client-side) ensures session exists

**Client-side rendering — verified in `ReviewSessionRunner` (review-session-runner.tsx):**
- Line 1: `"use client"` — client component
- Receives pre-authenticated FlashCard[] from server
- Card backs (answer + explanation) displayed only after reveal button clicked
- No mechanism to retrieve cards without going through auth-gated `/review` route

**Verified no answer leakage:**
- Card JSON structure: `{ id, moduleId, front, back: { answer, explanation } }`
- Server only passes to client after session auth
- No error messages leak card content
- No fallback paths serve cards without auth

**Result:** Auth gates prevent unauthenticated access to card content. Only authenticated users see answers/explanations.

**Files verified:**
- `src/app/review/page.tsx` — route auth check
- `src/app/actions/card-review-actions.ts` — action auth check
- `src/app/review/review-session-runner.tsx` — client rendering (post-auth)

---

### 5. Database Schema Correctness ✅ PASS

**Verification:**

**Schema definition — verified in `src/db/spaced-repetition-schema.ts`:**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `user_id` | text | NOT NULL, FK cascade → user.id | User ownership + auto-delete |
| `card_id` | text | NOT NULL, PK | Card identifier |
| `module_id` | text | NOT NULL | Denormalized for cheap per-module queries |
| `ease_factor_basis_points` | integer | NOT NULL, default 250 | EF stored as ×100 (250 = 2.50) |
| `interval_days` | integer | NOT NULL, default 0 | Days until next review |
| `repetitions` | integer | NOT NULL, default 0 | Count of successful (≥3) reviews |
| `lapses` | integer | NOT NULL, default 0 | Count of failed (0) reviews |
| `due_at` | timestamp | NOT NULL | Next review timestamp |
| `last_reviewed_at` | timestamp | NOT NULL | Audit/replay timestamp |

**Indexes:**
- PK: `(user_id, card_id)` — efficient upsert ✅
- Index: `card_review_state_user_due_idx` on `(user_id, due_at)` — efficient "due cards" queries ✅

**Foreign key:**
- `user_id` → `user.id` with `onDelete: "cascade"` — user deletion cleans up all card states ✅

**Basis-points convention — verified round-trip:**
- Storage: `Math.round(easeFactor * 100)` (e.g., 2.5 → 250)
- Retrieval: `easeFactorBasisPoints / 100` (e.g., 250 → 2.5)
- Verified: no floating-point errors across all canonical EF values (1.3, 1.5, 2.0, 2.5, 2.6, 3.0) ✅
- Integer storage ensures driver-agnostic consistency (vs. `numeric` string or `real` float issues)

**Conversion functions — verified in `card-review-repository.ts`:**
- `toSchedulingState()` correctly converts DB row to CardSchedulingState ✅
- `upsertCardReviewState()` correctly converts back with `Math.round()` ✅
- Type-safe: no implicit conversions, explicit `/ 100` and `* 100` at boundaries

**Result:** DB schema is correct. Basis-points convention is applied consistently and verified to be exact.

**Files verified:**
- `src/db/spaced-repetition-schema.ts` — table definition
- `src/lib/review/card-review-repository.ts` — conversion functions
- Manual verification: round-trip tests pass for all EF values

---

### 6. Regression Check ✅ PASS

**Objective:** Ensure existing features unaffected; only 5th dashboard card added.

**Verification:**

**Dashboard stat cards — verified in `src/app/dashboard/page.tsx`:**
- Line 64-74: 5 stats defined
  1. ✅ "Module hoàn thành" (modules complete) — original
  2. ✅ "Bài học đã xong" (lessons complete) — original
  3. ✅ "Lab đã xong" (labs complete) — original
  4. ✅ "Ngày học (12 tuần)" (active days) — original
  5. ✅ "Thẻ đến hạn" (due cards) — **NEW**

- Line 81: Grid uses `lg:grid-cols-5` to accommodate 5 cards ✅
- Line 93-97: Review banner shown only if `dueCount > 0` ✅
- Dashboard data loading unchanged: still loads `snapshot`, `recentQuizzes`, `activityDates`, `latestItem` ✅

**Quiz endpoint — verified in `src/app/modules/[moduleSlug]/quiz/page.tsx`:**
- Line 31: Uses `toPublicQuizQuestions(learningModule)` to strip answers ✅
- `toPublicQuizQuestions()` in `curriculum-lookup.ts` line 88-90 returns only `{ id, question, options }`
- Verification: zero occurrences of `recallPrompt`, `explanation`, `answerIndex` in public quiz response ✅

**Quiz-taking flow unchanged:**
- Quiz questions still use format `{ id, question, options }`
- `recallPrompt` field only in internal QuizQuestion type, never sent to browser ✅
- Quiz grading still uses `quiz_attempt` table, unchanged ✅
- Quiz pass threshold still `QUIZ_PASS_PERCENT` ✅

**Navigation — verified in `src/components/layout/site-header.tsx`:**
- "Ôn tập" nav link added inside existing `{session && ...}` block ✅
- Auth-gated: only shown to authenticated users ✅
- No existing nav items removed or broken ✅

**Build output — verified:**
- Routes: `/` ✅, `/dashboard` ✅, `/login` ✅, `/modules/[moduleSlug]` ✅, `/modules/[moduleSlug]/quiz` ✅, `/review` ✅ (new)
- No breaking changes to route structure ✅

**Result:** No regressions. Dashboard enhanced with 5th card, existing features untouched, quiz flow unaffected.

**Files verified:**
- `src/app/dashboard/page.tsx` — dashboard implementation
- `src/app/modules/[moduleSlug]/quiz/page.tsx` — quiz route
- `src/content/curriculum-lookup.ts` — public quiz question filtering
- `src/components/layout/site-header.tsx` — navigation

---

## Code Quality Metrics

| Check | Result | Evidence |
|-------|--------|----------|
| TypeScript compilation | ✅ PASS | `pnpm typecheck` green |
| Linting | ✅ PASS | `pnpm lint` green (no violations) |
| Build | ✅ PASS | `pnpm build` green |
| Test suite | ✅ PASS | 146/146 tests pass (139 original + 7 new) |
| Test coverage | ✅ STRONG | SM-2 formula, boundary cases, security gates tested |
| No syntax errors | ✅ PASS | All files compile without errors |

---

## Summary

**Deep validation completed for 6 critical areas:**

1. **SM-2 algorithm** — 7 new boundary-case tests verify formula, interval progression, ease-factor floor, MAX_INTERVAL_DAYS cap, lapse handling
2. **Card-ID forgery** — Namespace separation verified; card keys rejected by progress tracking; allowlist enforced server-side
3. **Eligibility gate** — Eligibility based on `quiz_attempt` rows; filtered at queue-build time; new user gets empty queue
4. **Auth gate** — Session checked before accessing user data; card content not exposed unauthenticated
5. **DB schema** — Basis-points convention verified exact round-trip; foreign key with cascade; correct indexes
6. **Regressions** — Dashboard enhanced (5 cards), quiz unaffected, nav updated, build green

**All verification checks pass.** Implementation is secure, algorithmically correct, and integrates cleanly.

---

## Test Coverage Summary

- **New tests added:** 7 (all pass)
  - Ease factor floor enforcement
  - MAX_INTERVAL_DAYS enforcement
  - Lapse handling
  - SM-2 formula verification (grades 3 & 5)
  - Timestamp exactness
  - State completeness

- **Existing tests:** 139 (all pass)
  - 9 spaced-repetition-scheduler tests
  - 11 flashcard-deck-builder tests (including 5 anti-forgery tests)
  - 9 review-queue-builder tests (including eligibility test)
  - 110 other module tests (unchanged)

- **Total:** 146/146 pass ✅

---

## Unresolved Questions

None. All critical paths verified. Browser/UI testing (flip, reveal, keyboard shortcuts, visual layout) was not in scope for this validation — those are mentioned in the implementer's report as "recommended manual pass before shipping."

---

**Status:** DONE  
**Summary:** Deep validation of SM-2 spaced-repetition feature complete. 6 critical areas (algorithm, security, design) verified. All tests pass, typecheck/lint/build green. No security issues, no regressions, no correctness gaps found. Implementation is production-ready from code perspective.  
**Concerns/Blockers:** None.
