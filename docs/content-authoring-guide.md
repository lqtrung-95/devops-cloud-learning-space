# Content Authoring Guide

How to write a curriculum module for Learning Space (multi-course). **Reference implementation:** `src/content/modules/m01-linux-shell/` — read it fully before writing a new module and match its depth, tone and structure (for System Design, also skim any already-registered `sdXX-*` module).

Source of truth for topics/labs per module:

| Course | Curriculum | Module id | Phase ids (file) |
|---|---|---|---|
| DevOps & Cloud | `docs/curriculum.md` | `m01`…`m17` | `phase-0`…`phase-5` (`src/content/devops-course-phases.ts`) |
| System Design | `docs/system-design-curriculum.md` | `sd01`…`sd19` | `sd-phase-0`…`sd-phase-4` (`src/content/system-design-course-phases.ts`) |
| Backend Development | `docs/backend-curriculum.md` | `b01`…`b19` | `b-phase-0`…`b-phase-4` (`src/content/backend-course-phases.ts`) |

A module's course is derived from its `phaseId` — there is no `courseId` field.

---

## 1. Audience & voice

- DevOps & Cloud learner: experienced software developer, new to DevOps. Goal: DevOps/SRE job, AWS-first.
- System Design learner: experienced developer (often has done the DevOps course), never designed large-scale systems. Goals: make sound architecture decisions at work **and** pass system design interviews (mid–senior).
- Backend Development learner: developer who can code but hasn't built a production backend end-to-end. Goal: Backend/Fullstack job, and confidence owning a real service (not just CRUD tutorials).
- Language: **Vietnamese**, keep English technical terms as-is (container, pipeline, VPC, pod…). Don't translate commands, flags, service names.
- Every concept: **ELI5 first** (everyday Vietnamese-life analogy: nhà hàng, chung cư, bưu điện, ship hàng, chợ, xe buýt…), **then** precise technical explanation. The analogy must map correctly onto the real mechanism — call out where the analogy breaks if it matters.
- Friendly, concrete, short paragraphs. Use real commands with realistic output. No filler.
- Technical accuracy matters more than cuteness. When a fact is version-sensitive (exam codes, deprecated features, pricing), phrase it so it stays true or say "kiểm tra tài liệu mới nhất".

## 2. Folder layout

```
src/content/modules/<id>-<slug>/
├── module-meta.ts              # ModuleDefinition export
├── lessons/<lesson-slug>.mdx   # 3–6 lessons
└── diagrams/<name>-diagram.tsx # ≥1 interactive diagram per lesson
```

- Folder name = module `slug` = `<id>-kebab-name` (e.g. `m02-networking`, `sd04-caching-cdn`). `id` = `mXX` or `sdXX`. Ids and slugs are unique across **all** courses.
- Lesson slugs, lab ids, quiz ids: kebab-case ASCII (`[a-z0-9-]`), **never rename after publishing** (they are progress keys stored in DB).
- File names kebab-case, descriptive (`dns-resolution-flow-diagram.tsx`).
- Only the lead edits `src/content/curriculum-registry.ts` and `src/content/lesson-content-loaders.ts` — authors never touch shared files (anything outside their own module folder).

## 3. `module-meta.ts`

Export one `const <id>CamelCaseModule: ModuleDefinition` (e.g. `sd04CachingCdnModule`) (see `src/content/content-types.ts`):

| Field | Rule |
|---|---|
| `phaseId` | a phase of the module's course (table at top) |
| `order` | module number within its course (M02 → 2, SD04 → 4) |
| `weeks` | e.g. `"Tuần 3"`, `"Tuần 5–6"` — from curriculum |
| `emoji` | one emoji |
| `eli5Summary` | 1–3 sentences, analogy, no jargon |
| `objectives` | 4–6 "after this module you can…" bullets |
| `lessons` | 3–6 items `{ slug, title, minutes, summary }` |
| `labs` | 2–5 labs from curriculum, each ≥3 concrete steps (commands in backticks). Optional `submission` — see §3a |
| `deliverable`, `successCriteria` | from curriculum |
| `resources` | 4–8 real, stable URLs (official docs first). `kind`: doc/book/course/tool/video/practice |
| `quiz` | 8–12 questions, 3–4 options, `answerIndex` 0-based, explanation references the analogy. Vary the correct index position. Test understanding/scenarios, not trivia. Explanations double as flashcard backs for the spaced-repetition review (`/review`) — keep them standalone-readable. If the question text can't be answered without seeing the options (e.g. "which of the following…"), add `recallPrompt`: a standalone rephrasing used as the flashcard front instead — validated by `pnpm validate:module` |

Backticks in lab steps, quiz text and step-diagram descriptions render as inline code.

## 3a. Lab submission (auto-graded & evidence-only labs)

**Status: live on M01–M04 of the DevOps course.** Every other module's labs stay self-ticked (no `submission` field) until further validated — do not add `submission` to other modules without checking with the lead first.

`checks: []` = evidence-only lab: it hides the legacy self-tick checkbox (same as a graded lab) but any non-empty paste is stored and marks the lab done, with no grading.

A lab's optional `submission: LabSubmissionSpec` (`src/content/content-types.ts`) turns its self-tick checkbox into a graded "nộp kết quả" form: the learner pastes real command output, the server grades it against author-written checks, and a full pass writes the same `progress_item` row the checkbox used to.

```ts
submission: {
  inputKind: "output" | "url" | "value", // "output" → textarea; "url"/"value" → single-line input
  prompt: "Vietnamese: the exact command to run and what to paste back",
  checks: [
    {
      id: "kebab-case-stable-id",       // stored in submission history — never rename once published
      label: "Vietnamese: what this check verifies (shown BEFORE submitting)",
      hint: "Vietnamese: shown only on failure — nudge, never restate the matcher",
      matcher: { kind: "contains", value: "…" }, // or regex / numberInRange / jsonHasKeys
    },
  ],
},
```

**4 matchers only** (`src/lib/progress/lab-submission-grader.ts`), each total (never throws):

| Matcher | Fields | Use when |
|---|---|---|
| `contains` | `value`, `caseSensitive?` | Substring must appear (whitespace-normalized, case-insensitive by default) |
| `regex` | `pattern`, `flags?` (subset of `ims` only — no `g`) | A shape/pattern must appear anywhere in the paste |
| `numberInRange` | `pattern` (**exactly 1** capture group), `min?`, `max?` | A captured number must fall in range — e.g. a CLI's own exit code or count |
| `jsonHasKeys` | `keys` (dot-paths) | Paste must parse as JSON and contain every key |

**Writing checks that survive contact with a real machine:**

- **Match invariants, never machine-specific values.** No usernames, image ids, absolute paths, timestamps — a wrong-but-honest paste from a different machine must still pass. Prefer the tool's own summary/exit-code output over parsing full structured output (see next point).
- **Prefer stable CLI contracts over fragile structured output.** `docker compose ps --format json` prints **one JSON object per line** (not one array) and each line's `Publishers` field embeds nested `{}` — this breaks naive `[^}]*`-scoped regex and defeats `jsonHasKeys` outright (multiple top-level JSON values isn't valid JSON). The M04 `compose-full-stack` check uses the **table form** (`docker compose ps`, no `--format json`) with a per-row `regex`. Likewise, `trivy-scan-fix`'s "Total: N (CRITICAL: N)" summary line is **absent** when a scan is fully clean — instead of parsing that line, the check asks for `trivy … --exit-code 1 --ignore-unfixed …; echo "EXIT_CODE=$?"` and grades the exit code, which Trivy documents as a stable contract.
- **Prefer a labelled, machine-readable echo over parsing a tool's human table.** Make the shell print `echo "TIMER_ACTIVE=$(systemctl is-active backup.timer)"` or `cmd; echo "EXIT_CODE=$?"` rather than grading column-formatted output (`systemctl list-timers`, `docker ps`) — the latter is terminal-width dependent and truncates; a labelled token is not.
- **`numberInRange` over a `$(… | wc -l)` value must tolerate padding.** BSD/macOS `wc -l` emits leading spaces (`LABEL=       0`) — write the pattern `LABEL=\s*(\d+)`, never `LABEL=(\d+)`.
- **Avoid `$` anchors in `regex` matchers.** A paste from a Windows terminal carries `\r` before `\n`, so `\S+$` silently fails. Use a leading `^…` with the `m` flag plus a negative lookahead (`^User=(?!root\b)\S`) instead of a trailing anchor.
- **`hint` is public.** It ships to the browser (`PublicLabSubmissionSpec`) so the learner can see it on failure — never let it restate the matcher (e.g. never put the literal regex or expected string in a hint).
- **Actually run the command before authoring the check.** Reconstructing "plausible" output from memory is the top failure mode — Trivy's clean-scan output shape, `docker compose ps --format json`'s per-line structure, and `id`'s exact field order all differ from what you'd guess.
- Validate with `pnpm validate:module <slug>` — it compiles every `regex`/`numberInRange` pattern and checks flags, ids, and non-empty prompts/labels/hints for any lab with `submission`.

**Security:** matchers (`regex`/`pattern`/`value`/`keys`) are stripped before a lab reaches the browser via `toPublicLabSubmissionSpec` (`src/content/curriculum-lookup.ts`) — the client component only ever receives `{ inputKind, prompt, checks: [{ id, label, hint }] }`. Never bypass this projection when wiring a lab into a page.

## 4. Lesson MDX template

Every lesson MUST contain, in this order:

1. `import { XDiagram } from "../diagrams/x-diagram";` (relative import, top of file)
2. `<Eli5 title="… giống như …" emoji="…">` analogy (2–4 short paragraphs)
3. Short "why it matters" paragraph tied to the course goal — DevOps work, or real systems/interviews for System Design (optional heading)
4. The interactive diagram `<XDiagram />` (can also be placed inside/after Technical)
5. `<Technical>` … precise explanation with `###` subheadings, tables, fenced code (`bash`, `yaml`, `hcl`, `ini`, `json`, `dockerfile`…; optional `title="path"`) … `</Technical>`
6. `## Thực hành` + `<Terminal commands={[...]} />` with comment/command/output
7. `<Callout type="mistake">` common mistake(s); `tip` / `warning` / `info` / `cost` (AWS cost traps!) as useful
8. `<KeyTerms terms={[{ term, meaning }]} />` 5–8 terms
9. `<QuickCheck question options answerIndex explanation />`

Target length: roughly 120–220 lines of MDX per lesson.

### Global MDX components (no import needed)

| Component | Props |
|---|---|
| `Eli5` | `title: string`, `emoji?: string`, children |
| `Technical` | `title?: string` (default "Nói kỹ thuật hơn"), children |
| `Callout` | `type?: "tip" \| "warning" \| "mistake" \| "info" \| "cost"`, `title?`, children |
| `Terminal` | `commands: { command: string; output?: string; comment?: string }[]`, `title?`, `prompt?` |
| `KeyTerms` | `terms: { term: string; meaning: string }[]`, `title?` |
| `QuickCheck` | `question`, `options: string[]`, `answerIndex`, `explanation` |

### MDX pitfalls

- Blank line after opening and before closing tag of `<Eli5>`, `<Technical>`, `<Callout>` when children are markdown. Don't indent markdown inside by 4+ spaces (becomes code block).
- In plain text, `{`, `}` and `<` are JSX — wrap in backticks or use fenced code. Inside backticks/fences they're safe.
- Multiline strings in props: use `"line1\nline2"`. Escape `"` inside JS strings as `\"`.
- In GFM tables, escape pipes inside inline code as `\|`.
- No frontmatter, no `export const metadata`.

## 5. Interactive diagrams

Diagrams are client components in the module's `diagrams/` folder, using the shared kit (read-only for authors):

- `@/components/diagrams/diagram-frame` → `DiagramFrame({ title, viewBox, caption?, controls?, children })` — static or custom-interactive diagram wrapper.
- `@/components/diagrams/step-diagram` → `StepDiagram({ title, viewBox, steps: { title, description }[], children: (step) => svg })` — prev/next/autoplay walkthrough. **Preferred for processes/flows.**
- `@/components/diagrams/diagram-shapes`:
  - `DiagramNode({ x, y, width, height, label, sublabel?, emoji?, tone?, state?: "normal"|"active"|"dimmed", rounded?, dashed?, onClick? })`
  - `DiagramArrow({ from: [x,y], to: [x,y], label?, tone?, animated?, dimmed?, curve?, bidirectional? })`
  - `DiagramLabel({ x, y, text, anchor?, size?, tone?, bold? })`
  - `MovingPacket({ path, durationSeconds?, tone?, label?, repeat?, delaySeconds? })` — animated dot along an SVG path (give it a `key` to replay)
  - `DiagramGroupBox({ x, y, width, height, label, tone?, children? })` — dashed container (VPC, cluster, server)
- Tones: `blue | green | amber | rose | violet | slate | cyan` (theme-aware; don't hardcode hex colors). For raw SVG text use classes like `fill-stone-800 dark:fill-stone-200`.

Rules:

- Start file with `"use client";`. Export a named component `XxxDiagram`.
- ViewBox ~720 wide (height 240–360). Font sizes ≥ 11. Keep labels short; Vietnamese is fine.
- Interaction must teach something: step through a flow, toggle a scenario (success vs failure), click an element to reveal its role, flip a setting and watch the effect. Patterns in M01: clickable tree (`filesystem-tree-diagram`), toggle builder (`permission-builder-diagram`), step walkthroughs (`systemd-service-lifecycle-diagram`, `ssh-key-authentication-diagram`), data transform per step (`shell-pipeline-diagram`), scenario switch + steps (`backup-script-flow-diagram`).
- Keep each diagram file < 200 lines; state with `useState` only; no new dependencies; no `useEffect` state syncing.
- Never import server-only modules or the registry into a diagram.

## 6. System Design specifics

Applies to `sdXX` modules, on top of everything above.

- **Trade-offs are the content.** Every lesson that presents a choice ends its `<Technical>` part with a GFM table: `| Lựa chọn | Ưu | Nhược | Dùng khi |`. Say when you would change your mind.
- **Numbers with assumptions.** Estimates show the assumption first (`DAU 10M, mỗi user 5 lần đọc/ngày ⇒ …`), round like the cheat-sheet in `docs/system-design-curriculum.md` (Phụ lục B), and hedge throughput claims (`cỡ`, `tuỳ workload — cần benchmark`). Never state a vendor's QPS as fact.
- **Hands-on = the `sd-playground`.** Labs and `## Thực hành` use the Docker Compose playground (Nginx, Node/TypeScript app, Postgres, Redis, Redpanda, MinIO, k6, Toxiproxy) with real commands (`docker compose up -d`, `k6 run`, `redis-cli`, `psql`, `rpk`). Short TypeScript snippets in fenced `ts` blocks are fine; keep them runnable and < 40 lines. Terminal output must be realistic, not invented precision.
- **Interview angle.** Add one `<Callout type="info" title="Góc phỏng vấn">` per lesson: how the topic shows up in an interview and what a strong answer mentions.
- **Case-study modules (SD14–SD19)** structure lessons along the framework from SD01: requirements → ước lượng → API & data model → high-level design → deep dives → bottlenecks & trade-offs. At least one lab per module is a design doc using Phụ lục A.
- **Say things precisely** where people commonly get them wrong: CAP only applies during a partition; "exactly-once" is at-least-once + idempotency; retries need jitter; Redis is not the source of truth unless configured and justified.
- **Diagram ideas that teach:** step through a request path (LB → app → cache → DB); toggle cache hit vs miss; slider/toggle for replication lag or `N/W/R` quorum; kill-a-node scenario switch (leader election, failover); fan-out push vs pull comparison. `cost` callouts may be used for cloud/egress/storage costs.

## 7. Backend Development specifics

Applies to `bXX` modules, on top of everything above.

- **One codebase, no exceptions.** Every lab edits the SAME repo, `taskflow-api` — never invent a different app name, a different DB name, or a different port. `docs/backend-curriculum.md` §3 is the single source of truth for its stack, `docker-compose.yml` services/ports, Postgres user/db (`taskflow`/`taskflow`/`taskflow`), and the full domain schema (table names, columns) — **quote the exact values from that section**, don't improvise or "helpfully" rename anything, even if a different name feels more natural. (This course's SD siblings didn't have this rule and 13 of 19 modules drifted to different Postgres credentials before a lead review caught it — don't repeat that here.)
- **Assume the prior modules' code exists.** A `bXX` lesson's lab builds directly on what `b01…b(XX-1)` already added to `taskflow-api` (schema, routes, middleware). Don't re-scaffold something an earlier module already built; extend it. If your lab needs a new service not yet in the compose table (§3), say explicitly "thêm service X vào `docker-compose.yml`: image Y, port Z" — never assume a service exists that isn't in that table or wasn't added by an earlier, already-shipped module.
- **Real, runnable TypeScript.** This course is closer to "pair-programming a real backend" than to conceptual explanation. Code blocks in `## Thực hành`/labs must be real, complete-enough-to-run TypeScript/Fastify/Drizzle snippets (not pseudo-code), with realistic terminal output from actually reasoning through what the command would print — don't invent suspiciously precise numbers.
- **Test-backed claims.** From B07 onward, any lesson that changes behavior should show the test that proves it (or say which existing test would catch a regression).
- **Trade-off tables still apply** wherever there's a real choice (JWT vs session, REST vs GraphQL, monolith vs split service) — same GFM table convention as System Design's guide (§6).
- **Security and correctness callouts.** Prefer `<Callout type="warning">` for things that look fine but are exploitable (missing `organization_id` filter, JWT without expiry, unparameterized query) — this course's learner is expected to internalize these as reflexes, not trivia.
- **Diagram ideas that teach:** request lifecycle through Fastify hooks; JWT/refresh-token issue-and-verify sequence; a transaction that rolls back mid-way; cache-aside hit/miss with invalidation; queue job retry-then-dead-letter; gRPC call between `api` and `notification-service` with a kill-and-recover scenario; API gateway routing `v1`/`v2` to the same service.

## 8. Validate before handing off

```bash
pnpm validate:module <id>-slug   # structure, editorial rules, MDX compiles
pnpm typecheck 2>&1 | grep "modules/<id>-" # must print nothing
pnpm exec eslint src/content/modules/<id>-slug
```

`validate:module` enforces: 3–6 lessons, ≥2 labs (≥3 steps), 8–12 quiz questions with valid answers, every lesson has `<Eli5>`, `<Technical>`, `<KeyTerms>`, `<QuickCheck>` and imports an existing diagram. For any lab with `submission` (§3a): non-empty prompt, kebab-case+unique check ids, non-empty labels, and every `regex`/`numberInRange` pattern compiles with allowed flags.

## 9. Checklist

- [ ] Topics & labs cover the module section in the course's curriculum doc
- [ ] Every lesson: ELI5 → diagram → technical → hands-on → mistakes → key terms → quick check
- [ ] Every diagram interactive (steps, toggles or clicks) and readable in light/dark
- [ ] Commands are real and correct; outputs realistic
- [ ] (M01–M04) Every `submission` check verified by actually running the command — not reconstructed from memory; matchers key on invariants, never machine-specific values
- [ ] Quiz answers verified; correct option positions varied; option-dependent questions have a `recallPrompt`
- [ ] Validation, typecheck, eslint clean for owned folder
- [ ] (Backend/System Design) Every shared-stack detail (service name, port, user/db, table/column name) copied verbatim from the curriculum doc's canonical spec, not improvised
