# Code Review — multi-course refactor (staged, 25 files)

## Scope
- Files: `git diff --cached` (next.config.ts, src/app/{page,dashboard,courses/[courseSlug],modules/[moduleSlug],not-found,layout}, src/components/{landing/course-overview-card,progress/course-progress-section,layout/site-header}, src/content/{course-registry,curriculum-lookup,content-types,devops/system-design phases,validator,registry test}, src/lib/progress/{calculator,snapshot}, env/email brand)
- LOC: +534 / -193
- Re-verified: `vitest run src/content src/lib/progress` 43 pass; `pnpm validate:module m01-linux-shell` OK (validator's new `course-registry` import works under tsx script).
- Scout: grep `/roadmap`, `getPhasesWithModules(`, `overallPercent`, `curriculumPhases`, `curriculum-phases`, `m\d` regexes, `getAllModules(`, brand strings across src/, scripts/, docs/, README.

## Overall
Clean, small, well-tested. Design decisions implemented correctly: progress keys / quiz `module_id` untouched (`parseItemKey` already `[a-z0-9]+`, `isKnownProgressItemKey` iterates all `curriculumModules`, quiz action resolves by slug) → existing prod data keeps working. No auth/data-exposure change: course page only loads snapshot for session user. No blocking issues. Findings are behavioral regressions on dashboard CTA + stale docs.

## Critical
None.

## High
None.

## Medium

### M1. Dashboard "Tiếp tục học" CTA disappears for brand-new learners (regression)
- `src/app/dashboard/page.tsx:39-45,71`
- Before: `modules.find(!isComplete)` → zero-progress user got CTA to m01 lesson 1. Now `activeCourse` requires `hasStarted`, so a fresh signup lands on dashboard (landing "Bắt đầu miễn phí" → login → dashboard) with no primary CTA; only per-course secondary "Bắt đầu khoá này →" buttons (which go to the course page, not lesson 1).
- Same for user who finished DevOps and never started SD: no CTA.
- Intentional? If not: fallback `activeCourse ?? courses.find(c => summary.modulesTotal > 0 && modulesDone < modulesTotal)`, and label "Bắt đầu học" vs "Tiếp tục học" by `hasStarted`.

### M2. `activeCourse` = first started course in display order, not the one learner is actually on
- `src/app/dashboard/page.tsx:39-42`
- Scenario (once SD content exists): user ticked one DevOps lesson months ago, now studies SD daily → CTA always points to DevOps m01. `hasStarted` is sticky on any single item/quiz attempt.
- Fix (cheap, no schema change): pick course of most recent activity. `progress_item.completed_at` and `quiz_attempt.created_at` already exist (`getActivityDates` selects them). E.g. repo fn `getLatestActivityModuleId(userId)` (max over both tables, parse module id from item key via `parseItemKey`) → `getCourseForModule(getModuleById(id))`, fallback to current logic. Worth extracting CTA selection into a pure fn (`pickContinueTarget(courses, snapshot, latestModuleId)`) next to `summarizeCourseProgress` and unit-testing it — currently this branching lives untested in a page.
- Non-blocking today (SD has 0 modules, so only DevOps can be "started"), but bites the moment sd01 ships.

### M3. Stale authoring docs point at deleted file / old id + phase rules
- `docs/content-authoring-guide.md:3` ("DevOps Learning Space"), `:37` (`phaseId` = `phase-0 … phase-5`, see `src/content/curriculum-phases.ts` — file renamed to `devops-course-phases.ts`; no mention of `sd-phase-*` or `sd01` ids).
- `README.md:51` route list still `/roadmap`.
- `docs/deployment-guide.md:47` EMAIL_FROM example old brand.
- Impact: next task is writing SD modules from this guide → author (human/agent) gets wrong phase ids and a dead path. Validator catches bad phaseId, but guide should be updated first.

## Low

### L1. `/roadmap` redirect target slug hardcoded, unguarded
- `next.config.ts:8` → `/courses/devops-cloud`. Renaming `courses[0].slug` silently turns a 308 (browser-cached permanently) into a 404. Add one assertion in `curriculum-registry.test.ts`: `expect(getCourseBySlug("devops-cloud")).toBeDefined()` (or export a const used by both).

### L2. Empty-course UX (System Design, 0 modules)
- `src/components/progress/course-progress-section.tsx:36` — dashboard shows "0/0 module · 0/0 bài · 0/0 lab", 0% bar, and "Bắt đầu khoá này →" CTA for a course with no content. Suggest: if `modulesTotal === 0` render "Nội dung đang được biên soạn" instead of CTA/stats (landing card already does this, `course-overview-card.tsx:31`).
- `src/app/courses/[courseSlug]/page.tsx:47` — progress bar rendered whenever logged in (`courseProgress &&`), incl. 0% on empty/unstarted course; landing card gates on `hasStarted`. Minor inconsistency; gate on `courseProgress?.hasStarted` for parity.
- Dashboard summed stats (`page.tsx` stats) are fine with empty course (adds 0).

### L3. Non-null assertions — safe by construction, but implicit
- `src/lib/progress/user-progress-snapshot.ts:25`: `getModulesForCourse(id)` ⊆ `getAllModules()` (latter is `courses.flatMap(getModulesForCourse)`, `curriculum-lookup.ts:30`) → never undefined. OK.
- `src/app/dashboard/page.tsx:93`: snapshot map built from same `getAllCourses()` → never undefined. OK.
- Optional hardening (no runtime cost): have snapshot expose `courses: Array<{ course, summary }>` and iterate that in dashboard, removing both `!` and the duplicate `getAllCourses()` walk.

### L4. `getAllModules()` semantics silently changed
- `curriculum-lookup.ts:29-31`: now drops modules whose phase doesn't resolve to a course (previously all modules). `getModuleBySlug`/`isKnownProgressItemKey` still see them → orphan module page renders then `getCourseForModule` throws (500) at `modules/[moduleSlug]/page.tsx`. Guarded by registry test `resolves every module to a course…` + validator phaseId check, so only reachable if tests skipped. Acceptable; no action required.

### L5. Validator doesn't tie id prefix to course
- `module-definition-validator.ts:31` accepts any `[a-z]+\d{2}`; `sd05` placed in `phase-2` (DevOps) passes, shows in wrong course. Low risk (authoring mistake, visible on course page). Optional: registry test asserting all ids in a course share one prefix.

### L6. Prod env brand
- `EMAIL_FROM` default changed in `src/lib/env.ts`, but prod sets it explicitly (deployment-guide) → magic-link sender still "DevOps Learning Space" until Vercel env updated. Ops note only.

### L7. Redundant guard
- `dashboard/page.tsx:71` `nextModule && continueHref` — `continueHref` is truthy iff `nextModule` is. Also `activeCourse.title` at :74 compiles only via TS aliased-condition narrowing through `nextModule`'s initializer; fragile if someone adds a type annotation to `nextModule`. Prefer `{activeCourse && nextModule && …}`.

## Performance
Not an issue. `getModulesForCourse` = modules × `getPhaseById` linear find ≈ 36×11 comparisons; dashboard calls it ~2× per course + `getPhasesWithModules` per course → < 2k comparisons/render, microseconds. Landing `/` now runs 2 progress queries for signed-in users (was 0); page was already dynamic (session read), queries are user-scoped/indexed-by-user — fine. If ever wanted: memoize per-course module lists at module scope like `getAllProgressItemKeys`.

## Leftover single-course assumptions (grep)
- src/, scripts/: none. No `/roadmap` links, no `overallPercent`, no `curriculumPhases`, no `m\d{2}` regex outside validator (updated). `getPhasesWithModules` all callers pass courseId.
- docs/README: see M3.

## Validator / tests
- Registry tests: coverage of old "module → existing phase" moved into stronger "resolves to course + listed in exactly one phase" test. Per-course order uniqueness correct (SD can restart at 1). Course id/slug + phase id uniqueness + phase→course FK covered.
- `summarizeCourseProgress` tests cover empty-progress and failed-quiz-counts-as-started. Missing: empty module list (`[]` → percent 0, hasStarted false) — trivial add, relevant for SD.
- Gap: dashboard CTA selection untested (see M2).

## Positive
- Course derived from phase, no duplicated courseId on modules — single source of truth.
- `summarizeCourseProgress` pure + tested; `hasStarted` doc comment matches impl.
- 308 redirect preserves old bookmarks; 404 for unknown course via `notFound()` before any DB call.
- Validator gained phaseId existence check; script still runs standalone.

## Recommended actions
1. Decide M1 (new-user CTA) — fallback to first non-empty unfinished course.
2. M3 docs update before authoring SD modules.
3. M2 before SD content ships: most-recent-activity course + extract/test CTA picker.
4. L1 redirect-slug test; L2 empty-course section state; add `summarizeCourseProgress([])` test.

## Metrics
- Typecheck: pass (per lead); Tests: 43/43 pass (re-run); Lint: 0 (per lead); Coverage: not measured.

## Unresolved questions
1. M1: was dropping the dashboard CTA for zero-progress users intentional (per-course "Bắt đầu khoá này" considered sufficient)?
2. M2: is "first started course in display order" the intended continue rule, or should it follow most recent activity?
3. Should prod `EMAIL_FROM` be renamed alongside this deploy?
