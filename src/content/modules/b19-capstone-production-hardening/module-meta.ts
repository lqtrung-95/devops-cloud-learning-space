import type { ModuleDefinition } from "@/content/content-types";

export const b19CapstoneProductionHardeningModule: ModuleDefinition = {
  id: "b19",
  slug: "b19-capstone-production-hardening",
  phaseId: "b-phase-4",
  order: 19,
  weeks: "Tuần 23–24",
  title: "Capstone: Production hardening",
  emoji: "🏁",
  eli5Summary:
    "Bạn đã xây xong cả một toà nhà — `taskflow-api` với đủ phòng ban: cửa an toàn (auth), sổ phân quyền (RBAC), kho đồ (upload), việc vặt chạy nền (job), tủ lạnh (cache), chuông cửa (realtime), hai lối vào song song (REST/GraphQL), đường dây nội bộ (gRPC), khoá cửa sổ (security), camera giám sát (observability), đóng gói di chuyển (container/CI) và cổng bảo vệ (API gateway). Module cuối này không xây thêm phòng nào — đây là buổi nghiệm thu trước khi bàn giao: mời khách thật (tải) vào thử, xem phòng nào nghẹt trước tiên, điền biên bản nghiệm thu, và viết một tờ giấy tóm tắt cho người kế nhiệm.",
  objectives: [
    "Tổng hợp checklist production-readiness cho `taskflow-api` từ B01–B18 — không học khái niệm mới, chỉ rà lại và kiểm chứng thật",
    "Viết và chạy load test (k6/autocannon) mô phỏng đúng hành trình người dùng thật: đăng nhập → tạo project → tạo task → comment → upload attachment",
    "Đọc p50/p95/p99 theo từng bước để tìm bottleneck đầu tiên vỡ khi tải tăng, và giải thích được vì sao bằng lý luận kỹ thuật — không đoán mò",
    "Đánh dấu rõ ràng mục nào đã production-ready, mục nào cố ý bỏ qua kèm lý do và điều kiện khi nào nên làm",
    "Ưu tiên cải tiến bằng ma trận effort/impact thay vì làm theo cảm tính",
    "Viết một design doc 1 trang đọc được trong 10 phút: kiến trúc hiện tại, 3 cải tiến ưu tiên, ước lượng chi phí hạ tầng tối thiểu",
  ],
  lessons: [
    {
      slug: "production-readiness-checklist",
      title: "Checklist production-readiness: nghiệm thu taskflow-api",
      minutes: 45,
      summary: "Rà lại health check, graceful shutdown, log, rate limit, secret, backup — tổng hợp từ B01–B18, đánh dấu Done hay Bỏ qua có lý do.",
    },
    {
      slug: "load-testing-first-bottleneck",
      title: "Load test hành trình thật & tìm bottleneck đầu tiên",
      minutes: 45,
      summary: "Bếp nào nghẹt trước tiên khi khách ùa vào cùng lúc? Đo p50/p95/p99 theo từng bước, không chỉ một endpoint.",
    },
    {
      slug: "writing-the-design-doc",
      title: "Viết design doc bàn giao: kiến trúc, cải tiến, chi phí",
      minutes: 40,
      summary: "Một tờ giấy 1 trang đọc trong 10 phút — kiến trúc hiện tại, 3 việc ưu tiên nếu có thêm 1 tháng, chi phí hạ tầng tối thiểu.",
    },
  ],
  labs: [
    {
      id: "load-test-full-journey",
      title: "Load test toàn bộ hành trình người dùng",
      description:
        "Viết kịch bản k6 mô phỏng đăng nhập → tạo project → tạo task → comment → upload attachment, đo p95/p99 từng bước và xác định bottleneck đầu tiên.",
      steps: [
        "Cài k6 (`brew install k6` trên macOS, hoặc chạy qua Docker: `docker run -i grafana/k6 run - <load-test/journey.js`)",
        "Viết `load-test/journey.js` dùng `k6/http`, gọi tuần tự: `POST /api/v1/auth/login`, `POST /api/v1/projects`, `POST /api/v1/projects/:id/tasks`, `POST /api/v1/tasks/:id/comments`, rồi lấy presigned URL và `PUT` file lên MinIO như đã học ở B08",
        "Bọc mỗi bước bằng `group('login', () => { ... })` và tạo `Trend` metric riêng cho từng bước để so sánh p95/p99 theo bước thay vì gộp chung một con số",
        "Chạy ramping VU tăng dần tải: `k6 run --stage 30s:10,1m:50,30s:0 load-test/journey.js`",
        "Đọc bảng tóm tắt cuối cùng (`k6` in ra theo từng `Trend`), so sánh p95/p99 giữa các bước — bước nào lệch xa các bước còn lại nhất khi VU tăng",
        "Ghi lại bottleneck đầu tiên tìm được kèm bằng chứng số liệu (không phải đoán) vào `docs/load-test-findings.md`",
      ],
    },
    {
      id: "production-readiness-checklist-lab",
      title: "Điền checklist production-readiness cho taskflow-api",
      description: "Rà từng hạng mục production-readiness lên đúng taskflow-api hiện tại, đánh dấu Done / Bỏ qua có lý do — không được để trống lý do.",
      steps: [
        "Copy đúng bảng checklist ở lesson `production-readiness-checklist` vào `docs/production-readiness-checklist.md`",
        "Với mỗi mục, kiểm chứng thật thay vì đoán: gọi `curl localhost:3000/api/v1/healthz`, chạy `docker compose kill -s SIGTERM api` rồi đọc log graceful shutdown, chạy `pnpm audit`",
        "Với mục đánh Done: ghi rõ module nào đã làm (ví dụ `B05`, `B15`) và cách bạn vừa kiểm chứng lại nó vẫn đúng",
        "Với mục cố ý bỏ qua (ví dụ backup object storage MinIO): ghi lý do cụ thể, rủi ro nếu không làm, và điều kiện/quy mô nào thì nên làm",
        "Rà lại toàn bộ bảng một lần nữa — không được để ô lý do trống cho bất kỳ mục Bỏ qua nào",
      ],
    },
    {
      id: "capstone-design-doc",
      title: "Viết design doc bàn giao cho taskflow-api",
      description: "Viết 1 design doc đọc được trong 10 phút: kiến trúc hiện tại, 3 cải tiến ưu tiên nếu có thêm 1 tháng, và chi phí hạ tầng tối thiểu.",
      steps: [
        "Tạo `docs/design-doc.md` với đúng 3 phần: `## Kiến trúc hiện tại`, `## 3 cải tiến ưu tiên`, `## Ước lượng chi phí hạ tầng tối thiểu`",
        "Phần kiến trúc: liệt kê từng service trong `docker-compose.yml` (`api`, `worker`, `notification-service`, `postgres`, `redis`, `minio`, `nginx`), vai trò, và điểm đã harden — tham khảo diagram + checklist ở 2 lab trước",
        "Phần cải tiến: dùng ma trận effort/impact ở lesson `writing-the-design-doc`, chọn đúng 3 mục ưu tiên nhất trong 1 tháng, nêu lý do chọn và lý do không chọn các mục còn lại",
        "Phần chi phí: ước lượng compute (`api`+`worker`+`notification-service`), managed Postgres, Redis, object storage — nêu rõ giả định (số user, traffic) trước khi ra con số, và nói rõ đây là chi phí tối thiểu, chưa gồm HA/multi-AZ",
        "Tự đọc lại design doc, bấm giờ thật 10 phút — nếu đọc không hết trong 10 phút thì phải cắt bớt cho tới khi vừa",
      ],
    },
  ],
  deliverable:
    "`docs/production-readiness-checklist.md` điền đầy đủ, script + kết quả load test thật trong `load-test/` và `docs/load-test-findings.md`, và `docs/design-doc.md` đọc được trong 10 phút — tất cả nằm trong repo `taskflow-api`.",
  successCriteria:
    "Checklist không có ô lý do bỏ qua nào bị để trống; có số liệu load test thật (không phải ước đoán) chỉ rõ bottleneck đầu tiên vỡ khi tải tăng; design doc có đúng 3 cải tiến kèm lý do chọn/không chọn và một bảng chi phí có nêu rõ giả định.",
  resources: [
    { title: "Google SRE Workbook — Implementing SLOs", url: "https://sre.google/workbook/implementing-slos/", kind: "doc" },
    { title: "k6 — Documentation", url: "https://k6.io/docs/", kind: "doc" },
    { title: "The Twelve-Factor App", url: "https://12factor.net/", kind: "doc" },
    { title: "autocannon — HTTP/1.1 benchmarking tool", url: "https://github.com/mcollina/autocannon", kind: "tool" },
    { title: "PostgreSQL Documentation — Backup and Restore", url: "https://www.postgresql.org/docs/current/backup.html", kind: "doc" },
    { title: "Fastify — Server (lifecycle & graceful close)", url: "https://fastify.dev/docs/latest/Reference/Server/", kind: "doc" },
  ],
  quiz: [
    {
      id: "first-bottleneck-reasoning",
      question:
        "Load test cho thấy p99 của bước đăng nhập tăng vọt gấp nhiều lần khi số VU tăng, trong khi các bước tạo project/task/comment gần như phẳng. Nguyên nhân hợp lý nhất?",
      options: [
        "Postgres hết connection trong pool",
        "Hàm hash mật khẩu (argon2id, học ở B05) là CPU-bound, chạy đồng bộ chặn event loop khi nhiều request đăng nhập cùng lúc",
        "Redis cache miss toàn bộ ở bước đăng nhập",
        "Presigned URL của MinIO hết hạn giữa chừng",
      ],
      answerIndex: 1,
      explanation:
        "Giống bếp: món cần sear (CPU-bound, mất thời gian cố định mỗi món) nghẹt trước tiên khi khách ùa vào, còn món chỉ cần trộn salad (I/O-bound, chờ song song được) vẫn chạy mượt. Hash password là việc CPU-bound duy nhất trong hành trình.",
    },
    {
      id: "graceful-shutdown-missing",
      question: "Mỗi lần deploy container `api` mới, một vài request đang xử lý dở bị mất kết quả. Checklist item nào đang thiếu hoặc làm sai?",
      options: [
        "Rate limiting theo scope",
        "Security header (helmet/CORS)",
        "Graceful shutdown: `SIGTERM` phải đợi request đang chạy xong rồi mới đóng pool DB/Redis",
        "OpenAPI doc tự sinh",
      ],
      answerIndex: 2,
      explanation:
        "Đây đúng là mục 'graceful shutdown' học ở B17 — container nhận SIGTERM khi bị dừng/deploy lại, nếu thoát ngay lập tức thì request đang xử lý dở bị cắt ngang.",
    },
    {
      id: "skip-with-reason",
      question: "Checklist có mục 'Backup & lifecycle cho object storage (MinIO)' bị đánh dấu Bỏ qua. Lý do nào hợp lệ trong một production-readiness review thật?",
      options: [
        "Không cần nêu lý do, cứ bỏ qua cho nhanh",
        "Vì MinIO tự động backup sẵn, không cần cấu hình gì thêm",
        "Vì attachment không quan trọng bằng dữ liệu trong Postgres",
        "Vì MinIO hiện chỉ chứa file demo trong môi trường dev cục bộ; khi lên object storage thật (S3) sẽ bật versioning + lifecycle rule trước khi có traffic thật",
      ],
      answerIndex: 3,
      explanation:
        "Bỏ qua có lý do nghĩa là nêu rõ vì sao rủi ro hiện tại chấp nhận được VÀ điều kiện nào thì phải quay lại làm — không phải bỏ qua vô căn cứ hay giả định sai (MinIO không tự backup).",
    },
    {
      id: "p95-vs-average",
      question: "Design doc chỉ báo cáo latency trung bình (average) và kết luận hệ thống 'ổn'. Vấn đề chính là gì?",
      options: [
        "Average che giấu đuôi p95/p99 — nơi trải nghiệm tệ nhất của một phần người dùng thật sự xảy ra",
        "Average luôn cho số xấu hơn p99 nên gây hoang mang không cần thiết",
        "Average không thể tính được từ log HTTP",
        "Average chỉ áp dụng được cho throughput, không áp dụng cho latency",
      ],
      answerIndex: 0,
      explanation:
        "10% request chậm nhất (p90+) có thể là trải nghiệm thật của hàng nghìn user nếu traffic đủ lớn — average san phẳng hết những trường hợp đó.",
    },
    {
      id: "rate-limit-mechanism",
      question: "Client spam liên tục `/api/v1/auth/login` để dò mật khẩu. Cơ chế nào (đã học ở module nào) trực tiếp giảm rủi ro này nhất?",
      options: [
        "DataLoader batching (B12)",
        "Outbox pattern cho event (B14)",
        "Rate limiting theo scope, chặt riêng cho `/auth/login` (B15)",
        "Health check protocol cho gRPC (B13)",
      ],
      answerIndex: 2,
      explanation:
        "B15 dạy rate limit theo scope: giới hạn chặt cho route nhạy cảm như login để chặn brute-force, lỏng hơn cho phần còn lại của API để không cản UX bình thường.",
    },
    {
      id: "n1-query-dataloader",
      question: "Danh sách task trong GraphQL load rất chậm vì mỗi task lại query riêng bảng `users` để lấy assignee (N+1 query). Cơ chế nào giải quyết đúng vấn đề này?",
      options: [
        "Rate limiting (B15)",
        "DataLoader batching request trong cùng một tick (B12)",
        "Refresh token rotation (B05)",
        "Presigned URL cho upload (B08)",
      ],
      answerIndex: 1,
      explanation:
        "DataLoader gom nhiều lượt gọi `getUser(id)` riêng lẻ trong cùng một tick thành một query `WHERE id IN (...)` duy nhất — đúng cơ chế học ở B12 để chống N+1.",
    },
    {
      id: "design-doc-cost-hedge",
      question: "Design doc ghi 'chi phí hạ tầng: khoảng $150/tháng' mà không nêu giả định nào khác. Vấn đề chính là gì?",
      options: [
        "Con số quá thấp so với thực tế nên chắc chắn sai",
        "Không cần giả định vì đây đã là ước lượng tối thiểu rồi",
        "USD không phải đơn vị hợp lệ để ước lượng chi phí hạ tầng",
        "Thiếu giả định (số user, traffic, region) khiến con số không thể kiểm chứng lại hay tái sử dụng khi traffic thay đổi",
      ],
      answerIndex: 3,
      explanation:
        "Một ước lượng chi phí hữu ích luôn nêu giả định trước khi ra số (kiểu 'DAU X, traffic Y ⇒ ước tính Z') — để người đọc sau này biết khi nào con số đó không còn đúng nữa.",
    },
    {
      id: "circuit-breaker-need",
      question: "`notification-service` (gRPC) bị down, kéo theo request tạo task ở `api` cũng timeout theo vì đợi gRPC call trả lời. Cải tiến nào nên ưu tiên?",
      options: [
        "Thêm retry có giới hạn + circuit breaker, để lỗi gRPC không chặn luồng nghiệp vụ chính (tạo task vẫn thành công, notification gửi bù sau)",
        "Thêm một API GraphQL song song cho task",
        "Xoá hẳn `notification-service`, gộp lại vào `api`",
        "Tăng TTL cache Redis cho task list",
      ],
      answerIndex: 0,
      explanation:
        "Đây là bài học từ B13/B14: gọi service nội bộ không nên là single point of failure cho luồng nghiệp vụ chính — retry/circuit breaker + fallback (queue lại, gửi bù sau) giữ hệ thống chịu lỗi tốt hơn.",
    },
    {
      id: "effort-impact-quickwin",
      question: "Trong ma trận effort/impact dùng để chọn '3 cải tiến ưu tiên' cho design doc, một 'quick win' đúng nghĩa nằm ở vị trí nào?",
      options: ["Effort cao, impact cao", "Effort thấp, impact cao", "Effort thấp, impact thấp", "Effort cao, impact thấp"],
      answerIndex: 1,
      explanation:
        "Quick win là việc tốn ít công nhưng mang lại tác động lớn — ưu tiên làm trước trong 1 tháng ngắn ngủi thay vì lao vào dự án lớn (effort cao, impact cao) cần nhiều thời gian hơn.",
    },
    {
      id: "healthcheck-fake-200",
      question: "Endpoint `/healthz` của `api` luôn trả `200` cứng, kể cả khi Postgres đang down hoàn toàn. Vấn đề gì?",
      options: [
        "Không có vấn đề gì, healthz chỉ cần xác nhận process còn sống",
        "healthz nên trả `500` luôn bất kể trạng thái để chắc ăn",
        "healthz chỉ cần kiểm tra CPU usage",
        "Health check phải thật sự kiểm tra được dependency quan trọng (DB/Redis) thay vì trả cứng 200 — nếu không, orchestrator (Kubernetes, load balancer) vẫn đẩy traffic vào một instance đã chết một nửa",
      ],
      answerIndex: 3,
      explanation:
        "Health check 'giả' (luôn 200) là một trong những lỗi production phổ biến nhất — nó khiến hệ thống điều phối tin instance vẫn khoẻ trong khi nó không thể phục vụ request thật.",
    },
  ],
};
