import type { ModuleDefinition } from "@/content/content-types";

export const b09BackgroundJobsSchedulingModule: ModuleDefinition = {
  id: "b09",
  slug: "b09-background-jobs-scheduling",
  phaseId: "b-phase-2",
  order: 9,
  weeks: "Tuần 12",
  title: "Background job & scheduling",
  emoji: "🛵",
  eli5Summary:
    "Quán ăn nhận order xong hô ngay 'đã nhận, đang làm!' rồi mới quay vào bếp nấu — khách không phải đứng chờ tại quầy tới khi món ra. Module này dạy `taskflow-api` làm y hệt: đổi trạng thái task xong là trả response ngay, còn việc ghi log hoạt động và gửi notification thì giao cho một 'đầu bếp' riêng (worker) xử lý ở hàng đợi phía sau.",
  objectives: [
    "Giải thích vì sao ghi log/gửi notification trong cùng request làm chậm response, và khi nào nên tách ra chạy nền",
    "Dựng queue + worker bằng BullMQ (Redis-backed): `Queue.add()` để enqueue, `Worker` để xử lý job trong process riêng",
    "Cấu hình retry với backoff exponential có trần, và xử lý job rơi vào dead-letter sau khi hết số lần thử",
    "Tạo repeatable job (BullMQ cron pattern) chạy định kỳ để dọn dữ liệu hết hạn, hiểu vì sao nó khác `setInterval`",
    "Nhận diện rủi ro job chạy lại (retry) có thể tạo dữ liệu trùng, và biết hướng giảm thiểu (idempotency key) dù chưa cần giải quyết triệt để ở module này",
  ],
  lessons: [
    {
      slug: "khi-nao-can-hang-doi-thay-vi-xu-ly-dong-bo",
      title: "Khi nào cần hàng đợi thay vì xử lý đồng bộ",
      minutes: 30,
      summary: "Vì sao gộp việc ghi log/gửi notification vào cùng request làm chậm response — và ranh giới giữa việc nên làm ngay và việc nên đẩy ra nền.",
    },
    {
      slug: "bullmq-queue-worker-job",
      title: "BullMQ: Queue, Worker & vòng đời một job",
      minutes: 45,
      summary: "Thêm service `worker` vào `taskflow-api`, enqueue job khi task đổi trạng thái, và vòng đời waiting → active → completed/failed.",
    },
    {
      slug: "retry-backoff-va-dead-letter",
      title: "Retry, backoff exponential & dead-letter",
      minutes: 40,
      summary: "Cấu hình tối đa 3 lần thử với backoff tăng dần có trần, và điều gì xảy ra khi job vẫn lỗi sau lần thử cuối.",
    },
    {
      slug: "repeatable-job-don-refresh-token-het-han",
      title: "Repeatable job: dọn refresh token hết hạn định kỳ",
      minutes: 35,
      summary: "BullMQ repeatable job (cron pattern) sống trong Redis chứ không phải trong process — sống sót qua cả restart worker.",
    },
  ],
  labs: [
    {
      id: "them-service-worker-va-cai-bullmq",
      title: "Thêm service `worker` & cài BullMQ",
      description: "Thêm service `worker` vào `docker-compose.yml` của `taskflow-api` (mục 3 curriculum) và dựng kết nối Redis dùng chung cho queue.",
      steps: [
        "Cài package: `pnpm add bullmq ioredis`",
        "Tạo `src/queues/redis-connection.ts` khởi tạo một `IORedis` instance dùng `env.REDIS_URL` (đã có từ B01), truyền vào mọi `Queue`/`Worker` để tránh mỗi cái tự mở connection riêng",
        "Thêm script `worker` vào `package.json`: `\"worker\": \"tsx src/worker.ts\"` (cùng cách chạy dev với `api`, chỉ khác entrypoint)",
        "Thêm service `worker` vào `docker-compose.yml`: cùng image với `api` (build từ `Dockerfile` hiện có), override `command: [\"npm\", \"run\", \"worker\"]`, `depends_on: [redis, postgres]`, không cần khai báo `ports` vì worker không nhận HTTP request",
        "Chạy `docker compose up -d worker` và xác nhận container khởi động không lỗi bằng `docker compose logs worker`",
      ],
    },
    {
      id: "enqueue-job-khi-task-doi-trang-thai",
      title: "Enqueue job khi task đổi trạng thái",
      description: "`PATCH /api/v1/tasks/:id` trả response ngay sau khi update Postgres — việc ghi `activity_logs` và `notifications` chuyển sang job async xử lý bởi `worker`.",
      steps: [
        "Tạo `src/queues/notifications-queue.ts` export một `Queue<TaskStatusChangedJobData>` tên `\"notifications\"`, dùng connection ở bước trước",
        "Trong `src/db/schema.ts`, thêm bảng `notifications` (`id uuid pk default gen_random_uuid()`, `user_id uuid` fk `users.id`, `type text`, `payload jsonb`, `read_at timestamptz` nullable, `created_at timestamptz default now()`) và `activity_logs` (`id bigserial pk`, `organization_id uuid` fk `organizations.id`, `actor_id uuid` fk `users.id`, `action text`, `entity_type text`, `entity_id uuid`, `metadata jsonb`, `created_at timestamptz default now()`) — copy đúng schema mục 3 curriculum, sinh migration bằng `pnpm drizzle-kit generate` rồi `pnpm drizzle-kit migrate`",
        "Trong handler `PATCH /api/v1/tasks/:id`, sau khi `UPDATE tasks` thành công, gọi `await notificationsQueue.add(\"task-status-changed\", { taskId, organizationId, actorId, oldStatus, newStatus })` — **không `await` việc job chạy xong**, chỉ `await` việc enqueue (rất nhanh, chỉ ghi vào Redis)",
        "Tạo `src/worker.ts` khởi tạo `new Worker(\"notifications\", processTaskStatusChanged, { connection })` — hàm `processTaskStatusChanged` mở một `db.transaction` insert 1 dòng `activity_logs` (action `\"task.status_changed\"`) và 1 dòng `notifications` (type `\"task_status_changed\"`, `payload` chứa `taskId`/`oldStatus`/`newStatus`)",
        "Đo thời gian response bằng `curl -w \"%{time_total}\\n\"` trước và sau khi chuyển sang queue — response phải nhanh rõ rệt và không đổi dù `processTaskStatusChanged` có `await setTimeout(...)` giả lập việc chậm",
      ],
    },
    {
      id: "retry-backoff-va-dead-letter-lab",
      title: "Retry với backoff & rơi vào dead-letter",
      description: "Cấu hình tối đa 3 lần thử với backoff exponential có trần, và ghi lại job nào hết lượt thử vẫn lỗi.",
      steps: [
        "Sửa `notificationsQueue.add(...)` truyền thêm `opts`: `{ attempts: 3, backoff: { type: \"exponential\", delay: 1000 } }` — nếu bản BullMQ đang cài giới hạn `delay` tối đa, kiểm tra changelog để biết cách đặt trần (tránh backoff tăng vô hạn)",
        "Tạm thời cho `processTaskStatusChanged` `throw` lỗi có điều kiện (ví dụ `if (process.env.SIMULATE_JOB_FAILURE) throw new Error(...)`) để quan sát retry mà không cần chờ lỗi thật xảy ra",
        "Chạy `docker compose logs -f worker` trong lúc gửi 1 request `PATCH` với biến môi trường giả lập lỗi bật — quan sát 3 lần `active → failed`, mỗi lần cách nhau lâu hơn lần trước",
        "Đăng ký `worker.on(\"failed\", async (job, err) => { if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) { /* ghi dead-letter */ } })` — khi hết lượt, insert một dòng `activity_logs` với `action: \"job.dead_letter\"` và `metadata` chứa tên job + lỗi, để người vận hành xem lại thủ công",
        "Tắt biến giả lập lỗi, xác nhận job chạy lại bình thường và `pnpm test` (nếu đã có test cho route này từ B07) vẫn xanh",
      ],
    },
    {
      id: "repeatable-job-don-refresh-token",
      title: "Repeatable job dọn refresh token hết hạn",
      description: "Một job định kỳ xoá các dòng `refresh_tokens` (B05) đã hết hạn hoặc đã bị revoke, không cần ai gọi API.",
      steps: [
        "Tạo `src/queues/cleanup-queue.ts` export `Queue` tên `\"cleanup\"`, và `src/queues/scheduler.ts` gọi `cleanupQueue.add(\"cleanup-expired-refresh-tokens\", {}, { repeat: { pattern: \"*/30 * * * *\" } })` khi worker khởi động — 30 phút chạy một lần",
        "Trong `src/worker.ts`, thêm `new Worker(\"cleanup\", processCleanupExpiredRefreshTokens, { connection })` — hàm này chạy `DELETE FROM refresh_tokens WHERE expires_at < now() OR revoked_at IS NOT NULL` bằng Drizzle",
        "Đảm bảo job **idempotent**: chạy `DELETE ... WHERE expires_at < now()` hai lần liên tiếp không gây lỗi — lần hai đơn giản là không xoá được dòng nào (đã xoá hết ở lần một)",
        "Kiểm tra lịch đã được ghi vào Redis bằng `docker compose exec redis redis-cli KEYS \"bull:cleanup:*\"` — phải thấy key liên quan tới repeatable job dù chưa tới giờ chạy",
        "Chèn thủ công vài dòng `refresh_tokens` có `expires_at` trong quá khứ bằng `psql`, đợi tới lần chạy tiếp theo (hoặc gọi trực tiếp hàm xử lý để test nhanh), rồi xác nhận bằng `docker compose exec postgres psql -U taskflow -c \"select count(*) from refresh_tokens where expires_at < now();\"` trả về `0`",
      ],
    },
  ],
  deliverable:
    "`taskflow-api` có service `worker` chạy BullMQ, queue `notifications` xử lý ghi `activity_logs`/`notifications` async khi task đổi trạng thái (kèm retry backoff exponential + dead-letter sau 3 lần thử), và một repeatable job dọn `refresh_tokens` hết hạn mỗi 30 phút.",
  successCriteria:
    "`PATCH /api/v1/tasks/:id` trả response gần như ngay lập tức bất kể việc ghi log/notification mất bao lâu; job cố tình lỗi được retry đúng 3 lần với khoảng cách tăng dần rồi rơi vào dead-letter; `refresh_tokens` hết hạn tự biến mất theo lịch mà không cần gọi API nào.",
  resources: [
    { title: "BullMQ docs — Queues", url: "https://docs.bullmq.io/guide/queues", kind: "doc" },
    { title: "BullMQ docs — Workers", url: "https://docs.bullmq.io/guide/workers", kind: "doc" },
    { title: "BullMQ docs — Retrying failing jobs", url: "https://docs.bullmq.io/guide/retrying-failing-jobs", kind: "doc" },
    { title: "BullMQ docs — Repeatable jobs", url: "https://docs.bullmq.io/guide/jobs/repeatable", kind: "doc" },
    { title: "Redis docs — Data types overview", url: "https://redis.io/docs/latest/develop/data-types/", kind: "doc" },
    { title: "Redis docs — Lists", url: "https://redis.io/docs/latest/develop/data-types/lists/", kind: "doc" },
    { title: "Redis docs — Sorted sets", url: "https://redis.io/docs/latest/develop/data-types/sorted-sets/", kind: "doc" },
    { title: "ioredis (npm)", url: "https://www.npmjs.com/package/ioredis", kind: "tool" },
  ],
  quiz: [
    {
      id: "vi-sao-can-queue-cho-notification",
      question:
        "`PATCH /api/v1/tasks/:id` hiện tại update Postgres, rồi gửi email notification, rồi mới trả response — occasionally email server chậm 3-4 giây. Vấn đề lớn nhất ở đây là gì?",
      options: [
        "Client (app di động, trình duyệt) phải chờ toàn bộ chuỗi đó xong mới nhận response, dù việc đổi status task đã hoàn tất từ sớm",
        "Postgres sẽ bị deadlock nếu request quá lâu",
        "Fastify không cho phép route chạy quá 1 giây",
        "Email server sẽ tự động bị chặn nếu gửi chậm",
      ],
      answerIndex: 0,
      explanation:
        "Giống nhân viên bắt khách đứng chờ tại quầy tới khi bếp nấu xong món mới cho hoá đơn — task đã đổi trạng thái xong (việc chính của request) nhưng response bị 'ăn theo' độ trễ của một việc phụ (gửi email) không liên quan tới việc client đang chờ.",
    },
    {
      id: "response-truoc-khi-job-chay-xong",
      question:
        "Sau khi chuyển sang BullMQ, `PATCH /api/v1/tasks/:id` gọi `await notificationsQueue.add(...)`. Điều gì thực sự xảy ra trước khi response được trả về client?",
      options: [
        "Job đã chạy xong hoàn toàn — ghi cả `activity_logs` lẫn `notifications` — trước khi response được gửi",
        "Chỉ việc *đẩy job vào Redis* (rất nhanh) hoàn tất trước response; việc xử lý job thật sự (ghi DB) xảy ra sau đó trong process `worker` riêng",
        "Request bị treo cho tới khi worker xử lý xong job mới trả response",
        "`add()` chạy bất đồng bộ hoàn toàn, không cần `await` gì cả nên có thể bỏ `await`",
      ],
      answerIndex: 1,
      explanation:
        "Đây là điểm dễ hiểu nhầm nhất: `await` ở đây chỉ chờ *lệnh ghi vào hàng đợi* xong (thao tác Redis rất nhanh), không chờ *job được xử lý*. Nếu code lỡ `await` luôn kết quả xử lý job trong cùng request, toàn bộ lợi ích của queue biến mất.",
    },
    {
      id: "trang-thai-job-waiting-active",
      question: "Một job vừa được `add()` vào queue `notifications` nhưng chưa có worker nào rảnh để xử lý. Trạng thái của job lúc này là gì?",
      options: [
        "`active` — vì nó đã tồn tại trong Redis",
        "`completed` — vì `add()` không trả lỗi",
        "`waiting` — nó nằm trong danh sách chờ tới khi một `Worker` lấy nó ra và bắt đầu xử lý",
        "`failed` — vì chưa có worker nghĩa là đã thất bại",
      ],
      answerIndex: 2,
      explanation: "`waiting` là trạng thái mặc định ngay sau khi enqueue. Job chỉ chuyển sang `active` khi một `Worker` thực sự lấy nó ra và bắt đầu chạy hàm xử lý.",
    },
    {
      id: "vi-sao-worker-la-service-rieng",
      question: "Vì sao `worker` phải là một service riêng trong `docker-compose.yml` (cùng image `api` nhưng khác `command`), thay vì chạy `new Worker(...)` ngay trong process `api` đang phục vụ HTTP request?",
      options: [
        "Vì BullMQ không cho phép chạy Worker trong cùng process với HTTP server",
        "Vì Docker Compose bắt buộc mỗi image chỉ được dùng cho đúng một service",
        "Vì worker cần một image nhỏ hơn để tiết kiệm dung lượng",
        "Vì tách process giúp scale/restart worker độc lập với api, và một job xử lý nặng/kẹt không làm event loop của process đang phục vụ HTTP request bị chậm theo",
      ],
      answerIndex: 3,
      explanation:
        "Về mặt kỹ thuật, Worker có thể chạy chung process với api. Nhưng tách riêng cho phép scale số lượng worker độc lập với số lượng instance api, và cô lập: nếu một job tốn CPU/block event loop, nó không ảnh hưởng tới khả năng phục vụ HTTP request của api.",
    },
    {
      id: "exponential-vs-fixed-backoff",
      question: "Vì sao lab này chọn `backoff: { type: \"exponential\", delay: 1000 }` (1s, 2s, 4s...) thay vì backoff cố định (luôn đợi đúng 1s mỗi lần retry)?",
      options: [
        "Exponential backoff giúp job chạy nhanh hơn tổng thể",
        "Nếu nguyên nhân lỗi là hệ thống downstream đang quá tải, backoff cố định khiến hàng loạt job dồn dập retry cùng nhịp độ vào đúng lúc hệ thống còn yếu; backoff tăng dần giãn áp lực ra theo thời gian, cho downstream cơ hội hồi phục",
        "BullMQ không hỗ trợ backoff cố định",
        "Exponential backoff đảm bảo job không bao giờ vào dead-letter",
      ],
      answerIndex: 1,
      explanation:
        "Backoff cố định vẫn hợp lý cho lỗi ngẫu nhiên đơn lẻ, nhưng khi nhiều job cùng lỗi vì downstream quá tải, retry đồng loạt với cùng nhịp độ chỉ làm tình hình tệ hơn. Exponential (và jitter, nếu cần) giãn các lần retry ra xa nhau hơn theo thời gian.",
    },
    {
      id: "dead-letter-sau-may-lan",
      question: "Với `attempts: 3`, một job liên tục lỗi. Sau lần thử thứ mấy thì code trong `worker.on(\"failed\", ...)` nên coi job này là \"hết cứu\", cần ghi vào dead-letter?",
      options: [
        "Ngay từ lần thất bại đầu tiên (`attemptsMade === 1`)",
        "Sau lần thất bại thứ hai (`attemptsMade === 2`)",
        "Khi `attemptsMade` đã đạt đúng giá trị `attempts` đã cấu hình (ở đây là `3`) — nghĩa là BullMQ sẽ không tự retry thêm nữa",
        "Không bao giờ — BullMQ tự động retry vô hạn cho tới khi thành công",
      ],
      answerIndex: 2,
      explanation: "`attempts: 3` nghĩa là job được thử tối đa 3 lần. Khi `job.attemptsMade` bằng đúng con số đó và vẫn lỗi, BullMQ dừng retry — đây là thời điểm đúng để hệ thống của bạn (không phải BullMQ) ghi nhận job này cần con người can thiệp.",
    },
    {
      id: "rui-ro-retry-tao-trung-notification",
      question:
        "Job `processTaskStatusChanged` insert 1 dòng `notifications`. Ở attempt 1, insert đã chạy thành công nhưng ngay sau đó process `worker` bị kill trước khi BullMQ kịp ghi nhận job `completed`. BullMQ coi job này là lỗi và retry ở attempt 2. Điều gì có thể xảy ra?",
      options: [
        "BullMQ tự phát hiện notification đã tồn tại và bỏ qua bước insert ở lần retry",
        "Postgres tự động chặn insert trùng vì đã có unique constraint mặc định",
        "Attempt 2 chạy lại toàn bộ processor, có thể insert thêm một dòng `notifications` thứ hai cho cùng một sự kiện — vì processor hiện tại không kiểm tra 'việc này đã làm chưa' trước khi ghi",
        "Không có rủi ro gì vì BullMQ đảm bảo mỗi job chỉ chạy đúng một lần (exactly-once)",
      ],
      answerIndex: 2,
      explanation:
        "Đây là rủi ro 'at-least-once, không phải exactly-once' rất thật của mọi hệ thống queue: retry có thể chạy lại một xử lý đã thực sự hoàn tất một phần. Cách giảm thiểu (dùng `jobId` cố định để BullMQ dedup ở tầng enqueue, hoặc unique constraint/idempotency key ở tầng ghi DB) sẽ được đào sâu hơn ở B15 và ở phần consumer-side dedup của course System Design — module này chỉ cần bạn nhận diện đúng rủi ro.",
    },
    {
      id: "repeatable-job-song-sot-qua-restart",
      question: "Vì sao một repeatable job của BullMQ (`repeat: { pattern: \"*/30 * * * *\" }`) vẫn chạy đúng giờ ngay cả khi container `worker` restart giữa chừng, trong khi một `setInterval(fn, 30 * 60 * 1000)` viết tay trong code sẽ mất lịch khi process restart?",
      options: [
        "Vì BullMQ chạy job ở một process hoàn toàn khác, không liên quan tới container `worker`",
        "Vì lịch của repeatable job được lưu trong Redis (bên ngoài process), còn `setInterval` chỉ tồn tại trong bộ nhớ (RAM) của đúng process đang chạy nó — process chết là timer mất theo",
        "Vì Docker tự động khôi phục lại đúng thời điểm timer trước khi container tắt",
        "Vì `pattern` cron luôn được đồng bộ qua NTP nên không phụ thuộc vào process",
      ],
      answerIndex: 1,
      explanation:
        "`setInterval` là trạng thái in-memory: mất khi process chết. Repeatable job ghi lịch chạy vào Redis (một sorted set nội bộ theo thời gian chạy tiếp theo) — bất kỳ worker nào kết nối lại Redis đều thấy đúng lịch đó, không phụ thuộc việc process nào đã tạo ra nó ban đầu.",
    },
    {
      id: "idempotent-delete-refresh-token",
      question: "Job dọn `refresh_tokens` chạy `DELETE FROM refresh_tokens WHERE expires_at < now() OR revoked_at IS NOT NULL`. Vì sao an toàn nếu job này lỡ chạy hai lần liên tiếp (ví dụ do retry)?",
      options: [
        "Vì BullMQ tự động chặn không cho cùng một loại job chạy hai lần",
        "Vì `DELETE ... WHERE` chỉ xoá đúng những dòng còn thoả điều kiện tại thời điểm chạy — lần chạy thứ hai đơn giản là không tìm thấy dòng nào để xoá nữa, không gây lỗi hay xoá nhầm dữ liệu khác",
        "Vì Postgres tự động rollback lần chạy thứ hai",
        "Vì `refresh_tokens` có trigger ngăn DELETE trùng lặp",
      ],
      answerIndex: 1,
      explanation:
        "Đây chính là tính chất khiến job này an toàn để retry mà không cần idempotency key riêng: `DELETE ... WHERE <điều kiện>` là idempotent tự nhiên — chạy lại chỉ tác động tới tập dữ liệu còn thoả điều kiện, không nhân đôi hiệu ứng như một `INSERT` vô điều kiện sẽ gặp phải.",
    },
    {
      id: "data-type-redis-cho-bullmq",
      question: "Tài liệu Redis được gợi ý đọc thêm cho module này là Lists và Sorted Sets. Hai cấu trúc dữ liệu này liên quan gì tới cách BullMQ hoạt động bên dưới?",
      options: [
        "BullMQ không dùng Redis để lưu trữ, chỉ dùng để log",
        "Cả hai chỉ được dùng để cache kết quả job, không liên quan tới hàng đợi",
        "BullMQ dùng Redis Streams thay vì List/Sorted Set nên hai tài liệu này không liên quan",
        "List phù hợp cho hàng đợi FIFO (job `waiting`), còn Sorted Set phù hợp để lưu các job cần sắp xếp theo thời điểm (ví dụ job đang đợi backoff, hoặc lịch chạy của repeatable job) theo `score` là timestamp",
      ],
      answerIndex: 3,
      explanation:
        "Không cần thuộc lòng chi tiết cài đặt nội bộ của BullMQ, nhưng hiểu vì sao Redis phù hợp làm nền cho queue giúp bạn đọc log/debug tốt hơn: List cho thứ tự FIFO tự nhiên của hàng đợi, Sorted Set cho các tập hợp cần sắp xếp theo thời gian (delayed/backoff/repeatable).",
    },
  ],
};
