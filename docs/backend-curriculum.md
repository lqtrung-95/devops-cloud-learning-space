# Chương trình học Backend Development (Node.js/TypeScript)

> **Hồ sơ người học:** Developer đã có kinh nghiệm code, muốn vững backend production thật (không chỉ CRUD tutorial).
> **Mục tiêu:** Đủ năng lực ứng tuyển Backend/Fullstack (junior–mid), tự tin thiết kế và vận hành một service thật.
> **Thời lượng:** 24 tuần (~6 tháng) × ~10 giờ/tuần ≈ 240 giờ · 19 module · 5 phase.
> **Stack:** Node.js 22 + TypeScript, Fastify, Drizzle ORM + PostgreSQL 17, Redis, BullMQ.
> **Lab:** một app xuyên suốt duy nhất — **taskflow-api** — build dần qua 19 module, không phải lab rời rạc.

---

## 1. Nguyên tắc học

| Nguyên tắc | Cách áp dụng |
|---|---|
| **Code thật, không giả lập** | Mọi lab chỉnh sửa trực tiếp lên repo `taskflow-api` — không có bài học nào dùng pseudo-code cho phần lõi. |
| **Một app xuyên suốt** | `taskflow-api` (mô tả ở mục 3) là app duy nhất cho cả course — mỗi module thêm một lớp mới (auth → test → cache → GraphQL → gRPC → security → observability) lên đúng codebase đó. |
| **Test trước khi tự tin refactor** | Từ B07 trở đi, mỗi lab kết thúc bằng `pnpm test` xanh — không merge tính năng chưa có test. |
| **Bảo mật & vận hành không phải "thêm sau"** | Rate limit, input validation, structured log xuất hiện từ sớm (B03), không dồn hết vào cuối course. |
| **Đọc lỗi thật** | Lab cố tình tạo ra lỗi thật (race condition, N+1 query, memory leak nhỏ, mất connection) rồi sửa bằng công cụ thật (`EXPLAIN ANALYZE`, heap snapshot, `docker stats`). |
| **Học công khai** | Mỗi module viết 1 ghi chú ngắn (learnings.md) trong repo — tập luyện viết tài liệu kỹ thuật. |

---

## 2. Tổng quan lộ trình

```mermaid
flowchart LR
  P0["Phase 0<br/>Nền tảng REST<br/>T1–4"] --> P1["Phase 1<br/>Data & Identity<br/>T5–10"]
  P1 --> P2["Phase 2<br/>Nâng cao & Async<br/>T11–16"]
  P2 --> P3["Phase 3<br/>Kiến trúc & Production<br/>T17–21"]
  P3 --> P4["Phase 4<br/>Capstone<br/>T22–24"]
```

| Tuần | Phase | Module | Deliverable |
|---|---|---|---|
| 1 | 0 | B01 Node.js runtime & kiến trúc project | Repo `taskflow-api` khởi tạo, chạy bằng `docker compose up` |
| 2 | 0 | B02 HTTP & REST API với Fastify | CRUD `projects`/`tasks` in-memory, có route + hook đúng chuẩn |
| 3–4 | 0 | B03 Validation, error handling & API design | Response format chuẩn, Zod validation, OpenAPI doc tự sinh |
| 5–6 | 1 | B04 Database & ORM (Drizzle + Postgres) | Schema đầy đủ (mục 3), migration chạy được, CRUD nối DB thật |
| 7 | 1 | B05 Authentication (JWT & refresh token) | Đăng ký/đăng nhập, access+refresh token, hash password đúng cách |
| 8 | 1 | B06 Authorization & multi-tenant RBAC | Role owner/admin/member theo `organization`, middleware phân quyền |
| 9–10 | 1 | B07 Testing backend | Unit + integration test, test DB riêng, coverage ≥ 70% phần lõi |
| 11 | 2 | B08 File upload & object storage | Upload attachment qua presigned URL (MinIO), giới hạn size/type |
| 12 | 2 | B09 Background job & scheduling | BullMQ worker xử lý notification + activity log, retry có giới hạn |
| 13 | 2 | B10 Caching cho backend | Cache-aside cho task list, invalidate đúng lúc, đo lại latency |
| 14 | 2 | B11 Realtime: WebSocket & SSE | Notification đẩy realtime khi task đổi trạng thái |
| 15–16 | 2 | B12 GraphQL API | Schema GraphQL song song REST, DataLoader chống N+1 |
| 17 | 3 | B13 gRPC & service nội bộ | Tách `notification-service` gRPC riêng, `api` gọi qua gRPC |
| 18 | 3 | B14 Tách microservice & event-driven | Outbox pattern, `notification-service` tự chạy độc lập qua queue |
| 19 | 3 | B15 Security cho backend | OWASP Top 10, rate limiting, helmet-equivalent, secrets management |
| 20 | 3 | B16 Observability cho backend | Structured logging, request tracing, metrics `/metrics` |
| 21 | 3 | B17 Container hoá & CI/CD | Multi-stage Dockerfile, healthcheck, GitHub Actions pipeline |
| 22 | 4 | B18 API Gateway & backward compatibility | Versioning `v1`/`v2`, deprecation header, gateway rate limit |
| 23–24 | 4 | B19 Capstone: production hardening | Load test toàn bộ taskflow-api, design doc, checklist production-ready |

> **Buffer:** Nếu chậm, ưu tiên hoàn thành lab của module hiện tại trước khi sang module mới — mỗi module đều giả định codebase module trước đã chạy được.

---

## 3. taskflow-api — app xuyên suốt (BẮT BUỘC đọc trước khi viết bất kỳ module nào)

`taskflow-api` là backend quản lý dự án/công việc kiểu Trello/Jira thu nhỏ — đủ phức tạp để cần auth, phân quyền, file, job nền, cache, realtime, và tách service. **Toàn bộ 19 module dùng chung một spec dưới đây — không được đổi tên biến, port, hay service.** (Bài học từ course System Design: 19 tác giả viết song song từng lệch quy ước Postgres user/db — spec này tồn tại để việc đó không lặp lại.)

### Stack & repo
- Node.js 22, TypeScript strict, ESM (`"type": "module"`).
- Web framework: **Fastify 5**. Validation: **Zod**. ORM: **Drizzle ORM** + driver `postgres` (postgres-js). Test: **Vitest**. Log: **pino**.
- Thư mục: `taskflow-api/` với `src/app.ts` (Fastify instance), `src/routes/`, `src/db/schema.ts`, `src/db/client.ts`, `src/plugins/`, `db/init.sql`, `docker-compose.yml`, `Dockerfile`.

### docker-compose.yml — services cố định (thêm dần, không đổi service đã có)
| Service | Image | Port (host:container) | Giới thiệu ở |
|---|---|---|---|
| `api` | build từ `Dockerfile` (base `node:22-slim`) | `3000:3000` | B01 |
| `postgres` | `postgres:17` | `5434:5432` | B01 |
| `redis` | `redis:7` | `6380:6379` | B01 |
| `minio` | `minio/minio` (`server /data --console-address ":9001"`) | `9002:9000`, `9003:9001` | B08 |
| `worker` | cùng image `api`, override `command: ["npm", "run", "worker"]` | (không cần expose port) | B09 |
| `notification-service` | build riêng `notification-service/Dockerfile` (base `node:22-slim`) | `50051:50051` (gRPC) | B13 |
| `nginx` | `nginx:1.27` | `8081:80` | B17 |

Biến môi trường Postgres **cố định cho mọi module**: `POSTGRES_USER=taskflow`, `POSTGRES_PASSWORD=taskflow`, `POSTGRES_DB=taskflow`. Mọi lệnh `psql` trong lab dùng đúng `docker compose exec postgres psql -U taskflow` (không dùng `postgres`, `app`, hay tên khác). `DATABASE_URL=postgres://taskflow:taskflow@postgres:5432/taskflow` (cổng container luôn là `5432`, chỉ cổng host là `5434`). `REDIS_URL=redis://redis:6379`.

### Domain model (giới thiệu ở B04, KHÔNG đổi tên bảng/cột ở module sau)
```
users            (id uuid pk, email text unique, password_hash text, name text, created_at)
organizations    (id uuid pk, name text, slug text unique, created_at)
memberships      (user_id fk users, organization_id fk organizations, role text check in ('owner','admin','member'), primary key(user_id, organization_id))
projects         (id uuid pk, organization_id fk, name text, created_at)
tasks            (id uuid pk, project_id fk, title text, description text, status text check in ('todo','in_progress','done'), assignee_id fk users nullable, created_at, updated_at)
comments         (id uuid pk, task_id fk, author_id fk users, body text, created_at)
attachments      (id uuid pk, task_id fk, url text, filename text, size_bytes bigint, uploaded_by fk users, created_at)
notifications    (id uuid pk, user_id fk, type text, payload jsonb, read_at timestamptz nullable, created_at)
activity_logs    (id bigserial pk, organization_id fk, actor_id fk users, action text, entity_type text, entity_id uuid, metadata jsonb, created_at)
webhooks         (id uuid pk, organization_id fk, url text, secret text, events text[], created_at)
```
`users`/`memberships` được tạo ở B05 (auth) chứ không phải B04 — B04 chỉ tạo `organizations`/`projects`/`tasks`/`comments` và **để chỗ** cho B05 thêm `users`/`memberships` bằng migration tiếp theo. Không module nào được tạo bảng trùng tên khác cấu trúc trên.

### Quy ước API
- Base path `/api/v1` từ B02 (để B18 có chỗ thêm `/api/v2` mà không phá version cũ).
- Response lỗi chuẩn (chốt ở B03, dùng xuyên suốt): `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.
- Response thành công: trả thẳng resource hoặc `{ "data": [...], "meta": { "cursor": "..." } }` cho danh sách (cursor pagination, không dùng offset).

Bất kỳ module nào cần thêm service/bảng mới **phải** nêu rõ trong lesson: "thêm service X vào `docker-compose.yml` với cấu hình Y" — không được giả định service đã tồn tại nếu bảng trên chưa liệt kê nó ở module trước.

---

## 4. Chi tiết từng module

### Phase 0 — Nền tảng Node.js & REST API (Tuần 1–4)

#### B01. Node.js runtime & kiến trúc project · Tuần 1

**Mục tiêu:** Hiểu event loop, dựng khung project TypeScript chuẩn, chạy được `taskflow-api` bằng Docker Compose.

**Chủ đề:** Event loop & non-blocking I/O (ELI5 trước, rồi cơ chế thật: call stack, callback queue, microtask); CommonJS vs ESM; `tsconfig.json` cho backend (strict, `NodeNext`); cấu trúc thư mục theo layer (routes/services/db); quản lý config bằng biến môi trường (`dotenv` + validate bằng Zod); dựng `docker-compose.yml` ban đầu (`api`, `postgres`, `redis`).

**Lab:** Khởi tạo repo `taskflow-api` đúng cấu trúc; viết `Dockerfile` multi-stage tối giản; dựng 3 service đầu bằng Compose theo đúng bảng ở mục 3; viết 1 script Node nhỏ minh hoạ thứ tự thực thi event loop (`setTimeout` vs `Promise` vs `process.nextTick`) và giải thích output thật.

**Tiêu chí đạt:** `docker compose up -d` chạy sạch cả 3 service; giải thích đúng thứ tự log của lab event loop.

**Tài liệu:** Node.js docs — Event Loop, Timers, and process.nextTick(); TypeScript Handbook; Fastify docs — Getting Started; Docker Compose docs.

---

#### B02. HTTP & REST API với Fastify · Tuần 2

**Mục tiêu:** Dựng REST API thật với Fastify: routing, hook, request/response đúng semantics HTTP.

**Chủ đề:** HTTP method & status code đúng nghĩa (200/201/204/400/404/409/422); Fastify plugin system & encapsulation; lifecycle hooks (`onRequest`, `preHandler`, `onSend`); route schema cơ bản; content negotiation; REST resource naming (số nhiều, nested resource `/projects/:id/tasks`).

**Lab:** CRUD in-memory cho `projects` và `tasks` (chưa có DB, dùng Map) đúng REST convention; viết middleware log request bằng hook; test bằng `curl`/Postman xác nhận đúng status code cho từng case (tạo thành công, thiếu field, không tìm thấy resource).

**Tiêu chí đạt:** Mọi endpoint trả đúng status code kể cả các case lỗi; route tổ chức theo plugin, không phải 1 file khổng lồ.

**Tài liệu:** Fastify docs — Routes, Hooks, Plugins; MDN — HTTP response status codes; REST API Tutorial (restfulapi.net).

---

#### B03. Validation, error handling & API design chuẩn · Tuần 3–4

**Mục tiêu:** API trả lỗi nhất quán, tự sinh doc, và không crash vì input xấu.

**Chủ đề:** Zod schema cho request body/query/params; Fastify schema validation + `setErrorHandler` tập trung; định dạng lỗi chuẩn (mục 3); pagination kiểu cursor; idempotency cho POST quan trọng; tự sinh OpenAPI bằng `@fastify/swagger`.

**Lab:** Thêm Zod schema cho toàn bộ route B02; viết error handler tập trung trả đúng format; thêm cursor pagination cho `GET /tasks`; expose `/docs` bằng Swagger UI.

**Tiêu chí đạt:** Gửi input sai kiểu/thiếu field luôn nhận `422` với format lỗi chuẩn; `/docs` hiển thị đúng toàn bộ route.

**Tài liệu:** Zod docs; Fastify docs — Validation and Serialization; Google API Improvement Proposals (google.aip.dev) — pagination; Stripe API docs (idempotency).

---

### Phase 1 — Data & Identity (Tuần 5–10)

#### B04. Database & ORM: Drizzle + PostgreSQL · Tuần 5–6

**Mục tiêu:** Thay in-memory bằng Postgres thật qua Drizzle ORM, hiểu migration và transaction trong code.

**Chủ đề:** Drizzle schema definition (`pgTable`); `drizzle-kit push`/`generate`/`migrate`; quan hệ 1-n/n-n bằng foreign key; transaction (`db.transaction`) cho thao tác nhiều bảng; N+1 query là gì và cách Drizzle relational query tránh nó; connection pooling cơ bản (driver `postgres`, `max`).

**Lab:** Định nghĩa schema `organizations`/`projects`/`tasks`/`comments` đúng mục 3; migrate vào Postgres của `taskflow-api`; chuyển toàn bộ route B03 từ Map sang Drizzle; viết 1 endpoint tạo task + activity log trong cùng transaction, cố tình cho transaction fail giữa chừng để chứng minh rollback.

**Tiêu chí đạt:** Restart container không mất dữ liệu (đã dùng volume); transaction rollback đúng khi lỗi giữa chừng.

**Tài liệu:** Drizzle ORM docs; PostgreSQL docs — Transactions; `postgres` (porsager) driver docs.

---

#### B05. Authentication: JWT & refresh token · Tuần 7

**Mục tiêu:** Đăng ký/đăng nhập an toàn, quản lý phiên bằng access + refresh token đúng cách.

**Chủ đề:** Hash password (`argon2` hoặc `bcrypt`, giải thích salt); JWT access token (thời hạn ngắn) + refresh token (lưu DB, thời hạn dài, revoke được); cookie `httpOnly`/`secure` vs Authorization header; luồng refresh & logout; rủi ro thường gặp (JWT không nên chứa dữ liệu nhạy cảm, không tự invalidate được nếu không có danh sách revoke).

**Lab:** Thêm bảng `users` + `memberships` (đúng schema mục 3) qua migration mới; endpoint `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`; access token 15 phút, refresh token 7 ngày lưu hash trong DB; viết test cố tình dùng token hết hạn và token đã revoke.

**Tiêu chí đạt:** Token hết hạn bị từ chối đúng; logout thực sự vô hiệu hoá refresh token trong DB (không chỉ xoá cookie).

**Tài liệu:** OWASP Authentication Cheat Sheet; jwt.io — Introduction; Auth0 blog — Refresh Token Rotation.

---

#### B06. Authorization & multi-tenant RBAC · Tuần 8

**Mục tiêu:** Một user có nhiều `organization`, mỗi nơi một role — API phải chặn đúng theo ngữ cảnh đó.

**Chủ đề:** RBAC (owner/admin/member) vs ABAC (thuộc tính); multi-tenancy ở mức application (mọi query lọc theo `organization_id`) vs mức database (row-level security — giới thiệu khái niệm, không bắt buộc làm); middleware `requireRole`; lỗi kinh điển: quên lọc `organization_id` dẫn tới rò dữ liệu giữa các tenant (IDOR).

**Lab:** Middleware xác định `organization` hiện tại từ token + param; chặn `member` không được xoá project; viết test cố tình gọi API bằng token của tổ chức A để sửa dữ liệu tổ chức B, xác nhận bị `403`/`404`.

**Tiêu chí đạt:** Không có endpoint nào truy vấn theo `id` mà thiếu điều kiện `organization_id`; test IDOR ở lab pass.

**Tài liệu:** OWASP Authorization Cheat Sheet; OWASP Top 10 — Broken Access Control; PostgreSQL docs — Row Security Policies (tham khảo).

---

#### B07. Testing backend · Tuần 9–10

**Mục tiêu:** Có bộ test đáng tin cậy để refactor không sợ vỡ, dùng cho toàn bộ phần còn lại của course.

**Chủ đề:** Kim tự tháp test (unit/integration/e2e) áp cho backend; test database riêng (schema tạm hoặc container riêng, không test lên DB dev); mocking dependency ngoài (không mock DB, mock thứ thật sự ngoài tầm kiểm soát như email/PSP); test transaction rollback sau mỗi test case; coverage có ý nghĩa vs coverage vô nghĩa.

**Lab:** Cấu hình Vitest + test DB riêng (compose profile hoặc DB khác trong cùng Postgres); viết integration test cho toàn bộ auth flow (B05) và RBAC (B06); test unit cho 1 hàm logic thuần (vd tính hạn chót); chạy `pnpm test -- --coverage` và đọc báo cáo.

**Tiêu chí đạt:** `pnpm test` chạy độc lập, không phụ thuộc thứ tự; xoá 1 dòng authorization check ở B06 phải làm ít nhất 1 test đỏ.

**Tài liệu:** Vitest docs; Martin Fowler — Test Pyramid; Kent C. Dodds — "Write tests. Not too many. Mostly integration."

---

### Phase 2 — Nâng cao & Async (Tuần 11–16)

#### B08. File upload & object storage · Tuần 11

**Mục tiêu:** Cho phép đính kèm file vào task mà không "cõng" file qua app server.

**Chủ đề:** Presigned URL upload thẳng lên object storage (MinIO, S3-compatible); giới hạn kích thước/loại file kiểm tra trước khi cấp URL; lưu metadata (`attachments`) sau khi upload xong (client báo lại hoặc webhook từ storage); virus-scan/kiểm tra nội dung là bước async (nối B09).

**Lab:** Thêm service `minio` vào compose (mục 3); endpoint `POST /tasks/:id/attachments/presign` trả presigned URL; client (script test) upload thẳng lên MinIO; endpoint xác nhận ghi bảng `attachments`.

**Tiêu chí đạt:** App server không bao giờ nhận toàn bộ file qua chính nó; giới hạn size/type được kiểm tra trước khi cấp URL.

**Tài liệu:** MinIO docs — Presigned URLs; AWS S3 docs — Uploading with presigned URLs (khái niệm áp dụng chung).

---

#### B09. Background job & scheduling · Tuần 12

**Mục tiêu:** Việc chậm/không cần đồng bộ (gửi notification, ghi activity log) chạy nền, không chặn response.

**Chủ đề:** Khi nào cần queue (nối lý do từ SD07 nếu người học đã qua course System Design, nhưng giải thích lại ngắn gọn ở đây cho người học độc lập); BullMQ (Redis-backed) — job, queue, worker, retry với backoff, dead-letter; cron job (BullMQ repeatable job) cho việc định kỳ (dọn refresh token hết hạn).

**Lab:** Thêm service `worker` vào compose (mục 3); chuyển việc ghi `activity_logs` và tạo `notifications` khi task đổi trạng thái sang job async; job retry tối đa 3 lần với backoff; 1 job định kỳ dọn refresh token hết hạn (nối B05).

**Tiêu chí đạt:** Request đổi trạng thái task trả response ngay, không chờ ghi log/notification; job lỗi được retry rồi rơi vào dead-letter sau 3 lần.

**Tài liệu:** BullMQ docs; Redis docs — Data Types (List/Sorted Set nền tảng của queue).

---

#### B10. Caching cho backend · Tuần 13

**Mục tiêu:** Giảm tải Postgres cho endpoint đọc nhiều bằng Redis, invalidate đúng lúc.

**Chủ đề:** Cache-aside cho `GET /projects/:id/tasks`; cache key theo tham số (bao gồm cursor/filter); invalidate khi có write (xoá key liên quan, không cache "mù"); TTL hợp lý; đo lại latency trước/sau bằng k6 hoặc `autocannon`.

**Lab:** Thêm cache-aside cho endpoint list task; invalidate cache đúng khi tạo/sửa/xoá task trong cùng project; đo p95 trước/sau bằng `autocannon`.

**Tiêu chí đạt:** Sau khi sửa 1 task, gọi lại list task phải thấy dữ liệu mới (không đọc cache cũ); có số đo latency trước/sau.

**Tài liệu:** Redis docs — Caching; AWS Builders' Library — "Caching challenges and strategies".

---

#### B11. Realtime: WebSocket & Server-Sent Events · Tuần 14

**Mục tiêu:** Đẩy notification tới client ngay khi có sự kiện, không cần client tự poll.

**Chủ đề:** WebSocket vs SSE — khi nào dùng cái nào cho notification 1 chiều; `@fastify/websocket`; xác thực kết nối WebSocket bằng token; phát sự kiện từ worker (B09) qua Redis pub/sub tới đúng client đang mở kết nối trên instance nào.

**Lab:** Endpoint SSE `/notifications/stream` phát notification realtime khi worker tạo notification mới; xác thực bằng token trên query param hoặc header khi mở kết nối; test bằng script client giữ kết nối và log sự kiện nhận được.

**Tiêu chí đạt:** Tạo comment ở 1 task phải đẩy notification realtime tới người liên quan đang mở kết nối, không cần refresh.

**Tài liệu:** MDN — Server-sent events; Fastify WebSocket plugin docs.

---

#### B12. GraphQL API · Tuần 15–16

**Mục tiêu:** Cung cấp thêm API GraphQL song song REST cho client cần truy vấn linh hoạt.

**Chủ đề:** Schema-first GraphQL (type, query, mutation); resolver gọi lại đúng service layer đã có (không viết logic riêng cho GraphQL); vấn đề N+1 ở resolver lồng nhau và cách DataLoader giải quyết bằng batching; khi nào GraphQL hợp lý hơn REST (client đa dạng, dữ liệu lồng sâu) và khi nào không (file upload, cache theo URL).

**Lab:** Dựng GraphQL endpoint bằng `mercurius` (plugin GraphQL chính thức của Fastify); query `project { tasks { comments { author } } }`; đo số query SQL sinh ra trước/sau khi thêm DataLoader cho `author`.

**Tiêu chí đạt:** Cùng 1 query lồng 3 cấp không sinh ra N+1 query SQL sau khi có DataLoader (đo bằng log SQL của Drizzle).

**Tài liệu:** GraphQL.org docs; Mercurius docs; DataLoader (GitHub, graphql/dataloader) README.

---

### Phase 3 — Kiến trúc dịch vụ & Production (Tuần 17–21)

#### B13. gRPC & giao tiếp service nội bộ · Tuần 17

**Mục tiêu:** Tách một phần logic thành service riêng, giao tiếp bằng gRPC thay vì HTTP JSON.

**Chủ đề:** Vì sao gRPC cho giao tiếp nội bộ (Protocol Buffers nhị phân, HTTP/2, streaming, contract rõ ràng qua `.proto`); unary vs streaming RPC; sinh code từ `.proto`; so sánh nhanh với REST nội bộ (độ trễ, tooling, khả năng debug).

**Lab:** Viết `.proto` cho `NotificationService` (`SendNotification`, `StreamNotifications`); dựng `notification-service` (service Node riêng, thêm vào compose theo mục 3) implement service đó; `api` gọi `SendNotification` qua gRPC thay vì gọi hàm trực tiếp.

**Tiêu chí đạt:** `api` và `notification-service` chạy 2 process riêng, giao tiếp qua gRPC; đổi `.proto` (thêm field) không làm vỡ service cũ (backward compatible field numbering).

**Tài liệu:** grpc.io docs — Node.js quickstart; Protocol Buffers docs — Proto3 Language Guide.

---

#### B14. Tách microservice & event-driven · Tuần 18

**Mục tiêu:** `notification-service` tự chạy độc lập, nhận việc qua queue thay vì bị gọi trực tiếp — chịu được lúc `api` bận hoặc `notification-service` tạm chết.

**Chủ đề:** Outbox pattern (ghi event cùng transaction với nghiệp vụ, relay đẩy đi sau — nối kiến thức từ B04 transaction); event-driven vs request/response cho giao tiếp service; data ownership khi tách service (notification-service có DB/bảng riêng, không đọc thẳng bảng của `api`).

**Lab:** Thêm bảng `outbox` vào `taskflow-api`; relay (chạy trong `worker`) đọc `outbox` và gọi gRPC `SendNotification`; kill `notification-service` giữa lúc có traffic, chứng minh không mất event khi service sống lại.

**Tiêu chí đạt:** Tắt `notification-service` 30 giây trong lúc user vẫn tạo comment — khi bật lại, toàn bộ notification vẫn được gửi, không trùng không thiếu.

**Tài liệu:** microservices.io — Transactional outbox; Chris Richardson — "Pattern: Database per service".

---

#### B15. Security cho backend · Tuần 19

**Mục tiêu:** Vá các lỗ hổng phổ biến nhất trước khi ra production.

**Chủ đề:** OWASP Top 10 áp cho `taskflow-api` cụ thể (injection, broken auth đã làm ở B05/B06, security misconfiguration, vulnerable dependencies); rate limiting theo user/IP; helmet-equivalent header (`@fastify/helmet`); CORS đúng cách (không `*` khi có cookie); quản lý secret (không hard-code, dùng `.env` + cảnh báo secret rò trong log/lỗi).

**Lab:** Thêm `@fastify/rate-limit` cho `/auth/login` (chặn brute-force) và toàn API (chặn abuse); thêm `@fastify/helmet` + cấu hình CORS đúng origin; chạy `npm audit`/`pnpm audit` và xử lý ít nhất 1 lỗ hổng thật tìm thấy; viết test cố tình gửi payload injection vào 1 trường text, xác nhận Drizzle (parameterized query) chặn được.

**Tiêu chí đạt:** Đăng nhập sai liên tục bị rate-limit; `pnpm audit` không còn lỗ hổng mức high/critical chưa xử lý.

**Tài liệu:** OWASP Top 10 (2021); OWASP Cheat Sheet Series; `@fastify/rate-limit` và `@fastify/helmet` docs.

---

#### B16. Observability cho backend · Tuần 20

**Mục tiêu:** Khi production lỗi, tìm ra nguyên nhân bằng log/metric/trace thay vì đoán.

**Chủ đề:** Structured logging (pino, mỗi log là JSON có `requestId`); request-id xuyên suốt 1 request (kể cả qua gRPC sang `notification-service`); metrics cơ bản (`/metrics` dạng Prometheus: request count, latency histogram, queue depth); phân biệt log/metric/trace dùng khi nào (nối khái niệm từ course DevOps M15 nếu đã học, giải thích lại ngắn gọn nếu chưa).

**Lab:** Thêm `requestId` sinh ở `onRequest` hook, truyền qua metadata gRPC sang `notification-service`, xuất hiện trong mọi dòng log liên quan tới request đó; expose `/metrics` bằng `prom-client`; tạo 1 lỗi 500 thật, dùng đúng `requestId` để lần từ log ra root cause.

**Tiêu chí đạt:** Từ 1 `requestId` trong log lỗi, lần được toàn bộ đường đi của request đó qua cả `api` và `notification-service`.

**Tài liệu:** pino docs; Prometheus docs — Instrumenting; Google SRE Book — Monitoring Distributed Systems (chương liên quan).

---

#### B17. Container hoá & CI/CD cho backend · Tuần 21

**Mục tiêu:** Build image gọn, chạy an toàn, và có pipeline tự động kiểm tra trước khi merge.

**Chủ đề:** Multi-stage Dockerfile (build stage tách khỏi runtime, không mang devDependencies vào image cuối); non-root user trong container; healthcheck & graceful shutdown (`SIGTERM` đóng kết nối DB/Redis đang mở trước khi thoát); pipeline CI tối thiểu (lint → typecheck → test → build image) — không đi sâu deploy (đó là phạm vi course DevOps).

**Lab:** Viết lại `Dockerfile` thành multi-stage, so sánh kích thước image trước/sau; thêm healthcheck endpoint `/healthz` (kiểm tra kết nối DB/Redis thật, không chỉ trả `200` cứng); xử lý `SIGTERM` đóng pool kết nối đúng cách; viết GitHub Actions workflow chạy lint/typecheck/test/build trên mỗi PR.

**Tiêu chí đạt:** Image cuối không chứa `devDependencies`; `docker stop` không làm mất request đang xử lý dở (graceful shutdown); CI đỏ khi test đỏ.

**Tài liệu:** Docker docs — Multi-stage builds; Docker docs — Node.js best practices (non-root user); GitHub Actions docs.

---

### Phase 4 — Capstone (Tuần 22–24)

#### B18. API Gateway & backward compatibility · Tuần 22

**Mục tiêu:** Thêm tính năng mới mà không phá client cũ; hiểu vai trò của gateway ở biên hệ thống.

**Chủ đề:** Versioning chiến lược (URL `/v1`/`/v2` đã chọn từ B03 — giờ thực sự dùng tới); deprecation header (`Deprecation`, `Sunset`) báo trước khi gỡ `v1`; API Gateway làm gì ở biên (rate limit tập trung, auth chung, routing) so với logic nghiệp vụ nằm trong service; breaking change vs non-breaking change (thêm field optional an toàn, đổi kiểu field là breaking).

**Lab:** Thêm `/api/v2/tasks` với response shape khác (đổi `status` từ string sang object `{ value, label }`), giữ nguyên `/api/v1/tasks`; thêm header `Deprecation`/`Sunset` cho `v1`; đặt `nginx` (đã thêm ở B17) làm gateway tối giản: rate limit + route `/v1`/`/v2` về đúng `api`.

**Tiêu chí đạt:** Client cũ gọi `v1` không nhận thấy thay đổi gì; client mới gọi `v2` thấy shape mới; cả hai chạy cùng lúc trên cùng service.

**Tài liệu:** RFC 8594 — The Sunset HTTP Header Field; Stripe API versioning docs (tham khảo cách một API thật xử lý version); Google AIP — Backward compatibility.

---

#### B19. Capstone: production hardening · Tuần 23–24

**Mục tiêu:** Nhìn lại toàn bộ `taskflow-api` bằng con mắt production, đo đạc thật, viết tài liệu thật.

**Chủ đề:** Checklist production-readiness (health check, graceful shutdown, log, rate limit, backup DB, secret management — tổng hợp từ B01–B18, không dạy khái niệm mới); load test toàn hệ thống (không chỉ 1 endpoint); viết design doc ngắn mô tả kiến trúc hiện tại + điểm còn yếu + hướng cải thiện.

**Lab:** Chạy k6/`autocannon` load test kịch bản thật (đăng nhập → tạo project → tạo task → comment → upload file) đo p95/p99 và tìm bottleneck đầu tiên vỡ; điền checklist production-readiness cho `taskflow-api`, đánh dấu mục nào đã làm/mục nào cố ý bỏ qua (nêu lý do); viết 1 design doc ngắn (kiến trúc hiện tại, 3 điểm sẽ cải thiện nếu có thêm 1 tháng, ước lượng chi phí hạ tầng tối thiểu để chạy thật).

**Tiêu chí đạt:** Có số liệu load test thật (không phải ước đoán); checklist production-readiness đầy đủ với lý do rõ ràng cho mục bỏ qua; design doc đọc được trong 10 phút.

**Tài liệu:** Google SRE Workbook — Implementing SLOs (tham khảo tư duy checklist); k6 docs; "The Twelve-Factor App" (12factor.net).

---

## 5. Lịch mẫu 1 tuần (~10h)

| Ngày | Việc | Thời gian |
|---|---|---|
| T2 | Đọc bài học, ghi chú khái niệm mới | 1.5h |
| T3 | Đọc tiếp + xem lại code hiện tại của `taskflow-api` | 1h |
| T4 | Code lab chính | 2.5h |
| T5 | Code lab tiếp / viết test | 2h |
| T6 | Sửa lỗi phát sinh, chạy `pnpm test` xanh | 1.5h |
| T7 | Ghi `learnings.md`, đọc tài liệu tham khảo | 1h |
| CN | Nghỉ | — |

---

## 6. Sau lộ trình — Hướng mở rộng

- Đi sâu 1 hướng: distributed systems thật (→ course System Design nếu chưa học), hoặc chuyên sâu 1 framework khác (NestJS cho kiến trúc lớn, tRPC cho type-safety end-to-end).
- Đọc *Designing Data-Intensive Applications* (Kleppmann) để hiểu sâu hơn phần database/queue đã dùng.
- Thử triển khai `taskflow-api` lên hạ tầng thật (→ course DevOps & Cloud) — CI/CD đầy đủ, IaC, Kubernetes.
- Đóng góp 1 open-source backend project thật để đọc code người khác viết ở quy mô lớn hơn.
