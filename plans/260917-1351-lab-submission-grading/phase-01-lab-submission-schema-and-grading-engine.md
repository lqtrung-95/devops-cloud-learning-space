# Phase 01 — Content schema + grading engine

**Priority:** P1 · **Status:** completed · **Effort:** 2h · **Depends on:** — · **Blocks:** 02, 03, 04

## Context links
- `docs/content-authoring-guide.md` §3 (lab field rules), §8 (validate before handoff)
- `docs/system-architecture.md` → "Content model", "Quality gates"
- Precedent: `src/lib/progress/quiz-grader.ts` (pure grader + `src/lib/progress/quiz-grader.test.ts`)

## Overview
Add an optional expected-result spec to `LabDefinition`, plus a pure, unit-tested grading function. No DB, no UI, no server action in this phase — everything here is pure TypeScript that Vitest can run.

## Key insights (verified)
1. `LabDefinition` (`src/content/content-types.ts:41-47`) is `{ id, title, description, steps }` and is consumed by 55 `module-meta.ts` files. **Any new field must be optional** or every file breaks typecheck.
2. The quiz already solves "don't ship the answer key to the browser": `PublicQuizQuestion` (`src/content/content-types.ts:86-87`) + `toPublicQuizQuestions` (`src/content/curriculum-lookup.ts:88-91`). Lab matchers need the identical treatment — see Security below.
3. `validateModuleDefinition` (`src/content/module-definition-validator.ts:73-76`) loops labs and is run by both `pnpm validate:module` (`scripts/validate-content-module.mts:29`) and the per-module test (`src/content/curriculum-registry.test.ts:52-54`). New spec rules belong there, and they must be **conditional on `lab.submission` existing**.
4. Lab ids are progress keys and must never be renamed (`docs/content-authoring-guide.md:37`); check ids are a *new* stable identifier stored inside `check_results` jsonb — same "never rename" rule applies.

## Requirements
**Functional**
- Author can attach to a lab: a Vietnamese prompt describing exactly what to paste, an input kind, and 0..n checks.
- `gradeLabSubmission(spec, content)` returns per-check outcome + overall pass.
- 4 matchers: `contains`, `regex`, `numberInRange`, `jsonHasKeys`.
- `checks: []` (or no `submission`) means the lab is not auto-gradable.

**Non-functional**
- Pure function, no I/O, no `server-only` import (so Vitest and the server action can both use it).
- Matching must not hang: input pre-capped, regex flags allowlisted.
- Backward compatible: `pnpm test` + `pnpm typecheck` pass with zero edits to existing module-meta files.

## Architecture

### Types — `src/content/content-types.ts`
```ts
export type LabCheckMatcher =
  /** Normalized substring match (trim + collapse whitespace, case-insensitive by default). */
  | { kind: "contains"; value: string; caseSensitive?: boolean }
  /** Author-written regex. `flags` limited to i/m/s. */
  | { kind: "regex"; pattern: string; flags?: string }
  /** `pattern` must have exactly 1 capture group; its value is parsed as a number and range-checked. */
  | { kind: "numberInRange"; pattern: string; min?: number; max?: number }
  /** Submitted text must parse as JSON and contain every dot-path. */
  | { kind: "jsonHasKeys"; keys: string[] };

export interface LabCheck {
  /** kebab-case, stable — stored in submission history. */
  id: string;
  /** Vietnamese, shown BEFORE submitting so the learner knows what is verified. */
  label: string;
  /** Vietnamese nudge shown only when this check fails. Never reveal the matcher. */
  hint?: string;
  matcher: LabCheckMatcher;
}

export interface LabSubmissionSpec {
  /** `output` = multiline paste; `url` = a link; `value` = one short token. Drives the input widget. */
  inputKind: "output" | "url" | "value";
  /** Vietnamese: the exact command to run and what to paste back. */
  prompt: string;
  /** Empty = evidence-only lab (stored, self-attested, no auto-grade). */
  checks: LabCheck[];
}

export interface LabDefinition {
  id: string;
  title: string;
  description: string;
  steps: string[];
  /** Optional — labs without it keep the legacy self-tick checkbox. */
  submission?: LabSubmissionSpec;
}

/** Lab submission spec as sent to the browser — matchers stay on the server. */
export interface PublicLabSubmissionSpec {
  inputKind: LabSubmissionSpec["inputKind"];
  prompt: string;
  checks: Array<Pick<LabCheck, "id" | "label">>;
}
```

### Grader — `src/lib/progress/lab-submission-grader.ts` (new)
```ts
export const LAB_SUBMISSION_MAX_LENGTH = 10_000;      // chars, enforced again in the action
const ALLOWED_REGEX_FLAGS = /^[ims]*$/;

export interface LabCheckOutcome { checkId: string; passed: boolean }
export interface LabGradeResult {
  passed: boolean;                 // every check passed AND checks.length > 0
  autoGraded: boolean;             // checks.length > 0
  outcomes: LabCheckOutcome[];
}

export function gradeLabSubmission(spec: LabSubmissionSpec, content: string): LabGradeResult;
```
Rules:
- Truncate `content` to `LAB_SUBMISSION_MAX_LENGTH` before any matching (ReDoS blast-radius cap).
- `contains`: normalize both sides (`trim`, collapse runs of whitespace to one space); lowercase unless `caseSensitive`.
- `regex`: `new RegExp(pattern, flags ?? "")` inside try/catch; invalid pattern or disallowed flags → outcome `passed: false` (never throw — a bad authored regex must not 500 the action).
- `numberInRange`: exec pattern, take capture group 1, `Number.parseFloat`; `NaN` → fail; apply `min`/`max` when present.
- `jsonHasKeys`: `JSON.parse` in try/catch; walk each dot-path; missing/`undefined` → fail.
- `checks: []` → `{ passed: false, autoGraded: false, outcomes: [] }`. Caller decides the evidence-only policy.

### Public projection — `src/content/curriculum-lookup.ts`
```ts
export function toPublicLabSubmissionSpec(spec: LabSubmissionSpec): PublicLabSubmissionSpec;
```
Sits directly beside `toPublicQuizQuestions` (`src/content/curriculum-lookup.ts:88`), same reason, same shape.

### Validator additions — `src/content/module-definition-validator.ts`
Inside the existing lab loop (`:73-76`), only when `lab.submission` is present:
- `prompt` non-empty.
- Every `check.id` kebab-case (reuse `SLUG_PATTERN`, `:13`) and unique within the lab (reuse `findDuplicates`, `:23`).
- Every `check.label` non-empty.
- `regex` / `numberInRange`: `new RegExp(pattern, flags)` compiles; flags match `/^[ims]*$/`.
- `numberInRange`: pattern has exactly 1 capture group; at least one of `min`/`max` set.
- `jsonHasKeys`: `keys.length > 0`.
- `contains`: `value` non-empty.

No change to `contentRules` (`:15-21`) — submission specs stay optional, so no minimum count is enforced yet. Phase 05 may raise this.

## Related code files
**Modify**
- `src/content/content-types.ts` — add `LabCheckMatcher`, `LabCheck`, `LabSubmissionSpec`, `PublicLabSubmissionSpec`; add optional `submission` to `LabDefinition:41`.
- `src/content/curriculum-lookup.ts` — add `toPublicLabSubmissionSpec`.
- `src/content/module-definition-validator.ts` — conditional submission-spec rules in the lab loop.

**Create**
- `src/lib/progress/lab-submission-grader.ts`
- `src/lib/progress/lab-submission-grader.test.ts`

**Delete** — none.

## Implementation steps
1. Add the types to `content-types.ts`. Run `pnpm typecheck` — must stay clean with zero module-meta edits (proves backward compatibility).
2. Write `lab-submission-grader.ts` per the contract above. Keep the file < 120 lines.
3. Write `lab-submission-grader.test.ts` covering the test matrix below.
4. Add `toPublicLabSubmissionSpec` to `curriculum-lookup.ts`.
5. Extend `validateModuleDefinition` with the conditional rules.
6. Run `pnpm test` — `curriculum-registry.test.ts` must still pass for all 55 modules (none has `submission` yet, so every new rule is skipped).
7. Run `pnpm lint`.

## Test matrix (`lab-submission-grader.test.ts`)
| Case | Expect |
|---|---|
| `contains` with differing whitespace/case | pass |
| `contains` with `caseSensitive: true` and wrong case | fail |
| `regex` anchored digest `^sha256:[0-9a-f]{64}$` | pass / fail |
| `regex` with invalid pattern | `passed: false`, no throw |
| `regex` with disallowed flag `g` | `passed: false`, no throw |
| `numberInRange` capture within / outside `min`..`max` | pass / fail |
| `numberInRange` capture is not a number | fail |
| `jsonHasKeys` on valid JSON, nested dot-path present | pass |
| `jsonHasKeys` on non-JSON text | fail, no throw |
| mixed checks, one fails | `passed: false`, outcomes flag exactly that check |
| `checks: []` | `{ passed: false, autoGraded: false }` |
| content longer than `LAB_SUBMISSION_MAX_LENGTH` | truncated, still returns |

Also extend `src/content/curriculum-registry.test.ts` only if a helper is needed — the existing per-module loop already covers the validator.

## Todo list
- [x] Types added to `content-types.ts`, typecheck clean with no module-meta edits
- [x] `lab-submission-grader.ts` implemented (4 matchers, no throws)
- [x] `lab-submission-grader.test.ts` — full matrix green
- [x] `toPublicLabSubmissionSpec` added next to `toPublicQuizQuestions`
- [x] Validator rules added, conditional on `lab.submission`
- [x] `pnpm test` + `pnpm typecheck` + `pnpm lint` clean

## Success criteria
- `pnpm typecheck` passes with **zero** changes to any `src/content/modules/*/module-meta.ts`.
- `pnpm test` passes; new grader test file covers every row of the matrix.
- `gradeLabSubmission` never throws for any input, including hostile content and malformed authored specs.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| New required field breaks 55 module files | Low × High | `submission` is optional; step 1 verifies via typecheck before anything else is built |
| Author writes a catastrophic-backtracking regex → serverless timeout | Med × Med | Input truncated to 10 000 chars before matching; flags allowlisted; validator compiles every pattern at test time so a broken regex fails CI, not prod |
| Matcher set proves too narrow for real labs | Med × Med | Phase 04 authors 4 real labs against it; unsupported cases become `checks: []` evidence-only labs, and the gap is recorded for phase 05 |
| Spec grows into a DSL | Med × Med | Hard cap of 4 matchers; anything needing a 5th must be justified against a real M04 lab |

## Security considerations
- **Answer-key leakage is the main threat.** `src/app/modules/[moduleSlug]/page.tsx:126` passes the whole `lab` object into `LabChecklistCard`, a `"use client"` component (`src/components/progress/lab-checklist-card.tsx:1`). Shipping `lab.submission.checks[].matcher` through that boundary puts every regex and expected value in the browser bundle. `toPublicLabSubmissionSpec` exists solely to prevent that; phase 03 enforces it at the call site.
- `hint` text is author-written and shown on failure — it must not restate the matcher.
- Grader must be total (never throw) so a malformed spec cannot be used to force a 500.

## Next steps
Phase 02 consumes `LabCheckOutcome` as the `check_results` jsonb type and `LAB_SUBMISSION_MAX_LENGTH` as the zod bound.
