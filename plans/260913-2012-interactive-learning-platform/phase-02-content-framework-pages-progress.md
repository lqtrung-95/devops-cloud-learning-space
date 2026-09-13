# Phase 02 — Content framework, pages, progress

**Priority:** P0 · **Status:** pending · **Depends on:** 01

## Content model
Each module = folder `src/content/modules/mXX-<slug>/`:
- `module-meta.ts` — `ModuleDefinition` (id, slug, phase, weeks, title, eli5Summary, objectives, lessons[{slug,title,minutes,load}], labs[{id,title,steps[]}], deliverable, resources, quiz[])
- `lessons/<lesson-slug>.mdx` — lesson body using MDX components
- `diagrams/<name>-diagram.tsx` — interactive SVG diagrams (client components)

Registry `src/content/curriculum-registry.ts` lists phases + modules (lead-owned).

## MDX components (`src/components/lesson/`)
`Eli5`, `Callout` (tip|warning|mistake), `KeyTerms`, `TerminalBlock`, `QuickCheck` (inline 1-question), `Steps`

## Diagram kit (`src/components/diagrams/`)
`DiagramFrame` (responsive viewBox, theme vars), `DiagramNode`, `DiagramArrow` (animated dash), `MovingPacket` (animateMotion), `useDiagramStepper` + `DiagramStepperControls` (prev/next/play)

## Pages
- `/` landing · `/login` · `/dashboard` (auth) · `/roadmap`
- `/modules/[moduleSlug]` overview + lab checklist
- `/modules/[moduleSlug]/lessons/[lessonSlug]` lesson + mark complete + prev/next
- `/modules/[moduleSlug]/quiz` — graded server-side, answers never sent to client before submit

## Progress
- Server actions: `toggleProgressItem(itemKey)` (validated against registry), `submitQuiz(moduleId, answers)`
- Module complete = all lessons + labs done AND best quiz ≥ 80%
- Dashboard: overall %, per-phase bars, "continue learning", 12-week activity heatmap, recent quiz scores
- Pure functions in `src/lib/progress/` (unit-tested)

## Success criteria
- Anonymous users read content; progress UI prompts login
- Logged-in progress persists across reloads/devices
