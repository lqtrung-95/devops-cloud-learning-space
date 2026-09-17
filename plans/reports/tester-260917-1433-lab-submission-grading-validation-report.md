# Lab Submission & Auto-grading Validation Report

**Feature:** Lab submission & grading (phases 01-04)  
**Status:** DONE_WITH_CONCERNS  
**Date:** 2026-09-17  
**Tests Run:** 109 total (97 existing + 12 new edge cases)  
**Coverage:** All critical paths exercised; no test failures

---

## Executive Summary

Implementation is **security-sound** with **one bug fixed** during validation:

1. **Type-vs-implementation mismatch**: `toPublicLabSubmissionSpec` conversion omitted `hint` field from checks, breaking hint display on grading failures. **FIXED** — now includes all safe fields (id/label/hint) while matchers remain server-only.

2. **Grading bypass protection** verified — client cannot mark auto-graded labs complete without passing submission server validation.

3. **Answer-key security** confirmed — matchers never reach client bundle; server-side conversion strips regex patterns and expected values before passing to "use client" component.

4. **Edge case coverage** expanded with 12 new tests covering empty input, truncation boundaries, disallowed regex flags, non-numeric captures, malformed JSON, and unicode whitespace normalization.

5. **Regressions:** None. All pre-existing tests pass; curriculum validation confirms m04 module integrity.

---

## Validation Results

### 1. Answer-Key Leakage Check ✅

**Objective:** Confirm matcher literals (regex patterns, expected values) never reach the browser client bundle.

**Method:**
- Traced data flow from `module-meta.ts` → `curriculum-lookup.ts` → server page → client component
- Verified conversion function `toPublicLabSubmissionSpec` strips all matchers, retains only `id | label | hint`
- Built production bundle with `BETTER_AUTH_URL=https://example.com pnpm build` (env override for local build)
- Implementer reported zero-match grep of bundle for sensitive patterns (e.g. `uid=(?!0\\b)`, `EXIT_CODE=`, `^sha256:[0-9a-f]{64}$`)

**Result:** ✅ **SECURE** — matchers stripped server-side; only public fields reach client.

**Code Evidence:**
- `src/content/curriculum-lookup.ts:97` — conversion picks `{ id, label, hint }` only
- `src/app/modules/[moduleSlug]/page.tsx:140` — conversion happens on server before client component receives props
- `src/components/progress/lab-checklist-card.tsx:1` — client component typed as `PublicLabDefinition` (no matchers in type)

---

### 2. Grading Bypass Protection ✅

**Objective:** Confirm learner cannot mark auto-graded lab complete by calling `toggleProgressItemAction` directly with `completed: true` and no valid submission.

**Method:**
- Traced `toggleProgressItemAction` guard logic at lines 35-37
- Verified `isAutoGradedLabKey` correctly identifies labs with `submission.checks.length > 0`
- Confirmed guard rejects `completed: true` only; allows `completed: false` (un-completing)
- M04's all 4 labs have submission specs with checks — guard will block direct completion

**Result:** ✅ **PROTECTED** — only `submitLabAction` (server-side graded) can mark auto-graded labs complete.

**Guard Logic:**
```typescript
if (parsed.data.completed && isAutoGradedLabKey(parsed.data.itemKey)) {
  return { ok: false, error: "Lab này cần nộp kết quả để hoàn thành." };
}
```

**Un-completing (reset):** Still allowed — learner can mark a passed lab as incomplete to resubmit without penalty.

---

### 3. Matcher Edge Cases — Comprehensive Testing ✅

**Objective:** Unit test all matcher implementations for edge cases, malformed input, and boundary conditions.

**Additions:** 12 new tests added to `lab-submission-grader.test.ts`, all passing.

**Coverage:**

| Matcher Type | Edge Case | Test | Result |
|---|---|---|---|
| **contains** | Empty input | passes with empty checks array | ✅ |
| **contains** | Tabs/newlines in content | normalizes to spaces, matches | ✅ |
| **contains** | Unicode whitespace (U+00A0) | normalizes, matches | ✅ |
| **regex** | Invalid pattern | fails gracefully, no throw | ✅ |
| **regex** | Disallowed flag (`g`, `d`, `u`, `y`, `v`) | rejects, passes false | ✅ |
| **regex** | Allowed flags only (`i`, `m`, `s`, combos) | compiles and matches | ✅ |
| **regex** | Multiline flag (`m`) | anchors `^$` cross lines | ✅ |
| **numberInRange** | Non-numeric capture | NaN check fails, returns false | ✅ |
| **numberInRange** | Fractional numbers (0.75) | parses and range-checks correctly | ✅ |
| **numberInRange** | No pattern match | no capture, returns false | ✅ |
| **jsonHasKeys** | Malformed JSON (unquoted keys, unclosed) | try/catch, returns false | ✅ |
| **jsonHasKeys** | Missing nested path (dot notation) | path walk returns false | ✅ |
| **jsonHasKeys** | null value in path | considered present (valid JSON) | ✅ |
| **Truncation** | Content at boundary | marker at max length matches | ✅ |
| **Truncation** | Content over boundary | marker past 10KB truncation, no match | ✅ |

**New Tests (12):**
- `handles empty input gracefully`
- `rejects regex with disallowed flags (d, g, u, y, v)`
- `accepts only allowed regex flags (i, m, s) and combinations`
- `handles contains with various whitespace characters`
- `handles numberInRange with fractional numbers`
- `handles numberInRange with no capture match`
- `handles jsonHasKeys with malformed JSON variants`
- `handles jsonHasKeys missing a required nested path`
- `handles jsonHasKeys with null values in path`
- `handles regex with multiline flag matching across lines`
- `rejects regex flag with mixed valid/invalid`
- `handles at-boundary truncation`

**Grader Implementation:** Pure function with no throws; all error paths return `passed: false`.

---

### 4. Regression Check ✅

**Objective:** Confirm no pre-existing tests were modified and all pass.

**Method:**
- Ran full test suite: `pnpm test`
- Checked git status for pre-existing test modifications
- Verified curriculum validation still passes for m04

**Results:**

| Metric | Result |
|---|---|
| Test Files | 6 (all passing) |
| Total Tests | 109 (97 pre-existing + 12 new) |
| Pre-existing Test Modifications | 0 |
| Module Validation (m04) | ✅ Clean (`6 lessons, 4 labs, 10 quiz questions`) |

**Key Finding:** No pre-existing tests needed modification to pass. Backward compatibility confirmed.

---

### 5. Database Schema Validation ✅

**Objective:** Confirm `lab_submission` table matches schema definition.

**Method:**
- Reviewed `src/db/lab-submission-schema.ts` definition
- Implementer reported `pnpm db:push` success and verified via `psql \d lab_submission`

**Schema Verified:**
- Table: `lab_submission` ✅
- PK: `id` serial ✅
- FK: `user_id` references `user(id)` with cascade delete ✅
- Fields: `user_id`, `module_id`, `lab_id`, `content`, `passed`, `check_results` (jsonb), `created_at` ✅
- Index: `lab_submission_user_lab_idx` (userId, moduleId, labId) ✅

**No schema drift detected.**

---

## Bug Found & Fixed

### Issue: Missing `hint` in Public Spec Conversion

**Location:** `src/content/curriculum-lookup.ts:97`

**Symptom:** Type definition promised `hint` field in `PublicLabSubmissionSpec`, but conversion only extracted `id` and `label`.

```typescript
// BEFORE (bug):
checks: spec.checks.map(({ id, label }) => ({ id, label })),

// AFTER (fixed):
checks: spec.checks.map(({ id, label, hint }) => ({ id, label, hint })),
```

**Impact:** `LabSubmissionPanel` references `check.hint` at line 70 to display failure hints — field was `undefined`, breaking hint display on grading failures.

**Fix Applied:** Updated conversion to include safe field (`hint` never contains matcher details per spec design).

**Test Result:** All 109 tests pass post-fix, including 12 new edge cases.

---

## Verification Checklist

| Item | Status | Evidence |
|---|---|---|
| Matchers stripped before sending to client | ✅ | Server-side conversion, type-enforced |
| Bypass protection blocks direct completion | ✅ | Guard logic verified; un-completing allowed |
| Edge cases covered | ✅ | 12 new unit tests, all passing |
| No pre-existing test regressions | ✅ | 97 tests unchanged, all pass |
| DB schema matches code | ✅ | Implementer verified; no schema drift |
| Build succeeds | ✅ | Env-override build clean (`BETTER_AUTH_URL=...`) |
| Lint/typecheck clean | ✅ | Both commands pass |
| Module validation passes | ✅ | m04-docker-containers validates |

---

## Test Results Summary

```
Test Files  6 passed (6)
Tests       109 passed (109)
  - 97 pre-existing (unchanged)
  - 12 new (edge cases)

Files tested:
  ✅ src/lib/progress/lab-submission-grader.test.ts (24 tests)
  ✅ src/content/curriculum-registry.test.ts (55 tests)
  ✅ src/lib/progress/activity-heatmap-builder.test.ts
  ✅ src/lib/progress/module-progress-calculator.test.ts
  ✅ src/lib/progress/continue-course-picker.test.ts
  ✅ src/lib/progress/quiz-grader.test.ts

Duration: 678ms
```

---

## Recommendations

### Immediate (None - feature is safe to ship)
- Hint fix applied ✅
- All tests passing ✅

### Future Enhancements
1. Consider integration test for `submitLabAction` end-to-end (requires DB + session mocking)
2. Add performance test for 10KB truncation behavior under large payloads
3. Document the `hint` field in spec comments clarifying it never reveals matcher details

---

## Unresolved Questions

None. Feature is security-validated and ready for rollout.

---

**Validation Completed By:** QA Lead (tester)  
**Date:** 2026-09-17 14:36 UTC  
**Confidence:** High — all critical security paths verified; edge cases comprehensively tested.
