# Phase 01 — Content foundation: `recallPrompt` + validator rule

## Context links
- Plan: [plan.md](plan.md)
- `src/content/content-types.ts:49-56` (`QuizQuestion`)
- `src/content/module-definition-validator.ts:78-85` (per-question checks)
- `src/content/curriculum-registry.test.ts:52-54` (runs validator over all 55 modules)
- `docs/content-authoring-guide.md:37,57,150,158`

## Overview
- **Priority:** P2 · blocks every later phase
- **Status:** pending · **Effort:** 1h
- Add one optional field to `QuizQuestion` so a quiz question can also work as a standalone recall prompt, and
  enforce it exactly where it is needed.

## Key insights
- Quiz explanations are already written as ELI5 teaching text (`m01-linux-shell/module-meta.ts:100,107,119,131`) →
  they are usable flashcard backs **as-is**. This is what makes the pilot cheap.
- **464 quiz questions exist across 55 modules.** Only **7** are phrased so they cannot be answered without seeing
  the option list. Verified list (file:line):
  1. `src/content/modules/b13-grpc-internal-services/module-meta.ts:161`
  2. `src/content/modules/b07-testing-backend/module-meta.ts:160`
  3. `src/content/modules/b16-observability-for-backend/module-meta.ts:178`
  4. `src/content/modules/b17-containerization-cicd-backend/module-meta.ts:109`
  5. `src/content/modules/m02-networking/module-meta.ts:95`  ← **inside pilot scope**
  6. `src/content/modules/m16-sre-practices/module-meta.ts:146`
  7. `src/content/modules/sd10-consensus-coordination/module-meta.ts:247`
- 7/464 is small enough that a new content type for flashcards is unjustified (YAGNI). One optional override field
  is the minimum viable fix.

## Requirements
**Functional**
- `QuizQuestion` gains `recallPrompt?: string` — a standalone rephrasing used as the flashcard front when set.
- `validateModuleDefinition` fails a question whose text matches the option-dependent phrasing pattern and has no
  `recallPrompt`.
- All 7 questions above get a `recallPrompt` so `pnpm test` stays green.

**Non-functional**
- Purely additive: no existing field changes type, no DB impact, no rendering change on `/modules/[slug]/quiz`
  (`toPublicQuizQuestions` at `src/content/curriculum-lookup.ts:88-90` keeps stripping everything but
  `id/question/options` — `recallPrompt` must **not** be added to `PublicQuizQuestion`).

## Architecture / data flow
```
module-meta.ts (QuizQuestion.recallPrompt?)
      │
      ├─► validateModuleDefinition()  → pnpm validate:module / curriculum-registry.test.ts
      └─► (Phase 02) flashcard-deck-builder → card.front = recallPrompt ?? question
```
No runtime consumer in this phase — the field is inert until Phase 02.

## Related code files
**Modify**
- `src/content/content-types.ts` — add `recallPrompt?: string` to `QuizQuestion` (doc-comment: "Standalone
  re-phrasing used when the question is asked without its options.").
- `src/content/module-definition-validator.ts` — add rule inside the existing `for (const question of quiz)` loop
  (`:78-85`).
- The 7 module-meta files listed above — add `recallPrompt` to the one flagged question each.
- `docs/content-authoring-guide.md` — document the field + rule in the `quiz` row (`:57`) and the checklist (`:158`).

**Create / delete:** none.

## Implementation steps
1. Add `recallPrompt?: string` to `QuizQuestion` in `src/content/content-types.ts`.
2. In `module-definition-validator.ts`, above the existing per-question checks, add:
   `const OPTION_DEPENDENT_PATTERN = /nào (sau đây|dưới đây)|phát biểu nào|đáp án nào|câu nào/i;`
   then inside the loop: if pattern matches `question.question` and `!question.recallPrompt?.trim()`, push
   `` where(`quiz ${question.id} is option-dependent — add recallPrompt`) ``.
   Also reject a `recallPrompt` that is present but blank.
3. Run `pnpm test` → expect exactly the 7 failures listed above. Fix each by adding a `recallPrompt` that is
   answerable without options, in Vietnamese, same register as the question. Example for
   `m02-networking:95`: `recallPrompt: "Vì sao DNS, streaming và game online thường dùng UDP thay vì TCP?"`.
4. Re-run `pnpm test` and `pnpm validate:module m02-networking` → green.
5. Update `docs/content-authoring-guide.md`.

## Todo list
- [ ] `recallPrompt?: string` added to `QuizQuestion`
- [ ] Validator rule + blank-string guard added
- [ ] 7 flagged questions given a `recallPrompt`
- [ ] `pnpm test` green (55 module validations)
- [ ] `pnpm typecheck` + `pnpm lint` green
- [ ] Authoring guide updated (quiz row + checklist)

## Success criteria
- `pnpm test` passes with zero validator problems for all 55 modules.
- Grepping `recallPrompt` returns exactly 7 module-meta hits + type + validator + guide.
- `/modules/m02-networking/quiz` renders unchanged (manual check — no `recallPrompt` in network payload).

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| Regex flags false positives in future content | Med × Low | Message tells the author exactly what to do; adding a `recallPrompt` is always a valid fix, never a blocker |
| Regex misses an option-dependent question | Med × Low | Phase 02 deck builder only feeds 3 pilot modules; pilot cards are eyeballed once in Phase 06 QA |
| `recallPrompt` leaks to the browser and spoils the quiz | Low × Med | `toPublicQuizQuestions` picks fields explicitly (`curriculum-lookup.ts:89`) — verify it stays a whitelist, not `Omit` |

## Security considerations
- Content-only change; no user input, no DB, no auth surface.
- Do **not** widen `PublicQuizQuestion` — it is the boundary that keeps answers server-side.

## Rollback
Revert the commit. Feature is inert; nothing else depends on it yet.

## Next steps
Phase 02 consumes `recallPrompt` in the deck builder.
