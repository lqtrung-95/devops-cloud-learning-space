import type { ModuleDefinition } from "@/content/content-types";

export const b10CachingForBackendModule: ModuleDefinition = {
  id: "b10",
  slug: "b10-caching-for-backend",
  phaseId: "b-phase-2",
  order: 10,
  weeks: "Tuần 13",
  title: "Caching cho backend",
  emoji: "⚡",
  eli5Summary:
    "Redis giống ngăn kéo ngay trên bàn thư ký — hỏi ở đó trước khi chạy xuống kho hồ sơ (Postgres) dưới tầng hầm. Nhưng nếu dán nhãn ngăn kéo thiếu thông tin (cache key thiếu tham số), thư ký sẽ đưa nhầm hồ sơ; và nếu hồ sơ gốc vừa được cập nhật mà không ai báo cho ngăn kéo biết (quên invalidate), thư ký vẫn tự tin đưa ra bản cũ.",
  objectives: [
    "Giải thích và cài đặt cache-aside cho GET /api/v1/projects/:projectId/tasks bằng Redis (ioredis)",
    "Thiết kế cache key chứa đủ mọi tham số ảnh hưởng response (projectId, status, cursor, limit) để tránh collision",
    "Invalidate đúng cache khi task được tạo/sửa/xoá trong cùng project, không đọc phải dữ liệu cũ",
    "Chọn TTL hợp lý làm lưới an toàn bên cạnh invalidation chủ động, không thay thế nó",
    "Đo lường latency trước/sau khi thêm cache bằng autocannon và đọc đúng ý nghĩa p50/p95/p99",
  ],
  lessons: [
    {
      slug: "cache-aside-pattern-task-list",
      title: "Cache-aside cho danh sách task",
      minutes: 40,
      summary: "Hỏi Redis trước, chỉ hỏi Postgres khi thật sự cần — áp dụng đúng cho GET /projects/:projectId/tasks.",
    },
    {
      slug: "cache-key-design-and-invalidation",
      title: "Thiết kế cache key & invalidate khi ghi",
      minutes: 45,
      summary: "Key thiếu tham số gây collision; ghi dữ liệu mà không invalidate thì cache 'nói dối'.",
    },
    {
      slug: "measuring-cache-latency-improvement",
      title: "Đo latency trước/sau khi thêm cache",
      minutes: 35,
      summary: "Dùng autocannon đo p50/p95/p99 thật, không đoán 'chắc là nhanh hơn'.",
    },
  ],
  labs: [
    {
      id: "cache-aside-task-list-endpoint",
      title: "Cache-aside cho endpoint danh sách task",
      description: "Thêm Redis client và cache-aside cho GET /api/v1/projects/:projectId/tasks với TTL 30 giây.",
      steps: [
        "Thêm Redis client dùng `ioredis` (đã dùng ngầm bởi BullMQ từ B09) tại `src/lib/redis-client.ts`, kết nối bằng `REDIS_URL` có sẵn từ B01 (`redis://redis:6379`)",
        "Viết hàm `buildTaskListCacheKey(projectId, { status, cursor, limit })` sinh key dạng `tasks:{projectId}:list:status={status}:cursor={cursor}:limit={limit}`",
        "Trong route `GET /api/v1/projects/:projectId/tasks`, gọi `redis.get(key)` trước — nếu có, `JSON.parse` và trả luôn (cache HIT), không chạm Postgres",
        "Nếu miss, chạy lại đúng câu Drizzle query cursor pagination từ B04, rồi `redis.set(key, JSON.stringify(result), \"EX\", 30)` trước khi trả response",
        "Ghi thêm mỗi key mới sinh vào registry set `redis.sadd(\"tasks:{projectId}:list:keys\", key)` — lab sau (invalidation) cần danh sách này để biết xoá gì",
        "Test bằng `curl -w '%{time_total}\\n'` gọi 2 lần liên tiếp cùng query, xác nhận lần 2 nhanh hơn rõ rệt",
      ],
    },
    {
      id: "invalidate-cache-on-task-write",
      title: "Invalidate cache khi ghi task",
      description: "Xoá đúng các cache key liên quan mỗi khi task trong project được tạo/sửa/xoá.",
      steps: [
        "Viết `invalidateProjectTaskListCache(projectId)`: `SMEMBERS tasks:{projectId}:list:keys` lấy toàn bộ key, `UNLINK` hết các key đó, rồi `DEL` chính registry set",
        "Gọi hàm này trong `POST /api/v1/projects/:projectId/tasks` NGAY SAU KHI insert Postgres commit thành công (không gọi trước khi ghi DB)",
        "Gọi tương tự trong `PATCH .../tasks/:id` và `DELETE .../tasks/:id` — lấy `projectId` từ `request.params`, không lấy từ body",
        "Viết test Vitest: GET để nạp cache (xác nhận lần 2 HIT), PATCH đổi `status` một task, GET lại — assert response mới không còn giá trị `status` cũ",
        "Cố tình comment dòng gọi invalidation ở route PATCH, chạy lại test bước trên và xác nhận nó đỏ — sau đó bỏ comment, chạy lại cho xanh",
      ],
    },
    {
      id: "measure-p95-latency-before-after",
      title: "Đo p95 trước/sau khi thêm cache",
      description: "Dùng autocannon đo latency thật của endpoint trước và sau khi bật cache-aside.",
      steps: [
        "Cài `autocannon` làm dev dependency: `pnpm add -D autocannon`",
        "Tạm comment đoạn `redis.get`/`redis.set` trong route (chỉ còn query Postgres), chạy `npx autocannon -c 20 -d 15 http://localhost:3000/api/v1/projects/<id>/tasks`, ghi lại p50/p95/p99",
        "Bỏ comment, bật lại cache-aside, chạy lại đúng lệnh autocannon ở bước trên với cùng tham số",
        "Ghi cả hai bảng kết quả vào `learnings.md` của module, giải thích vì sao p50/p95 giảm mạnh nhưng p99 gần như không đổi",
        "Chạy lại với `-c 100` (nhiều connection hơn) để thấy khoảng cách giữa có/không cache rõ hơn khi tải tăng",
      ],
    },
  ],
  deliverable:
    "taskflow-api có cache-aside cho GET /api/v1/projects/:projectId/tasks (TTL 30s), invalidate đúng khi tạo/sửa/xoá task trong project, và một bản ghi so sánh p95 trước/sau bằng autocannon trong learnings.md.",
  successCriteria:
    "Sau khi sửa 1 task, gọi lại GET list ngay lập tức phải thấy dữ liệu mới (không đọc phải cache cũ); có số đo latency trước/sau thật, không phải ước đoán.",
  resources: [
    { title: "Redis Docs — Cache-aside pattern", url: "https://redis.io/docs/latest/develop/use-cases/cache-aside/", kind: "doc" },
    { title: "AWS Builders' Library — Caching challenges and strategies", url: "https://aws.amazon.com/builders-library/caching-challenges-and-strategies/", kind: "doc" },
    { title: "Redis Docs — EXPIRE (đặt TTL cho key)", url: "https://redis.io/docs/latest/commands/expire/", kind: "doc" },
    { title: "Redis Docs — UNLINK (xoá key không blocking)", url: "https://redis.io/docs/latest/commands/unlink/", kind: "doc" },
    { title: "ioredis — Redis client cho Node.js", url: "https://github.com/redis/ioredis", kind: "tool" },
    { title: "autocannon — công cụ load test HTTP", url: "https://github.com/mcollina/autocannon", kind: "tool" },
  ],
  quiz: [
    {
      id: "cache-key-missing-status",
      question:
        "taskflow-api cache endpoint GET /api/v1/projects/:projectId/tasks với key chỉ gồm projectId và cursor, KHÔNG có status. Gọi `?status=todo` rồi gọi `?status=done` (cùng cursor) ngay sau đó sẽ xảy ra gì?",
      options: [
        "Cả hai đều MISS vì query khác nhau",
        "Redis tự phát hiện tham số thiếu và trả lỗi",
        "Request thứ hai HIT nhưng nhận nhầm data của request thứ nhất (status=todo)",
        "Không ảnh hưởng vì Postgres luôn được ưu tiên hỏi trước",
      ],
      answerIndex: 2,
      explanation: "Hai request build ra cùng 1 key vì thiếu status trong công thức, nên request 2 HIT ngay vào cache của request 1 — nhận sai dữ liệu, và lỗi này rất khó phát hiện vì không có exception nào cả.",
    },
    {
      id: "ttl-not-substitute",
      question: "Vì sao đặt TTL 30 giây cho cache task list KHÔNG đủ để thay thế việc gọi invalidate khi task thay đổi?",
      options: [
        "Trong tối đa 30 giây đó, mọi người vẫn có thể thấy dữ liệu cũ dù đã ghi thành công — TTL chỉ giới hạn THỜI GIAN sai, không xoá NGAY khi có write",
        "TTL làm Redis chậm hơn Postgres",
        "TTL chỉ hoạt động với key dạng số",
        "Redis không hỗ trợ TTL cho kiểu string",
      ],
      answerIndex: 0,
      explanation: "TTL là lưới an toàn tự dọn khi lỡ quên invalidate ở đâu đó — không phải cơ chế chính. Invalidate chủ động mới đảm bảo đọc ngay sau ghi thấy đúng dữ liệu, thay vì chờ tối đa 30 giây.",
    },
    {
      id: "invalidate-not-patch-json",
      question: "Khi một task đổi status, cách invalidate ĐÚNG cho cache list của project đó là gì?",
      options: [
        "Đọc JSON đang cache, tìm đúng task, sửa field status trong đó rồi ghi lại",
        "Ghi đè toàn bộ cache Redis bằng FLUSHALL",
        "Không cần làm gì, TTL sẽ tự lo",
        "Xoá toàn bộ các key list liên quan tới project đó, để lần đọc tiếp theo tự nạp lại từ Postgres",
      ],
      answerIndex: 3,
      explanation: "'Xoá, không vá': sửa tay từng phần tử trong JSON cache rất dễ sai (sai thứ tự, sai cursor, quên field khác). Xoá nguyên rồi để cache-aside tự nạp lại từ Postgres là cách an toàn.",
    },
    {
      id: "registry-set-purpose",
      question:
        "Vì sao lab dùng một Redis Set (SADD/SMEMBERS) để 'nhớ' các cache key đã tạo cho mỗi project, thay vì dùng lệnh KEYS tasks:{projectId}:* khi cần xoá?",
      options: [
        "SADD nhanh hơn SET",
        "KEYS quét toàn bộ keyspace và có thể block Redis một lúc trên dataset lớn; registry set cho biết CHÍNH XÁC cần xoá key nào mà không phải quét",
        "SMEMBERS trả kết quả đã sắp xếp sẵn theo thời gian tạo",
        "KEYS đã bị Redis loại bỏ hoàn toàn từ bản 7",
      ],
      answerIndex: 1,
      explanation: "KEYS là O(N) trên toàn bộ keyspace và không khuyến khích dùng ở production vì có thể block Redis. Giữ một registry set nhỏ theo từng project tránh hẳn vấn đề đó.",
    },
    {
      id: "cache-in-onrequest-hook-bypasses-authz",
      question:
        "Một dev muốn 'tối ưu thêm' bằng cách kiểm tra cache Redis ngay trong hook `onRequest` (trước cả `preHandler` nơi `requireRole` chạy) để trả response sớm nhất có thể. Rủi ro là gì?",
      options: [
        "Không có rủi ro, onRequest chạy sau preHandler nên vẫn an toàn",
        "Cache HIT ở onRequest sẽ trả dữ liệu cho request CHƯA qua bước xác thực/kiểm tra quyền (RBAC), vì onRequest chạy trước preHandler trong vòng đời Fastify",
        "onRequest không được phép đọc Redis",
        "Fastify sẽ tự động chặn vì phát hiện side-effect trong onRequest",
      ],
      answerIndex: 1,
      explanation: "Thứ tự hook Fastify là onRequest → ... → preHandler → handler. requireRole/resolveOrganizationContext chạy ở preHandler (B06) — đặt cache check sớm hơn ở onRequest nghĩa là bỏ qua toàn bộ authorization khi HIT.",
    },
    {
      id: "delete-then-write-order",
      question:
        "Trong route PATCH tasks/:id, nên gọi invalidateProjectTaskListCache(projectId) ở đâu để tránh việc một GET xen giữa vô tình ghi lại đúng dữ liệu Postgres CŨ vào cache?",
      options: [
        "Trước khi UPDATE Postgres chạy",
        "Không quan trọng, gọi lúc nào cũng như nhau",
        "Trong một cron job chạy mỗi giờ",
        "Sau khi UPDATE Postgres commit thành công",
      ],
      answerIndex: 3,
      explanation: "Xoá cache trước khi ghi DB tạo ra khoảng hở: một GET xen vào giữa có thể query Postgres (chưa update) rồi vô tình nạp NHẦM data cũ vào cache ngay sau khi vừa xoá. Luôn invalidate SAU KHI ghi DB thành công.",
    },
    {
      id: "autocannon-single-request",
      question: "Tại sao đo latency bằng đúng 1 lần curl không đủ để kết luận việc thêm cache có hiệu quả?",
      options: [
        "1 request không phản ánh được hành vi dưới tải đồng thời (p95/p99), và có thể vô tình đo trúng cache MISS hoặc HIT",
        "curl không hỗ trợ đo thời gian phản hồi",
        "curl luôn nhanh hơn autocannon nên kết quả sai",
        "Redis chỉ hoạt động đúng khi có nhiều connection đồng thời",
      ],
      answerIndex: 0,
      explanation: "Một request là một mẫu ngẫu nhiên (có thể HIT hoặc MISS). Load test với nhiều connection đồng thời (autocannon) cho thấy phân phối thật, đặc biệt là đuôi p95/p99.",
    },
    {
      id: "p99-barely-improves",
      question: "Sau khi thêm cache, p50 và p95 giảm mạnh nhưng p99 chỉ giảm nhẹ. Giải thích hợp lý nhất là gì?",
      options: [
        "Redis bị lỗi ngẫu nhiên ở 1% request",
        "autocannon đo sai ở phân vị cao",
        "1% request chậm nhất thường là các cache MISS (key vừa hết TTL, hoặc filter hiếm) vẫn phải chạm Postgres như trước khi có cache",
        "p99 luôn bằng p95 cộng thêm một hằng số cố định",
      ],
      answerIndex: 2,
      explanation: "Cache giảm SỐ LƯỢNG request rơi vào đường chậm (Postgres), chứ không xoá sạch đường đó. Phần đuôi (MISS) vẫn giữ latency gần như trước khi có cache.",
    },
    {
      id: "which-writes-invalidate",
      question:
        "taskflow-api có 3 route ghi vào bảng tasks trong cùng project: tạo task, sửa task, xoá task. Route nào KHÔNG cần gọi invalidate cache list?",
      options: [
        "Chỉ cần gọi ở route tạo task",
        "Cả ba route (tạo/sửa/xoá) đều cần gọi, vì cả ba đều làm thay đổi kết quả của GET list",
        "Chỉ cần gọi ở route sửa task",
        "Không route nào cần, vì TTL 30 giây đã đủ",
      ],
      answerIndex: 1,
      explanation: "Tạo, sửa, xoá đều thay đổi tập kết quả mà GET list trả về — quên bất kỳ route nào cũng để lại một đường rò dữ liệu cũ cho tới khi TTL tự hết.",
    },
    {
      id: "future-filter-needs-key-update",
      question: "Nếu sau này thêm filter assignedToMe=true vào GET tasks (kết quả phụ thuộc user đang gọi), điều gì BẮT BUỘC phải thay đổi?",
      options: [
        "Không cần đổi gì, cache key hiện tại vẫn đúng",
        "Chỉ cần tăng TTL lên cho an toàn",
        "Chỉ cần đổi tên prefix của key, không cần thêm tham số",
        "Phải thêm userId (hoặc tương đương) vào cache key, nếu không hai user khác nhau có thể đọc nhầm danh sách 'của mình' từ cache của người khác",
      ],
      answerIndex: 3,
      explanation: "Bất kỳ tham số nào ảnh hưởng tới NỘI DUNG response — kể cả danh tính người gọi — đều phải nằm trong cache key. Thiếu nó là lặp lại đúng lỗi collision đã học, lần này rò rỉ dữ liệu giữa các user.",
    },
  ],
};
