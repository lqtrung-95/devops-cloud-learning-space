# Phase 05 — Test, review, docs, push

**Priority:** P1 · **Status:** pending · **Depends on:** 04

## Steps
1. Vitest: progress calc, item-key validation, quiz grading, registry integrity (unique ids, every lesson loads, quiz answer index in range)
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
3. Manual E2E in browser: magic link login via Mailpit → complete lesson → lab check → quiz → dashboard updates
4. Code review (code-reviewer agent) → fix findings
5. Docs: README (setup), `docs/system-architecture.md`, `docs/content-authoring-guide.md`
6. Conventional commits, push `main`
