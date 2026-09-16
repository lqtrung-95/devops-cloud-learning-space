import type { ModuleDefinition } from "@/content/content-types";

export const b14MicroserviceSplitEventDrivenModule: ModuleDefinition = {
  id: "b14",
  slug: "b14-microservice-split-event-driven",
  phaseId: "b-phase-3",
  order: 14,
  weeks: "Tuần 18",
  title: "Tách microservice & event-driven",
  emoji: "📤",
  eli5Summary:
    "B13 làm `api` gọi điện thoại trực tiếp cho `notification-service` mỗi khi cần gửi thông báo — nếu đầu dây bên kia không bắt máy (service tạm chết), cuộc gọi mất trắng. Module này đổi cách liên lạc thành bỏ thư vào hộp thư chung (`outbox`) ngay lúc ghi việc chính — có một người đưa thư (relay) đi kiểm hộp thư định kỳ và giao tận nơi, đi giao trượt thì quay lại giao tiếp cho tới khi thành công. Thư không bao giờ bị bỏ quên, kể cả khi người nhận đóng cửa vài phút.",
  objectives: [
    "Giải thích chính xác 'dual-write problem': vì sao một lệnh ghi DB và một lệnh gọi service khác không thể nằm chung một transaction phân tán, và outbox pattern thu hẹp rủi ro đó ở đâu",
    "Thêm bảng `outbox` vào `taskflow-api` và ghi business write + outbox event trong CÙNG một `db.transaction` (Drizzle) để đảm bảo tính atomic ở phía ghi",
    "Viết một relay polling `outbox` và gọi gRPC `SendNotification`, chỉ đánh dấu `published_at` sau khi gọi thành công — hiểu vì sao polling có đánh đổi độ trễ/tải DB so với CDC (Debezium)",
    "Phân biệt event-driven (fire-and-forget qua outbox + relay) với request/response (gọi gRPC trực tiếp) cho đúng use case gửi notification, và biết khi nào mỗi kiểu phù hợp hơn",
    "Giải thích vì sao `notification-service` nên sở hữu dữ liệu/read model riêng thay vì đọc thẳng Postgres của `taskflow-api` (data ownership khi tách service)",
    "Thừa nhận rủi ro còn lại một cách trung thực: relay có thể gọi `SendNotification` hai lần cho cùng một event nếu crash giữa lúc gọi thành công và lúc ghi `published_at` — đây là at-least-once, không phải exactly-once tuyệt đối",
  ],
  lessons: [
    {
      slug: "outbox-pattern-va-bai-toan-dual-write",
      title: "Outbox pattern & bài toán dual-write",
      minutes: 40,
      summary:
        "Vì sao 'ghi DB xong rồi gọi service khác' luôn có một khe hở crash có thể làm mất event, và outbox pattern đóng khe hở đó bằng cách nào — kèm quyết định thiết kế: bảng `outbox` nằm ở Postgres của `taskflow-api`, không phải ở `notification-service`.",
    },
    {
      slug: "event-driven-vs-request-response-cho-notification",
      title: "Event-driven vs request/response cho notification-service",
      minutes: 45,
      summary:
        "So sánh gọi gRPC trực tiếp (B13) với gửi qua outbox + relay polling cho đúng use case gửi notification; viết relay, và đối chiếu đánh đổi polling vs CDC (Debezium).",
    },
    {
      slug: "data-ownership-khi-tach-notification-service",
      title: "Data ownership & chaos test khi tách service",
      minutes: 40,
      summary:
        "`notification-service` nên sở hữu dữ liệu riêng, không đọc thẳng Postgres của `taskflow-api`; chaos test tắt/bật `notification-service` giữa lúc có traffic để chứng minh không mất event.",
    },
  ],
  labs: [
    {
      id: "them-bang-outbox-va-ghi-trong-cung-transaction",
      title: "Thêm bảng `outbox` & ghi comment trong cùng transaction",
      description:
        "Thêm bảng `outbox` vào schema `taskflow-api`, sửa route tạo comment để insert `comments` và `outbox` trong cùng một `db.transaction` — atomic ở phía ghi, đúng như mục 3 curriculum yêu cầu (không đổi tên cột đã có).",
      steps: [
        "Trong `src/db/schema.ts`, thêm bảng `outbox` với đúng cột: `id bigserial pk`, `aggregate_type text`, `aggregate_id uuid`, `event_type text`, `payload jsonb`, `created_at timestamptz default now()`, `published_at timestamptz` nullable — sinh migration bằng `pnpm drizzle-kit generate` rồi `pnpm drizzle-kit migrate`",
        "Sửa handler `POST /api/v1/tasks/:taskId/comments` (đã có từ B04): mở `await db.transaction(async (tx) => {...})`, bên trong `tx.insert(comments).values(...).returning()` rồi `tx.insert(outbox).values({ aggregateType: \"comment\", aggregateId: created.id, eventType: \"comment.created\", payload: {...} })` — cả hai insert cùng thành công hoặc cùng rollback",
        "Viết test (Vitest, kế thừa quy ước từ B07): mock `notificationClient.sendNotification` throw lỗi, gọi `POST .../comments`, assert response vẫn `201` và bảng `comments` lẫn `outbox` đều có dòng mới — chứng minh việc ghi outbox không phụ thuộc gRPC có thành công hay không",
        "Chạy `docker compose exec postgres psql -U taskflow -c \"select event_type, published_at from outbox order by id desc limit 5;\"` xác nhận dòng vừa tạo có `published_at` là `NULL` (chưa ai gửi đi)",
        "Chạy `pnpm test` xác nhận toàn bộ test cũ (B01–B13) vẫn xanh — thêm bảng mới không được phá route cũ",
      ],
    },
    {
      id: "viet-relay-polling-goi-grpc",
      title: "Viết relay polling `outbox` & gọi gRPC `SendNotification`",
      description:
        "Relay chạy như một phần của service `worker` (đã có từ B09): định kỳ đọc các dòng `outbox` chưa gửi, gọi `SendNotification` qua gRPC (đã dựng ở B13), chỉ đánh dấu `published_at` khi gọi thành công.",
      steps: [
        "Tạo `src/queues/outbox-relay.ts` export hàm `relayOnce()`: `SELECT * FROM outbox WHERE published_at IS NULL ORDER BY id ASC LIMIT 20` bằng Drizzle, lặp qua từng dòng",
        "Với mỗi dòng, `await notificationClient.sendNotification({ eventType: row.eventType, aggregateId: row.aggregateId, payload: JSON.stringify(row.payload) })` (client gRPC đã tạo ở B13) trong `try/catch`; thành công thì `UPDATE outbox SET published_at = now() WHERE id = row.id`, lỗi thì log cảnh báo và **để nguyên `published_at = NULL`** — lần poll sau sẽ thử lại đúng dòng đó",
        "Export `startOutboxRelay()` chạy vòng lặp `while (true) { await relayOnce(); await sleep(2000); }`, gọi hàm này trong `src/worker.ts` song song với `Worker` BullMQ đã có — relay và BullMQ worker cùng sống trong container `worker`, không cần thêm service mới vào `docker-compose.yml`",
        "Thêm script `\"worker:relay\": \"tsx src/queues/run-outbox-relay.ts\"` vào `package.json` để chạy relay độc lập (hữu ích khi debug hoặc chaos test ở lab sau) — file này chỉ gọi `startOutboxRelay()`",
        "Tạm dừng `notification-service` (`docker compose stop notification-service`), tạo vài comment, quan sát `docker compose logs -f worker` thấy relay log cảnh báo gọi thất bại lặp lại mỗi ~2 giây nhưng process `worker` không bị crash",
      ],
    },
    {
      id: "chaos-test-tat-bat-notification-service",
      title: "Chaos test: tắt `notification-service` giữa lúc có traffic",
      description:
        "Chứng minh tiêu chí đạt của module: tắt `notification-service` 30 giây trong lúc vẫn tạo comment, bật lại, toàn bộ notification vẫn được gửi — không trùng không thiếu.",
      steps: [
        "Viết script test `src/queues/outbox-relay.chaos.test.ts` (Vitest): bước 1 gọi `execSync(\"docker compose stop notification-service\")`",
        "Trong lúc service tắt, gọi `POST /api/v1/tasks/:taskId/comments` 5 lần liên tiếp (dùng `fetch` hoặc client test có sẵn từ B07) — assert cả 5 request đều `201` dù `notification-service` đang chết, và cả 5 dòng `outbox` tương ứng có `published_at = NULL`",
        "Gọi `execSync(\"docker compose start notification-service\")`, đợi service sẵn sàng (`docker compose exec notification-service` health check hoặc `await sleep(3000)`), rồi gọi `relayOnce()` lặp lại vài lần (hoặc đợi relay tự poll) cho tới khi cả 5 dòng `outbox` có `published_at` khác `NULL`",
        "Assert **không thiếu**: đếm `SELECT count(*) FROM outbox WHERE published_at IS NULL` phải về `0` sau khi relay drain hết; assert **không trùng**: `notification-service` (mock trong test) ghi lại số lần `SendNotification` nhận được cho mỗi `aggregate_id`, assert mỗi `aggregate_id` chỉ xuất hiện đúng 1 lần (chấp nhận log cảnh báo riêng nếu môi trường test cố tình mô phỏng crash relay giữa lúc gọi thành công và ghi `published_at`, xem `<Callout type=\"warning\">` ở lesson 2 về rủi ro duplicate còn sót)",
        "Chạy `pnpm test -- outbox-relay.chaos` và xác nhận xanh; ghi kết quả (thời gian outage, số outbox row bị kẹt, thời gian drain hết) vào `learnings.md` của module",
      ],
    },
  ],
  deliverable:
    "`taskflow-api` có bảng `outbox`, route tạo comment ghi `comments` + `outbox` trong cùng transaction, và relay trong service `worker` poll `outbox` mỗi ~2 giây để gọi gRPC `SendNotification`, chỉ đánh dấu `published_at` khi gọi thành công.",
  successCriteria:
    "Tắt `notification-service` 30 giây trong lúc user vẫn tạo comment — khi bật lại, toàn bộ notification vẫn được gửi (mọi dòng `outbox` cuối cùng có `published_at`), không thiếu; số lần `SendNotification` nhận được cho mỗi event không vượt quá 1 trong điều kiện vận hành bình thường (không giả crash relay giữa call và update).",
  resources: [
    { title: "microservices.io — Pattern: Transactional outbox", url: "https://microservices.io/patterns/data/transactional-outbox.html", kind: "doc" },
    { title: "microservices.io — Pattern: Polling publisher", url: "https://microservices.io/patterns/data/polling-publisher.html", kind: "doc" },
    { title: "microservices.io — Pattern: Database per service", url: "https://microservices.io/patterns/data/database-per-service.html", kind: "doc" },
    { title: "Debezium docs — Tutorial (CDC thay cho polling)", url: "https://debezium.io/documentation/reference/stable/tutorial.html", kind: "doc" },
    { title: "Drizzle ORM docs — Transactions", url: "https://orm.drizzle.team/docs/transactions", kind: "doc" },
    { title: "grpc.io docs — Node.js basics tutorial", url: "https://grpc.io/docs/languages/node/basics/", kind: "doc" },
  ],
  quiz: [
    {
      id: "vi-sao-khong-the-goi-grpc-trong-transaction",
      question:
        "Một dev đề xuất: cứ `await db.transaction(async (tx) => { await tx.insert(comments)...; await notificationClient.sendNotification(...); })` — gọi gRPC luôn bên trong transaction Postgres cho \"chắc ăn cùng thành công cùng thất bại\". Vấn đề lớn nhất với cách này là gì?",
      options: [
        "Postgres transaction có thể bao trọn một lệnh gọi mạng ra service khác, nên cách này hoàn toàn an toàn",
        "Một transaction Postgres chỉ đảm bảo atomic cho các thao tác trong CHÍNH Postgres đó — nó không thể 'rollback' một cuộc gọi gRPC đã gửi đi; nếu gRPC treo lâu, connection Postgres bị giữ suốt thời gian đó, và nếu insert rollback sau khi gRPC đã thành công thì hai bên đã lệch nhau",
        "gRPC không hỗ trợ chạy bên trong transaction của bất kỳ ngôn ngữ nào",
        "Cách này chỉ sai khi `notification-service` dùng database khác Postgres",
      ],
      answerIndex: 1,
      explanation:
        "Đây chính là dual-write problem: DB write và network call là hai hệ thống khác nhau, không có cơ chế transaction phân tán nào bao trọn cả hai một cách rẻ và đáng tin cậy ở quy mô này. Outbox pattern né vấn đề bằng cách KHÔNG gọi network trong transaction — chỉ ghi một bản ghi ý định (outbox row) cùng transaction với business write.",
    },
    {
      id: "outbox-dam-bao-atomic-o-dau",
      question: "Outbox pattern đảm bảo tính atomic (\"tất cả hoặc không gì cả\") cho CHÍNH XÁC bước nào trong toàn bộ luồng gửi notification?",
      options: [
        "Atomic cho toàn bộ chuỗi: ghi comment + ghi outbox + relay gọi gRPC thành công, tất cả trong một giao dịch duy nhất",
        "Atomic giữa bước ghi nghiệp vụ (insert `comments`) và bước ghi ý định gửi event (insert `outbox`) — cả hai cùng nằm trong một `db.transaction` Postgres bình thường, cùng commit hoặc cùng rollback",
        "Atomic cho việc `notification-service` xử lý và trả kết quả về relay",
        "Atomic không áp dụng ở đâu cả — outbox chỉ là một cách đặt tên bảng",
      ],
      answerIndex: 1,
      explanation:
        "Outbox chỉ giải quyết đúng một khe hở: business write và việc GHI Ý ĐỊNH gửi event là atomic (cùng transaction Postgres, công nghệ transaction quen thuộc từ B04). Việc relay gọi gRPC thành công hay không là một bước RIÊNG, xảy ra sau, và được xử lý bằng retry chứ không phải bằng transaction.",
    },
    {
      id: "vi-sao-relay-goi-lai-duoc-an-toan",
      question:
        "Vì sao relay có thể an toàn gọi lại `SendNotification` nhiều lần cho cùng một dòng `outbox` (ví dụ `notification-service` down 5 lần liên tiếp trước khi lên lại) mà không sợ 'quên mất' event đó?",
      options: [
        "Vì BullMQ tự động nhớ lại các lần gọi thất bại",
        "Vì relay không xoá dòng `outbox` sau khi gọi thất bại, và điều kiện truy vấn `WHERE published_at IS NULL` khiến dòng đó luôn xuất hiện lại ở lần poll kế tiếp cho tới khi có một lần gọi thành công cập nhật `published_at`",
        "Vì gRPC tự động buffer request khi server đích không phản hồi",
        "Vì Postgres tự retry INSERT khi transaction rollback",
      ],
      answerIndex: 1,
      explanation:
        "Cơ chế 'an toàn để thử lại' ở đây rất đơn giản và không cần công cụ đặc biệt: relay chỉ đánh dấu xong việc (`published_at`) SAU KHI thành công. Chừng nào chưa thành công, dòng đó vẫn khớp điều kiện `WHERE published_at IS NULL` và sẽ được chọn lại ở lần poll sau.",
    },
    {
      id: "trade-off-polling-vs-cdc",
      question: "Relay trong lab này dùng polling (`SELECT ... WHERE published_at IS NULL` mỗi ~2 giây). So với một giải pháp CDC (ví dụ Debezium đọc write-ahead log của Postgres), polling có đánh đổi gì?",
      options: [
        "Polling nhanh hơn CDC trong mọi trường hợp nên luôn nên chọn polling",
        "Polling độ trễ phát hiện event phụ thuộc vào chu kỳ poll (tối đa ~2 giây ở đây) và tạo thêm tải `SELECT` lặp lại lên Postgres kể cả khi không có event mới; CDC đọc trực tiếp WAL nên gần như tức thời và không cần poll, nhưng phức tạp hơn để vận hành (cần Debezium/Kafka Connect)",
        "CDC không thể dùng với Postgres, chỉ dùng được với MySQL",
        "Polling và CDC cho độ trễ và tải hệ thống giống hệt nhau, khác biệt chỉ là công cụ",
      ],
      answerIndex: 1,
      explanation:
        "Đây là đánh đổi thật, không phải một bên tuyệt đối tốt hơn: polling đơn giản, dễ debug, đủ dùng cho traffic vừa phải; CDC (Debezium) giảm độ trễ và tải DB đáng kể ở quy mô lớn nhưng thêm một hệ thống vận hành mới. Module này chọn polling vì đơn giản, đủ cho `taskflow-api`, và nêu CDC như hướng nâng cấp khi cần.",
    },
    {
      id: "event-driven-vs-request-response-cho-use-case-nay",
      question:
        "So với gọi gRPC trực tiếp (B13) trong cùng request xử lý comment, cách outbox + relay (event-driven) đánh đổi điều gì để đổi lấy khả năng chịu lỗi khi `notification-service` down?",
      options: [
        "Không đánh đổi gì cả — event-driven luôn tốt hơn request/response trong mọi trường hợp",
        "Notification được gửi 'gần như ngay lập tức và đảm bảo đã gửi xong' trước khi response trả về client",
        "Notification không còn được gửi đồng thời với response nữa — có độ trễ bằng chu kỳ poll của relay (tối đa vài giây), đổi lại request tạo comment không bao giờ bị chặn hay lỗi chỉ vì `notification-service` đang down",
        "Client bây giờ phải tự gọi lại `notification-service` nếu muốn chắc chắn nhận được thông báo",
      ],
      answerIndex: 2,
      explanation:
        "Đúng như đánh đổi latency/coupling kinh điển: request/response cho phản hồi tức thời nhưng làm `POST comment` phụ thuộc vào sự sẵn sàng của `notification-service`; event-driven tách rời hai việc, chấp nhận độ trễ vài giây để đổi lấy việc tạo comment không bao giờ thất bại chỉ vì service phụ trợ down.",
    },
    {
      id: "data-ownership-vi-sao-khong-doc-thang-postgres",
      question: "Vì sao `notification-service` không nên tự kết nối thẳng vào Postgres của `taskflow-api` để đọc bảng `outbox` (thay vì nhận qua gRPC từ relay)?",
      options: [
        "Vì Postgres chỉ cho một service duy nhất kết nối tại một thời điểm",
        "Vì làm vậy hai service dùng chung schema nội bộ của nhau — bất kỳ ai đổi cấu trúc bảng ở `taskflow-api` (đổi tên cột, thêm ràng buộc) đều có thể âm thầm làm vỡ `notification-service` mà không ai biết cho tới khi nó lỗi ở production; mỗi service nên sở hữu dữ liệu/read model riêng và chỉ giao tiếp qua API/contract rõ ràng (gRPC)",
        "Vì gRPC nhanh hơn kết nối Postgres trực tiếp trong mọi trường hợp",
        "Vì Postgres không hỗ trợ nhiều connection pool cho hai service khác nhau",
      ],
      answerIndex: 1,
      explanation:
        "Đây là nguyên tắc 'database per service': schema nội bộ của một service là chi tiết triển khai của riêng nó. Khi service khác đọc thẳng, ranh giới đó biến mất — thay đổi nội bộ vô hại ở `taskflow-api` có thể thành breaking change ở `notification-service` mà không thông qua bất kỳ contract nào.",
    },
    {
      id: "rui-ro-duplicate-con-sot-lai",
      question:
        "Relay gọi `SendNotification` thành công, nhưng process `worker` bị kill NGAY TRƯỚC khi kịp chạy `UPDATE outbox SET published_at = now()`. Điều gì xảy ra ở lần poll tiếp theo (sau khi worker restart)?",
      options: [
        "Relay tự biết dòng đó đã gửi rồi nhờ gRPC trả về mã xác nhận idempotent",
        "Dòng đó vẫn có `published_at IS NULL` nên sẽ được chọn lại và gọi `SendNotification` lần thứ hai cho cùng một event — đây là rủi ro duplicate thật sự, hệ thống này là at-least-once chứ không phải exactly-once tuyệt đối",
        "Postgres tự phát hiện và chặn việc chọn lại dòng đã publish",
        "Không có rủi ro gì vì `outbox` có unique constraint trên `event_type`",
      ],
      answerIndex: 1,
      explanation:
        "Đây là điều cần thành thật thừa nhận thay vì tuyên bố 'exactly-once': khoảng hở giữa 'gọi thành công' và 'ghi nhận đã gọi' luôn tồn tại. Cách giảm thiểu triệt để là làm `SendNotification` phía `notification-service` idempotent (dedup theo `aggregate_id` + `event_type`), không phải cố loại bỏ khoảng hở này ở phía relay.",
    },
    {
      id: "vi-sao-cap-nhat-published-at-sau-khi-goi-thanh-cong",
      question: "Vì sao relay phải `UPDATE outbox SET published_at = now()` SAU KHI `SendNotification` trả về thành công, thay vì đánh dấu `published_at` NGAY TRƯỚC KHI gọi (để tránh gọi trùng nếu process bị kill giữa chừng)?",
      options: [
        "Thứ tự không quan trọng, hai cách cho kết quả giống hệt nhau",
        "Nếu đánh dấu trước rồi gọi thất bại (hoặc process chết trước khi kịp gọi), dòng đó sẽ bị coi là 'đã publish' mãi mãi dù `notification-service` chưa từng nhận được — mất event thật sự (silent data loss), tệ hơn nhiều so với rủi ro gọi trùng của cách 'đánh dấu sau'",
        "Đánh dấu trước giúp gRPC chạy nhanh hơn",
        "Postgres yêu cầu bắt buộc phải update sau khi gọi network xong",
      ],
      answerIndex: 1,
      explanation:
        "Đây là lựa chọn thiết kế có chủ đích giữa hai loại lỗi: 'đánh dấu sau' có thể gây duplicate (chấp nhận được nếu downstream idempotent) còn 'đánh dấu trước' có thể gây mất event vĩnh viễn (không chấp nhận được với notification). At-least-once luôn được ưu tiên hơn at-most-once khi mất dữ liệu là hậu quả tệ hơn trùng lặp.",
    },
    {
      id: "chaos-test-tieu-chi-dat",
      question: "Trong lab chaos test, sau khi `notification-service` tắt 30 giây rồi bật lại, tiêu chí nào chứng minh hệ thống outbox + relay hoạt động đúng như thiết kế?",
      options: [
        "Chỉ cần `docker compose up` không báo lỗi là đủ",
        "Toàn bộ dòng `outbox` được tạo trong lúc down cuối cùng đều có `published_at` khác `NULL` (không mất), và mỗi `aggregate_id` chỉ được `notification-service` nhận đúng một lần trong điều kiện vận hành bình thường (không thiếu, không trùng ngoài rủi ro đã biết ở câu hỏi trước)",
        "Chỉ cần request tạo comment không trả lỗi 500 trong lúc `notification-service` down",
        "Chỉ cần `docker compose logs worker` không có dòng nào chứa từ 'error'",
      ],
      answerIndex: 1,
      explanation:
        "Tiêu chí đạt của module (mục curriculum) là 'không mất, không trùng' đo được bằng dữ liệu thật trong `outbox`, không phải chỉ nhìn log hay HTTP status. Request không lỗi trong lúc down là điều kiện cần nhưng chưa đủ — phải xác nhận relay drain hết sau khi service sống lại.",
    },
    {
      id: "vi-sao-khong-goi-thang-tu-route-handler",
      question:
        "Sau module này, route `POST /api/v1/tasks/:taskId/comments` KHÔNG còn gọi `notificationClient.sendNotification(...)` trực tiếp như cách B13 từng làm ở route khác. Vì sao đây là thay đổi đúng hướng cho riêng use case gửi notification khi tạo comment?",
      options: [
        "Vì gRPC đã bị loại bỏ hoàn toàn khỏi `taskflow-api` từ module này trở đi",
        "Vì gọi trực tiếp trong route khiến việc tạo comment (chức năng chính, người dùng đang chờ) phụ thuộc vào sự sẵn sàng của một service phụ trợ (gửi thông báo) — tách qua outbox giúp route chỉ phụ thuộc vào Postgres (đã có transaction đáng tin cậy từ B04), còn việc gửi đi là trách nhiệm của relay chạy độc lập",
        "Vì Fastify không cho phép gọi gRPC bên trong route handler",
        "Vì outbox pattern thay thế hoàn toàn nhu cầu dùng gRPC giữa hai service",
      ],
      answerIndex: 1,
      explanation:
        "gRPC (B13) vẫn được dùng — chỉ đổi AI gọi nó (relay thay vì route handler) và KHI NÀO (sau khi transaction đã commit, không đồng bộ với response). Mục tiêu là giảm số lượng thứ mà đường đi chính (tạo comment) phải phụ thuộc để thành công.",
    },
  ],
};
