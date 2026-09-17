# Backend Development Course (b01-b19) — Content Quality & Cross-Module Consistency Review

Scope: 19 modules registered in `src/content/curriculum-registry.ts`, checked against `docs/backend-curriculum.md` §2/§3 and `docs/content-authoring-guide.md` §7. Structural checks (lesson/quiz counts, MDX components) already covered by `pnpm validate:module` — not re-reviewed.

## Overall Assessment

Unlike the System Design course's credential drift the spec explicitly warns about, this cohort held the line: Postgres user/db (`taskflow`/`taskflow`/`taskflow`), ports (`5434→5432`, `6380→6379`), and every compose service (`minio`, `worker`, `notification-service`, `nginx`) match §3 verbatim in every module that touches them, with each new service explicitly called out as an addition in the module that introduces it (B08 minio, B09 worker, B13 notification-service, B17 nginx). The cumulative `taskflow-api` narrative holds together end-to-end: B04→B05→B06→B07→B09→B11→B12→B13→B14→B18 all reference the exact table/column names and function names the modules before them actually established. No critical or high-severity issues found.

## Critical Issues
None found.

## High Priority
None found.

## Medium Priority

1. **B12 GraphQL lab overstates B04 code state (module-meta.ts:55, lesson `resolvers-service-layer-and-authorization.mdx:17`).** Lab step says `getProjectById` is "hàm Drizzle đã dùng ở route REST tương ứng từ B04" (the function already used by the corresponding B04 REST route). Grepped B02/B03/B04 lessons and module-meta — no named query functions (`getProjectById`, `getTaskById`, etc.) exist anywhere before B12; B04's actual lab inlines `db.select()` directly in route handlers. The lesson body itself is more careful ("không phải kiến trúc mới — chỉ là đặt tên rõ ràng cho các hàm Drizzle vốn đã tồn tại", i.e. naming inline query *logic* that existed, not literal named functions), but the module-meta lab step's wording implies the function itself pre-dates B12. Not a functional bug — B12 does the extraction in its own lab step — but the phrasing could mislead a learner searching earlier modules for a function that was never written. Low-cost fix: reword to "logic Drizzle đã có sẵn (viết trực tiếp trong route B04)" instead of implying a pre-existing named function.

## Low Priority

1. **B17 CI workflow uses `postgres:5432`/`redis:6379` as GitHub Actions `services:` ports** (`b17.../ci-pipeline-lint-typecheck-test-build.mdx:34,42`), not the compose `5434/6380` host mapping. Verified this is correct, not drift: GH Actions `services:` containers are separate from `docker-compose.yml` and conventionally expose the container's native port directly to the runner — flagging only so a future reviewer doesn't mistake it for spec violation on a shallow grep.

## Edge Cases / Continuity Checks Performed (all passed)

- **B13/B14 data-ownership consistency** (the review's highest-risk item): B13 (`dung-notification-service-va-goi-tu-worker.mdx:11`) explicitly decides `notification-service` gets no Postgres connection, `worker` keeps owning `notifications`. B14 (`outbox-pattern-va-bai-toan-dual-write.mdx:11`, `data-ownership-khi-tach-notification-service.mdx:13-20`) builds the `outbox` table in `taskflow-api`'s own Postgres and reiterates the same boundary (relay in `worker` polls `outbox`, calls gRPC — `notification-service` never touches Postgres). Fully consistent.
- **B06 RBAC vs B04/B05 schema**: `require-role-middleware.mdx` and `multi-tenant-organization-scoping.mdx` use `memberships.userId/organizationId/role`, `projects.organizationId`, JOIN `tasks.projectId → projects.organizationId` — exact match to B04/B05 column names.
- **B07 testing vs B06 (written before B06 shipped)**: B07 only asserts generic `403`/`404` behavior for cross-tenant calls and references "middleware `requireRole`/lọc `organization_id` của B06" generically, never hard-codes an incompatible RBAC shape. Coherent with what B06 actually shipped.
- **B09 → B11 notifications schema**: B09 defines `notifications(user_id, type, payload jsonb, read_at)`; B11's Redis pub/sub lesson inserts/reads the exact same columns (`userId`, `type: "task_status_changed"`, `payload`). Match.
- **B18 v1/v2 split**: `/api/v1/tasks` unchanged, `/api/v2/tasks` reuses the same `listTasksByProject()` service call, only reshapes `status` to `{value,label}` in the serializer — old behavior demonstrably preserved, not re-derived.
- **B17/B18 nginx handoff**: B17 stands up nginx as a bare reverse proxy (single `location /`), explicitly scoped away from versioning/rate-limiting; B18 edits the same `nginx.conf` (no new compose service) to add `limit_req_zone` and `/v1`/`/v2` upstream routing. Clean division of labor, matches curriculum table's split of concerns.
- **API base path**: 314 occurrences of `/api/v1`, 30 of `/api/v2` across all modules; `/api/v2` occurs only in B18 (plus one contextual mention in B17's quiz explaining why v2 is out of scope for B17). No premature v2 usage.
- **Error format**: All literal `{ error: { code, ... } }` examples found (B03, B05, B11, B15) use the same `code`/`message`/`details` shape fixed in B03.

## Postgres/Redis/Service Convention Sweep (grep-verified across all 19 modules)

- No occurrences of `POSTGRES_USER`/`DATABASE_URL`/`REDIS_URL` with a value other than `taskflow`/`taskflow@postgres:5432/taskflow`/`redis:6379` (dev/compose context) — the only alternate host:port pairs found are GitHub Actions CI service ports (B17, legitimate, see Low Priority above) and correct host-vs-container port explanations (`5434` for host `psql`, `6380` for host `redis-cli`) that the modules themselves call out as host-only.
- `minio` (B08), `worker` (B09), `notification-service` (B13), `nginx` (B17) are each introduced with an explicit "thêm service X vào docker-compose.yml" step in the module the curriculum assigns, matching §3's port table exactly (`9002:9000`/`9003:9001` for minio, `50051:50051` for notification-service, `8081:80` for nginx).

## Numbering / Ordering

- `order`, `phaseId` (`b-phase-0`..`b-phase-4`), and `weeks` in every `module-meta.ts` (b01-b19) match `docs/backend-curriculum.md` §2's table exactly.
- No `id` collision across `b01-b19`, `m01-m17`, `sd01-sd19` (grep-verified, all unique).

## Resource URL Spot-Check

Filtered all external `url:` values in b01-b19 `module-meta.ts` down to the non-obviously-canonical ones (excluding OWASP/MDN/official framework docs already trusted). Remaining set is all legitimate: official docs (pino, Node.js, TypeScript, Zod, pnpm, restfulapi.net, debezium.io, GitHub Actions docs) and GitHub repos for the exact libraries used (`porsager/postgres`, `redis/ioredis`, `graphql/dataloader`, `grpc/grpc-node`, `mcollina/autocannon`, `siimon/prom-client`, `turkerdev/fastify-type-provider-zod`, `aws/aws-sdk-js-v3`). No dead/suspicious links identified without live-fetching (out of scope for this pass).

## Positive Observations

- The explicit "one decision, stated once, consistent downstream" framing in B13's data-ownership callout is a strong pattern — it correctly anticipates and defuses the exact cross-module risk the review was asked to check.
- B07 (written blind to B06) hedges correctly by testing behavior/contracts rather than internal implementation names, avoiding the guess-the-sibling's-shape trap entirely.
- B18's explicit contrast ("nginx.conf không chứa bất kỳ dòng nào biết về status là string hay object") is a good instance of module authors keeping cross-layer boundaries honest in the narrative itself.

## Recommended Actions

1. (Optional, cosmetic) Reword B12 module-meta.ts:55 lab step to avoid implying `getProjectById` existed as a named function since B04 — it didn't; the inline query logic did.
2. No blocking fixes required before merge.

## Unresolved Questions

- None requiring user input. All items above are either informational or a one-line wording nit.
