import type { ModuleDefinition } from "@/content/content-types";

export const b11RealtimeWebsocketSseModule: ModuleDefinition = {
  id: "b11",
  slug: "b11-realtime-websocket-sse",
  phaseId: "b-phase-2",
  order: 11,
  weeks: "Tuần 14",
  title: "Realtime: WebSocket & Server-Sent Events",
  emoji: "📡",
  eli5Summary:
    "Loa phường phát thông báo tới cả xóm ngay khi có tin — không ai phải tự chạy ra hỏi thăm xem có gì mới. Module này dạy `taskflow-api` làm y hệt: ngay khi `worker` (B09) tạo một notification mới, một đường Server-Sent Events đẩy thẳng tin đó xuống trình duyệt người dùng đang mở, không cần họ tự bấm làm mới trang.",
  objectives: [
    "Giải thích khi nào SSE là lựa chọn hợp lý hơn WebSocket cho một luồng dữ liệu một chiều, và biết giới hạn thật của mỗi lựa chọn (giới hạn ~6 kết nối HTTP/1.1 mỗi domain, hay chi phí tự viết reconnect)",
    "Xác thực một kết nối realtime bằng token khi API kết nối của trình duyệt (`EventSource`, `WebSocket`) không cho phép set header tuỳ ý — verify thủ công bằng `app.jwt.verify()`",
    "Dựng endpoint SSE `GET /api/v1/notifications/stream` giữ kết nối mở đúng cách: `reply.hijack()`, heartbeat định kỳ, và dọn dẹp registry khi client ngắt kết nối",
    "Dùng Redis pub/sub để bắc cầu sự kiện giữa hai process độc lập (`worker` tạo dữ liệu, `api` giữ kết nối SSE) mà không cần chia sẻ bộ nhớ trực tiếp",
    "Nhận diện rủi ro thật của pub/sub (message mất nếu không ai đang lắng nghe lúc publish) và vì sao Postgres vẫn phải là nguồn sự thật, không phải Redis",
  ],
  lessons: [
    {
      slug: "websocket-vs-sse-cho-notification-mot-chieu",
      title: "WebSocket vs SSE: chọn gì cho notification một chiều",
      minutes: 30,
      summary: "So sánh SSE và WebSocket cho đúng bài toán đẩy notification một chiều — vì sao SSE thường là lựa chọn hợp lý hơn, và giới hạn kết nối HTTP/1.1 cần nhớ.",
    },
    {
      slug: "xac-thuc-ket-noi-realtime-bang-token",
      title: "Xác thực kết nối realtime bằng token",
      minutes: 35,
      summary: "`@fastify/websocket` xác thực kết nối bằng token ra sao, và vì sao endpoint SSE `taskflow-api` thực sự build cũng phải verify token thủ công theo đúng kỹ thuật đó.",
    },
    {
      slug: "redis-pub-sub-noi-worker-va-api-qua-hai-process",
      title: "Redis pub/sub: nối worker và api qua hai process",
      minutes: 40,
      summary: "`worker` và `api` là hai process độc lập — Redis pub/sub là cầu nối để một notification `worker` vừa tạo được đẩy đúng tới kết nối SSE mà `api` đang giữ.",
    },
  ],
  labs: [
    {
      id: "them-endpoint-sse-notifications-stream-co-xac-thuc",
      title: "Thêm endpoint SSE `/api/v1/notifications/stream` có xác thực",
      description: "Dựng endpoint SSE giữ kết nối mở, xác thực bằng access token (query param hoặc header), có heartbeat và dọn dẹp đúng khi client ngắt kết nối.",
      steps: [
        "Tạo `src/routes/notifications-stream.route.ts` export `notificationsStreamRoute: FastifyPluginAsync`, đăng ký trong `src/app.ts` bằng `app.register(notificationsStreamRoute)`",
        "Trong handler, đọc token từ `(request.query as { token?: string }).token` hoặc header `Authorization: Bearer ...`; verify bằng `await app.jwt.verify<{ sub: string }>(token)` — sai chữ ký hoặc hết hạn thì `reply.code(401).send({ error: { code: \"UNAUTHORIZED\", ... } })` và dừng lại trước khi mở stream",
        "Token hợp lệ: gọi `reply.hijack()` rồi `reply.raw.writeHead(200, { \"Content-Type\": \"text/event-stream\", \"Cache-Control\": \"no-cache\", Connection: \"keep-alive\" })`, ghi dòng `retry: 3000\\n\\n`, rồi gọi `registerConnection(userId, reply.raw)` (tạo `src/realtime/notification-stream-registry.ts` với `registerConnection`/`removeConnection`/`pushNotificationEvent` dùng `Map<string, Set<ServerResponse>>`)",
        "Thêm heartbeat `const heartbeat = setInterval(() => reply.raw.write(\": ping\\n\\n\"), 25_000)` để giữ kết nối sống qua proxy/load balancer, và dọn dẹp bằng `request.raw.on(\"close\", () => { clearInterval(heartbeat); removeConnection(userId, reply.raw); })`",
        "Lấy một access token thật bằng cách login (`POST /api/v1/auth/login` từ B05), rồi test `curl -N \"http://localhost:3000/api/v1/notifications/stream?token=$TOKEN\"` — phải thấy `retry: 3000` ngay, rồi `: ping` xuất hiện đều đặn mỗi 25 giây",
      ],
    },
    {
      id: "noi-worker-toi-api-qua-redis-pub-sub",
      title: "Nối `worker` → Redis pub/sub → `api`",
      description: "`worker` publish lên một kênh Redis ngay sau khi insert `notifications` (B09); `api` subscribe kênh đó bằng connection riêng và forward tới đúng client đang mở kết nối.",
      steps: [
        "Trong `src/worker.ts`, ngay sau khi `db.transaction(...)` insert xong dòng `notifications` (đã có từ B09), thêm `await redis.publish(\\`notifications:${notification.userId}\\`, JSON.stringify(notification))` — publish sau khi transaction chắc chắn đã commit, không publish trước",
        "Tạo `src/realtime/notification-pubsub-subscriber.ts` export `startNotificationSubscriber()`: gọi `const subscriber = redis.duplicate()` để có connection riêng (không dùng chung với `redis` ở B10 vốn đang phục vụ cache GET/SET), rồi `await subscriber.psubscribe(\"notifications:*\")`",
        "Đăng ký `subscriber.on(\"pmessage\", (_pattern, channel, message) => { const userId = channel.split(\":\")[1]; pushNotificationEvent(userId, JSON.parse(message)); })` — dùng lại `pushNotificationEvent` từ registry ở lab trước",
        "Gọi `await startNotificationSubscriber()` một lần khi `api` khởi động, trong `src/app.ts` sau khi các plugin khác (jwt, db) đã register xong",
        "Test end-to-end: mở một terminal giữ `curl -N` kết nối SSE (lab trước), terminal khác chạy `docker compose exec redis redis-cli PUBLISH notifications:<userId> '{\"type\":\"test\"}'` — phải thấy `event: notification\\ndata: {\"type\":\"test\"}` xuất hiện ngay ở terminal đang curl",
      ],
    },
    {
      id: "viet-test-client-ket-noi-va-log-su-kien",
      title: "Viết script test client kết nối và log sự kiện nhận được",
      description: "Một script Node độc lập mở kết nối SSE thật, log lại mọi notification nhận được, dùng để xác nhận toàn bộ chuỗi worker → Redis → api → client hoạt động đúng.",
      steps: [
        "Cài `pnpm add -D eventsource` (Node không có sẵn `EventSource` như trình duyệt) rồi tạo `scripts/notifications-stream-client.mts`, khởi tạo `new EventSource(\"http://localhost:3000/api/v1/notifications/stream?token=\" + process.env.ACCESS_TOKEN)`",
        "Đăng ký `source.addEventListener(\"notification\", (event) => console.log(new Date().toISOString(), JSON.parse(event.data)))` và `source.onerror = (err) => console.error(\"[stream error]\", err)`",
        "Chạy script (`tsx scripts/notifications-stream-client.mts`) song song với một request `PATCH /api/v1/tasks/:id` thật đổi status — quan sát script tự in ra notification vừa nhận trong vòng vài chục tới vài trăm mili-giây, không cần refresh hay gọi lại API nào",
        "Ngắt tạm thời `docker compose stop api` rồi `docker compose start api` trong lúc script đang chạy — quan sát script tự in log lỗi rồi tự kết nối lại khi `api` sống lại, không cần sửa dòng code reconnect nào (hành vi mặc định của `EventSource`)",
        "Ghi lại chênh lệch thời gian giữa lúc `PATCH` trả response và lúc script in notification — xác nhận độ trễ chỉ trong khoảng vài chục tới vài trăm mili-giây, khác hẳn cách cũ phải đợi client tự poll",
      ],
    },
  ],
  deliverable:
    "`taskflow-api` có endpoint SSE `GET /api/v1/notifications/stream` xác thực bằng token (query param hoặc header); `worker` publish lên Redis pub/sub ngay sau khi insert `notifications`; `api` subscribe bằng connection riêng và forward đúng tới client đang mở kết nối; kèm một script test client độc lập log lại mọi sự kiện nhận được.",
  successCriteria:
    "Đổi trạng thái một task phải đẩy notification realtime tới người liên quan đang mở kết nối SSE, không cần họ refresh trang; script test client log đúng sự kiện gần như ngay sau khi `PATCH` trả response; dừng rồi khởi động lại `api` khiến script tự reconnect mà không cần sửa code.",
  resources: [
    { title: "MDN — Server-sent events", url: "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events", kind: "doc" },
    { title: "MDN — Using server-sent events", url: "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events", kind: "doc" },
    { title: "MDN — WebSocket API", url: "https://developer.mozilla.org/en-US/docs/Web/API/WebSocket", kind: "doc" },
    { title: "Fastify WebSocket plugin (GitHub, fastify/fastify-websocket)", url: "https://github.com/fastify/fastify-websocket", kind: "tool" },
    { title: "Redis docs — Pub/Sub", url: "https://redis.io/docs/latest/develop/interact/pubsub/", kind: "doc" },
    { title: "Fastify docs — Reply (hijack, raw)", url: "https://fastify.dev/docs/latest/Reference/Reply/", kind: "doc" },
  ],
  quiz: [
    {
      id: "gioi-han-6-ket-noi-http11",
      question:
        "Người dùng mở 8 tab `taskflow-api` cùng lúc, mỗi tab tự mở một `EventSource` riêng tới cùng domain qua HTTP/1.1. Điều gì có khả năng xảy ra?",
      options: [
        "Server sẽ tự động từ chối tab thứ 7 và 8 bằng lỗi 429",
        "SSE không giới hạn số tab nào cả vì mỗi tab dùng một token khác nhau",
        "Trình duyệt sẽ chỉ giữ tối đa khoảng 6 kết nối HTTP/1.1 đồng thời tới cùng domain — các tab còn lại phải đợi tới khi một kết nối khác đóng lại",
        "Cả 8 tab đều nhận notification tức thời như nhau, không có giới hạn nào",
      ],
      answerIndex: 2,
      explanation:
        "Đây là giới hạn có thật của HTTP/1.1 (không phải của SSE hay `taskflow-api`): trình duyệt chỉ giữ tối đa ~6 kết nối đồng thời tới cùng một domain. Nhiều tab cùng mở SSE là kịch bản thực tế dễ chạm giới hạn này.",
    },
    {
      id: "publish-truoc-khi-commit-transaction",
      question:
        "Code `worker` hiện gọi `redis.publish(...)` ngay TRƯỚC khi `db.transaction(...)` chạy xong (do nhầm thứ tự), rồi transaction sau đó rollback vì lỗi validate. Hậu quả gì có thể xảy ra?",
      options: [
        "Không có hậu quả gì vì Redis tự đồng bộ với trạng thái transaction Postgres",
        "BullMQ sẽ tự retry publish sau khi transaction rollback",
        "`reply.hijack()` ở phía api sẽ tự động chặn việc publish sai thứ tự này",
        "Client đang mở SSE có thể nhận một sự kiện báo về notification chưa từng thực sự tồn tại trong Postgres, vì publish xảy ra trước khi biết chắc transaction có commit thành công hay không",
      ],
      answerIndex: 3,
      explanation:
        "Redis và Postgres là hai hệ thống độc lập, không có giao dịch chung. Luôn publish SAU KHI chắc chắn transaction đã commit, để không đẩy tới client một sự kiện mô tả dữ liệu chưa từng tồn tại.",
    },
    {
      id: "vi-sao-can-redis-duplicate-cho-subscriber",
      question: "Nếu `api` dùng chung một `IORedis` instance vừa để `GET`/`SET` cache (B10) vừa để `psubscribe` kênh notification, điều gì có khả năng xảy ra?",
      options: [
        "Connection sau khi gọi `subscribe`/`psubscribe` chuyển sang subscribe mode — các lệnh thường như `GET`/`SET`/`publish` trên cùng connection đó sẽ lỗi hoặc bị treo, cần một connection riêng qua `redis.duplicate()`",
        "Không sao cả, IORedis tự động tách biệt hai loại lệnh trên cùng connection",
        "Redis server sẽ chủ động từ chối kết nối đó",
        "Cache ở B10 sẽ tự động bị vô hiệu hoá khi có subscribe",
      ],
      answerIndex: 0,
      explanation:
        "Đây là hành vi thật của giao thức Redis: một connection ở subscribe mode chỉ còn nhận lệnh liên quan tới subscribe. `redis.duplicate()` tạo một connection thứ hai dùng chung cấu hình, riêng cho việc lắng nghe.",
    },
    {
      id: "token-trong-query-string-rui-ro-gi",
      question: "Vì sao đưa access token vào query string của URL kết nối SSE (`?token=...`) có rủi ro cao hơn so với đưa vào header `Authorization`?",
      options: [
        "Query string chỉ cho phép tối đa 16 ký tự, không đủ chứa JWT",
        "URL đầy đủ (kèm token) có thể bị ghi lại trong access log của server/proxy hoặc lưu trong lịch sử trình duyệt, trong khi header thường không bị log mặc định",
        "Trình duyệt tự động mã hoá query string nên token luôn an toàn",
        "Query string không được hỗ trợ trên HTTPS",
      ],
      answerIndex: 1,
      explanation:
        "Vì access token của `taskflow-api` chỉ sống 15 phút (B05), rủi ro có thời hạn ngắn — nhưng logger vẫn nên `redact` query string nhạy cảm thay vì mặc định ghi nguyên URL vào log.",
    },
    {
      id: "vi-sao-khong-dung-request-jwtverify-mac-dinh",
      question: "Endpoint `/api/v1/notifications/stream` không thể dùng `preHandler: [app.authenticate]` (dựa trên `request.jwtVerify()`) như các route REST khác trong `taskflow-api`. Lý do chính xác nhất là gì?",
      options: [
        "`request.jwtVerify()` không hỗ trợ JWT có trường `exp`",
        "SSE không tương thích với Fastify hook `preHandler`",
        "Access token từ B05 hết hạn quá nhanh để dùng cho kết nối dài",
        "`request.jwtVerify()` mặc định chỉ đọc token từ header `Authorization`, còn `EventSource` của trình duyệt không có cách nào tự thêm header tuỳ ý — cần verify thủ công token lấy từ query string bằng `app.jwt.verify()`",
      ],
      answerIndex: 3,
      explanation:
        "Cơ chế xác thực JWT không đổi — chỉ nơi lấy token phải đổi, vì giới hạn của API trình duyệt (`EventSource` không set header tuỳ ý được), không phải giới hạn của JWT hay Fastify.",
    },
    {
      id: "nhieu-api-instance-va-pub-sub",
      question:
        "Giả sử (ngoài phạm vi lab của module này) `taskflow-api` scale `api` ra 3 instance cùng chạy song song, mỗi instance đều tự `psubscribe(\"notifications:*\")`. Khi `worker` publish một message cho user X đang có kết nối SSE mở trên instance số 2, điều gì xảy ra?",
      options: [
        "Chỉ instance số 2 nhận được message vì Redis biết instance nào đang giữ kết nối của X",
        "Chỉ instance khởi động đầu tiên nhận được message",
        "Cả 3 instance đều nhận được cùng message (vì cả 3 đều subscribe kênh đó), nhưng chỉ instance số 2 tìm thấy connection của X trong registry của nó và thực sự forward — 2 instance còn lại tra registry, thấy rỗng, rồi bỏ qua",
        "Redis sẽ round-robin message tới lần lượt các instance",
      ],
      answerIndex: 2,
      explanation:
        "Pub/sub là fan-out: publish tới một kênh gửi tới MỌI subscriber của kênh đó, không quan tâm ai thực sự cần dùng. `taskflow-api` trong khoá học chỉ chạy 1 instance nên chưa gặp vấn đề này — nhưng cần biết trước khi scale.",
    },
    {
      id: "vi-sao-worker-khong-emit-truc-tiep",
      question: "Vì sao `worker` không thể emit trực tiếp một sự kiện (kiểu `EventEmitter`) để đẩy notification tới connection SSE đang mở trên `api`?",
      options: [
        "Vì `worker` và `api` là hai process Node.js độc lập (dù dùng chung image, khác `command` trong `docker-compose.yml`) — mỗi process có bộ nhớ riêng, một `EventEmitter` ở process này không được process khác lắng nghe trực tiếp",
        "Vì BullMQ chặn mọi event ngoài hàng đợi của nó",
        "Vì `EventEmitter` chỉ hoạt động với dữ liệu dạng số",
        "Vì Fastify không hỗ trợ `EventEmitter`",
      ],
      answerIndex: 0,
      explanation:
        "Đây là lý do cốt lõi cần một cầu nối ngoài process như Redis pub/sub: `worker` và `api` không chia sẻ bộ nhớ, nên bất kỳ cơ chế in-memory nào (kể cả `EventEmitter`) đều vô hình giữa hai process.",
    },
    {
      id: "mat-notification-khi-khong-co-nguoi-nghe",
      question: "Client đóng hết mọi tab `taskflow-api`, không có kết nối SSE nào đang mở. Ngay lúc đó `worker` publish một notification cho user này lên Redis. Notification đó có bị mất vĩnh viễn không?",
      options: [
        "Có — và dữ liệu notification cũng biến mất hoàn toàn khỏi hệ thống, không cách nào lấy lại",
        "Không — BullMQ sẽ tự lưu lại message pub/sub chưa ai nhận và gửi lại sau",
        "Redis tự động chuyển notification đó thành một job BullMQ mới",
        "Phần đẩy tức thời qua pub/sub bị bỏ lỡ (đúng, vì không ai đang subscribe), nhưng dòng `notifications` vẫn đã được `worker` insert vào Postgres trước khi publish — client vẫn lấy lại được qua `GET /api/v1/notifications` khi mở app lần sau",
      ],
      answerIndex: 3,
      explanation:
        "Khác biệt cốt lõi giữa pub/sub và queue: queue giữ job lại chờ xử lý, pub/sub chỉ chuyển tiếp cho ai đang nghe ngay lúc đó. Vì Postgres đã lưu notification trước khi publish, dữ liệu không mất — chỉ phần đẩy tức thời bị bỏ lỡ.",
    },
    {
      id: "heartbeat-vi-sao-can",
      question: "Lab thêm một dòng `setInterval(() => reply.raw.write(\": ping\\n\\n\"), 25_000)` cho mỗi kết nối SSE. Dòng comment `: ping` này để làm gì?",
      options: [
        "Để trình duyệt tính lại độ trễ mạng",
        "Để tăng tốc độ gửi notification thật",
        "Để giữ kết nối không bị một proxy/load balancer ở giữa tự động đóng vì tưởng connection đã \"chết\" do không có dữ liệu chảy qua trong một khoảng thời gian dài — dòng bắt đầu bằng `:` là comment theo chuẩn SSE, client bỏ qua nhưng vẫn tính là có dữ liệu chảy qua",
        "Để `EventSource` biết khi nào cần gửi lại `Last-Event-ID`",
      ],
      answerIndex: 2,
      explanation:
        "Nhiều proxy/load balancer tự đóng kết nối HTTP không có dữ liệu chảy qua sau một khoảng thời gian (idle timeout). Comment `: ping` định kỳ là dữ liệu \"vô hại\" giữ kết nối sống mà không ảnh hưởng logic của client.",
    },
    {
      id: "close-code-1008-websocket",
      question:
        "Trong ví dụ minh hoạ `@fastify/websocket`, khi token không hợp lệ, code gọi `connection.socket.close(1008, \"...\")` thay vì chỉ đơn giản không làm gì (im lặng bỏ qua). Vì sao chủ động đóng bằng mã 1008 tốt hơn?",
      options: [
        "Đóng chủ động với mã chuẩn (\"policy violation\") giúp client biết chính xác lý do bị từ chối thay vì phải đoán qua timeout im lặng, và giải phóng tài nguyên kết nối ngay thay vì giữ một socket \"treo\" không làm gì",
        "1008 làm kết nối tự động retry nhanh hơn",
        "1008 là mã bắt buộc theo chuẩn HTTP cho mọi lỗi 401",
        "Vì `@fastify/websocket` không cho phép giữ kết nối mở quá 1 giây",
      ],
      answerIndex: 0,
      explanation:
        "Đóng socket với một mã chuẩn (RFC 6455) là cách giao tiếp rõ ràng giữa server và client về lý do đóng kết nối, thay vì để client tự đoán qua một kết nối im lặng không phản hồi.",
    },
  ],
};
