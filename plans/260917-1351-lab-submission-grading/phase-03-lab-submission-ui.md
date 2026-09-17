# Phase 03 — Submission UI on the module page

**Priority:** P1 · **Status:** completed · **Effort:** 2.5h · **Depends on:** 01, 02 · **Blocks:** 04

## Context links
- `src/app/modules/[moduleSlug]/page.tsx:118-130` — labs section (`id="labs"`)
- `src/components/progress/lab-checklist-card.tsx` — current card (client, expandable steps)
- UI precedent: `src/app/modules/[moduleSlug]/quiz/module-quiz-runner.tsx` (submit → result banner → per-item pass/fail styling)

## Overview
Extend the lab card with a submission panel: prompt, textarea/input, "Nộp kết quả" button, per-check ✅/❌ list with hints on failure, and a short history of previous attempts. Labs with no `submission` render exactly as today.

## Key insights (verified)
1. **The card is a client component** (`lab-checklist-card.tsx:1`) and today receives the full `lab` object (`page.tsx:126`). After phase 01, that object carries the matchers. The page must pass a **projected** lab: `{ id, title, description, steps, submission: toPublicLabSubmissionSpec(lab.submission) }`. This is the single most important line of this phase.
2. `firstUnfinishedLab` / `primaryCta` (`page.tsx:34-44`) key off `snapshot.completedKeys` only. Since phase 02 writes `progress_item` on pass, the "Làm lab →" CTA keeps working with **no change**.
3. `revalidatePath("/", "layout")` in the action (`learning-progress-actions.ts:62`) re-renders the server component, so submission history refreshes without client-side refetching — same mechanism the quiz already relies on.
4. `InlineCodeText` (`src/components/ui/inline-code-text.tsx:7`) is safe (React children, no `dangerouslySetInnerHTML`) but is for **authored** strings. Learner-submitted content must render in a plain `<pre>` so backticks in their output aren't reinterpreted.
5. `ProgressItemCheckbox` (`progress-item-checkbox.tsx:15`) is unconditionally interactive. For auto-graded labs it must become a non-interactive status dot, otherwise the UI invites an action the server now rejects.

## Requirements
**Functional**
- Auto-graded lab: prompt + input + submit; result panel lists every check with ✅/❌ and shows `hint` only for failures; pass shows a success banner and the lab flips to done.
- Evidence-only lab (`checks: []`): same form, submit stores evidence and marks done, no check list.
- Legacy lab (no `submission`): unchanged checklist card.
- Signed-out: form is visible but disabled with a login prompt (mirrors `lesson-completion-footer.tsx:57-63`).
- History: last 3 attempts, collapsed, showing timestamp + pass/fail. Content shown in a `<pre>` with `max-h` + scroll.
- `inputKind`: `output` → `<textarea>` (~8 rows, monospace); `url` / `value` → single-line `<input>`.

**Non-functional**
- Keep files < 200 lines (repo rule) — split into `lab-submission-panel.tsx` rather than growing the card.
- Client bundle must contain no matcher strings — verify by grepping the built chunks.
- Vietnamese copy throughout, consistent with existing strings.
- Accessible: `aria-live="polite"` on the result panel, label bound to the input, disabled state on pending.

## Architecture

### Component split
| File | Kind | Responsibility |
|---|---|---|
| `src/components/progress/lab-checklist-card.tsx` (modify) | client | Steps toggle + status indicator; renders `<LabSubmissionPanel>` when `submission` present, `<ProgressItemCheckbox>` otherwise |
| `src/components/progress/lab-submission-panel.tsx` (new) | client | Form state, `useTransition`, calls `submitLabAction`, renders result + history |
| `src/app/modules/[moduleSlug]/page.tsx` (modify) | server | Projects labs, loads latest submissions, passes both down |

### Props
```ts
interface LabSubmissionPanelProps {
  moduleSlug: string;
  labId: string;
  spec: PublicLabSubmissionSpec;      // matchers already stripped
  isSignedIn: boolean;
  completed: boolean;
  recentSubmissions: Array<{ id: number; passed: boolean; createdAt: Date; content: string; checkResults: LabCheckOutcome[] }>;
}
```

### Page changes (`page.tsx`)
```ts
const latestSubmissions = session ? await getLatestLabSubmissionsForModule(session.user.id, learningModule.id) : new Map();
// inside the labs map (:123)
const publicLab = { ...lab, submission: lab.submission ? toPublicLabSubmissionSpec(lab.submission) : undefined };
```
`LabChecklistCard`'s `lab` prop type changes from `LabDefinition` to a local `PublicLabDefinition` so the compiler prevents a future regression that re-leaks matchers.

### Result rendering
- Banner: `passed` → emerald, "🎉 Lab đạt!"; fail → amber, "Chưa đạt — xem gợi ý bên dưới". Mirrors `module-quiz-runner.tsx:51-66` tone/palette.
- Check list: each `{ label }` with ✅/❌ from `outcomes`, failures also show `hint`. `label`/`hint` come from the public spec, matched by `checkId`.
- Learner content: `<pre className="… whitespace-pre-wrap break-all max-h-48 overflow-auto">{content}</pre>` — escaped by React, never `InlineCodeText`, never `dangerouslySetInnerHTML`.

## Related code files
**Create**
- `src/components/progress/lab-submission-panel.tsx`

**Modify**
- `src/components/progress/lab-checklist-card.tsx`
- `src/app/modules/[moduleSlug]/page.tsx`

**Delete** — none. `ProgressItemCheckbox` stays for lessons and legacy/evidence labs.

## Implementation steps
1. Define `PublicLabDefinition` (in `content-types.ts`, beside `PublicLabSubmissionSpec`) and switch `LabChecklistCard`'s prop type to it.
2. Update `page.tsx`: project labs, load `latestSubmissions`, pass `recentSubmissions` per lab.
3. Build `lab-submission-panel.tsx` — form + `useTransition` + result panel + history `<details>`.
4. In `lab-checklist-card.tsx`, branch: `submission?.checks.length ? status dot : <ProgressItemCheckbox>`; render the panel below the steps.
5. Signed-out path: disabled input + login link.
6. `pnpm build`, then `grep -r "sha256:\[0-9a-f\]" .next/static` (or whatever matcher string phase 04 uses) — **must return nothing**.
7. `pnpm lint` · `pnpm typecheck` · `pnpm test`.

## Test matrix
**Automated (Vitest, node env — no DOM testing set up in this repo, see `vitest.config.mts:10`)**
- Nothing new; grading logic is already covered in phase 01. Do **not** add a jsdom/RTL dependency for this feature.

**Manual (record in the phase todo)**
| Scenario | Expected |
|---|---|
| Signed-out, graded lab | Form disabled + "Đăng nhập" link |
| Paste passing output | Success banner, all ✅, lab counter `(n+1)/4`, "Học tiếp" CTA advances |
| Paste failing output | Amber banner, failing check ❌ + hint, counter unchanged |
| Resubmit after a fail, now passing | Passes; history shows both attempts |
| Evidence-only lab | Submit marks done, no check list |
| Legacy lab (M01) | Unchanged checkbox behaviour |
| `toggleProgressItemAction` on a graded lab via devtools | Vietnamese rejection, no progress row |
| Reload page after pass | Server-rendered as done, history present |
| Dark mode + mobile width | Readable, no overflow |

## Todo list
- [x] `PublicLabDefinition` used as the card's prop type (compiler-enforced no-leak)
- [x] `lab-submission-panel.tsx` created, < 200 lines
- [x] Page projects labs + loads recent submissions per graded lab (see deviation note below — `getLabSubmissions(limit 3)` per lab, not one grouped query)
- [x] Auto-graded labs show a status dot, not an interactive checkbox
- [x] Learner content rendered in `<pre>`, never `InlineCodeText`
- [x] Bundle grep for matcher strings returns nothing (re-verified after phase 04's real content — see phase 04 notes)
- [x] Manual matrix walked on M04 after phase 04 lands (via a scratch grading script against real captured Docker/Trivy output, not the browser — see phase 04)
- [x] lint / typecheck / test / build clean

## Success criteria
- Grepping the production bundle for any phase-04 matcher literal returns zero hits.
- A learner can pass a lab end-to-end and the module percentage moves, with no edits to `module-progress-calculator.ts` or its tests.
- An auto-graded lab cannot be completed from the UI without submitting.

## Risk assessment
| Risk | L×I | Mitigation |
|---|---|---|
| Matchers leak into the client bundle | Med × **High** | Type-level: card takes `PublicLabDefinition`. Build-level: step 6 grep. Both required |
| Card file grows past 200 lines | High × Low | Panel extracted to its own file up front |
| History `<pre>` shows a learner's leaked secret back to them | Low × Low | Only ever shown to its own author (`userId` filter, phase 02); prompt copy in phase 04 tells learners to paste command output, not env files |
| Optimistic UI diverges from server truth (grading is not optimistic) | Low × Med | No `useOptimistic` here — show a pending state and wait for the real grade, unlike the checkbox |
| Long pasted output blows up layout | Med × Low | `max-h-48 overflow-auto` + `break-all` |

## Security considerations
- Server-side rendering only sends the public spec; the action's return value contains only `checkId` + `passed`.
- All rendering of learner content goes through React text nodes — no `dangerouslySetInnerHTML` anywhere in this feature.
- `recentSubmissions` is fetched with a `userId` filter server-side; no submission id is ever accepted from the client.
- Disabled-but-visible form for signed-out users is UI only; the action re-checks the session.

## Next steps
Phase 04 authors the four M04 specs and walks this manual matrix for real.
