import type { ModuleDefinition } from "@/content/content-types";

export const sd07AsyncMessagingModule: ModuleDefinition = {
  id: "sd07",
  slug: "sd07-async-messaging",
  phaseId: "sd-phase-1",
  order: 7,
  weeks: "Tuần 9–10",
  title: "Async & messaging",
  emoji: "📨",
  eli5Summary:
    "Quán phở đông khách không bắt khách đứng chờ bếp nấu xong mới thu tiền: thu ngân ghim phiếu lên bảng, bếp làm dần. Module này dạy bạn dựng 'bảng ghim phiếu' cho hệ thống — sao cho không phiếu nào bị rơi và không món nào bị nấu hai lần, kể cả khi ai đó ngã giữa chừng.",
  objectives: [
    "Quyết định khi nào nên tách một bước sang async và nói rõ cái giá phải trả (lag, eventual consistency, vận hành)",
    "So sánh message queue, pub/sub và log (Kafka/Redpanda); thiết kế topic, partition key và consumer group",
    "Giải thích at-most-once, at-least-once và 'exactly-once' thực chất là gì; viết consumer idempotent",
    "Giải quyết dual-write bằng transactional outbox (hoặc CDC) để không mất event khi service crash",
    "Xử lý poison message bằng retry có giới hạn + dead-letter queue, và theo dõi backpressure qua consumer lag",
  ],
  lessons: [
    { slug: "why-async-messaging", title: "Vì sao cần async & hàng đợi", minutes: 40, summary: "Bảng ghim phiếu ở quán phở: buffer tải, tách service, retry — và cái giá phải trả." },
    { slug: "queue-pubsub-log", title: "Queue vs pub/sub vs log", minutes: 40, summary: "Thùng thư, loa phường và cuốn sổ nhật ký chung: ba cách phân phát message." },
    { slug: "partitions-consumer-groups-ordering", title: "Partition, consumer group & ordering", minutes: 45, summary: "Quầy thu ngân theo thẻ thành viên: thứ tự theo key, song song theo partition, rebalance." },
    { slug: "delivery-semantics-idempotency", title: "Delivery semantics & idempotency", minutes: 50, summary: "Shipper gạch sổ trước hay sau khi giao? Mất, trùng, và mã vận đơn chống trùng." },
    { slug: "transactional-outbox-cdc", title: "Transactional outbox & CDC", minutes: 50, summary: "Viết phiếu bằng giấy than: đơn hàng và event cùng commit, relay mang đi sau." },
    { slug: "backpressure-dead-letter-queue", title: "Backpressure, poison message & DLQ", minutes: 45, summary: "Kho đầy thì báo chậm lại; gói hàng hỏng thì đưa lên kệ thất lạc." },
  ],
  labs: [
    {
      id: "redpanda-partitions-consumer-group",
      title: "Redpanda: partition, ordering theo key & rebalance",
      description: "Thêm Redpanda vào sd-playground, tạo topic 3 partition, quan sát thứ tự theo key và rebalance khi thêm consumer.",
      steps: [
        "Thêm service `redpanda` (image `redpandadata/redpanda`, Kafka API `redpanda:9092`) vào `docker-compose.yml`, chạy `docker compose up -d redpanda` rồi `docker compose exec redpanda rpk cluster health`",
        "Tạo topic: `docker compose exec redpanda rpk topic create orders -p 3` và kiểm tra bằng `rpk topic describe orders -p`",
        "Produce 10 message cho 3 key khác nhau (`rpk topic produce orders -k user-1`…), rồi `rpk topic consume orders -o start -n 10 -f '%p %o %k %v\\n'` — xác nhận mỗi key luôn nằm ở một partition và đúng thứ tự",
        "Viết consumer `kafkajs` (groupId `email-svc`) log `partition/offset/key`; chạy 1 instance, `rpk group describe email-svc` để xem nó nhận cả 3 partition",
        "Mở thêm instance thứ 2 và thứ 3, quan sát log rebalance và cột MEMBER-ID trong `rpk group describe`; thêm instance thứ 4 và chỉ ra consumer bị idle",
        "Ghi lại: điều gì xảy ra với thứ tự của key `user-1` nếu chạy `rpk topic add-partitions orders --num 3`",
      ],
    },
    {
      id: "transactional-outbox-relay",
      title: "Đặt hàng → gửi email bằng transactional outbox",
      description: "Tạo bảng outbox trong Postgres, ghi đơn + event trong một transaction, viết relay đẩy sang Redpanda, kill relay giữa chừng và chứng minh không mất event.",
      steps: [
        "Tạo bảng `orders` và `outbox(id bigserial, aggregate_id, type, payload jsonb, created_at, published_at)` bằng `docker compose exec postgres psql -U app -d app -f /sql/outbox.sql`",
        "Sửa endpoint `POST /orders` của app: `INSERT INTO orders` và `INSERT INTO outbox` trong cùng `BEGIN … COMMIT`",
        "Viết relay: `SELECT … WHERE published_at IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED` → `producer.send` (key = `aggregate_id`, header `event-id`) → `UPDATE outbox SET published_at = now()`",
        "Bắn 1.000 đơn (`k6 run` hoặc vòng lặp `curl`), trong lúc đó `docker compose kill relay` rồi `docker compose up -d relay`",
        "Chứng minh không mất: `SELECT count(*) FROM outbox WHERE published_at IS NULL` về 0 và số event distinct theo `event-id` trên topic bằng số đơn",
        "Đếm event trùng do relay crash và ghi vào báo cáo — đây là lý do consumer ở lab sau phải idempotent",
      ],
    },
    {
      id: "idempotent-email-consumer",
      title: "Consumer crash trước khi commit & sửa bằng idempotency key",
      description: "Tái hiện email bị gửi trùng khi consumer chết sau khi xử lý nhưng trước khi commit offset, rồi sửa bằng bảng dedup.",
      steps: [
        "Viết consumer `email-svc` với `autoCommit: false`: ghi 'email' vào bảng `emails_sent_naive` (không có unique constraint), sau đó mới `commitOffsets`",
        "Chèn `if (process.env.CRASH_AFTER_SEND) process.exit(1)` giữa bước ghi email và commit; chạy, rồi khởi động lại không có biến đó",
        "Đếm trùng: `SELECT order_id, count(*) FROM emails_sent_naive GROUP BY 1 HAVING count(*) > 1` — phải thấy dòng trùng",
        "Thêm bảng `processed_messages(consumer, message_id)` với PRIMARY KEY; trong cùng transaction với `INSERT INTO emails_sent`: `INSERT … ON CONFLICT DO NOTHING`, chỉ ghi email khi insert được 1 dòng",
        "Lặp lại kịch bản crash và dùng `rpk group describe email-svc` + truy vấn trên để chứng minh mỗi đơn đúng 1 email",
      ],
    },
    {
      id: "poison-message-dlq-lag",
      title: "Poison message, DLQ & đo consumer lag",
      description: "Bắn một message hỏng vào topic, quan sát partition bị kẹt, rồi thêm retry có giới hạn + topic orders.dlq và theo dõi lag khi tải tăng.",
      steps: [
        "Tạo topic DLQ: `docker compose exec redpanda rpk topic create orders.dlq -p 1`",
        "Gửi message sai schema: `echo 'not-json' | docker compose exec -T redpanda rpk topic produce orders -k user-7`; quan sát consumer lặp lỗi và `rpk group describe email-svc` báo LAG tăng ở partition đó",
        "Sửa consumer: phân loại lỗi tạm thời/vĩnh viễn, retry tối đa 3 lần có backoff + jitter, sau đó gửi sang `orders.dlq` kèm header lỗi + partition/offset gốc rồi mới commit",
        "Kiểm tra DLQ: `rpk topic consume orders.dlq -n 1` thấy message và header; partition gốc chạy tiếp, LAG về 0",
        "Tạo backlog: tạm dừng consumer (`docker compose stop email-worker`), bắn 50.000 message, bật lại với 1 rồi 3 instance; ghi thời gian rút hết lag và giải thích giới hạn ở số partition",
      ],
    },
  ],
  deliverable:
    "Repo sd-playground có Redpanda + outbox relay + consumer idempotent + DLQ, kèm design doc ngắn (Phụ lục A) cho luồng 'đặt hàng → gửi email' với bảng trade-off: queue vs log, chọn partition key, commit strategy, outbox vs CDC.",
  successCriteria:
    "Thiết kế được luồng async không mất message và không double-xử lý khi mọi thành phần (app, relay, broker client, consumer) có thể crash; giải thích được vì sao ordering chỉ theo partition và 'exactly-once' của Kafka không bao gồm side effect bên ngoài.",
  resources: [
    { title: "Apache Kafka documentation — Design (log, consumer, delivery semantics)", url: "https://kafka.apache.org/documentation/#design", kind: "doc" },
    { title: "microservices.io — Pattern: Transactional outbox", url: "https://microservices.io/patterns/data/transactional-outbox.html", kind: "doc" },
    { title: "microservices.io — Pattern: Idempotent consumer", url: "https://microservices.io/patterns/communication-style/idempotent-consumer.html", kind: "doc" },
    { title: "Stripe blog — Designing robust and predictable APIs with idempotency", url: "https://stripe.com/blog/idempotency", kind: "doc" },
    { title: "Redpanda documentation (rpk, topic, consumer group)", url: "https://docs.redpanda.com/", kind: "doc" },
    { title: "Debezium — Outbox Event Router (CDC cho outbox)", url: "https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html", kind: "doc" },
    { title: "KafkaJS documentation", url: "https://kafka.js.org/docs/getting-started", kind: "tool" },
    { title: "Designing Data-Intensive Applications (Martin Kleppmann) — ch.11 Stream Processing", url: "https://dataintensive.net/", kind: "book" },
  ],
  quiz: [
    {
      id: "when-to-go-async",
      question:
        "API đặt hàng đang gọi tuần tự Payment → Inventory → Email → Analytics và p99 tới 1,2 s. Bước nào hợp lý NHẤT để chuyển sang async qua topic?",
      options: [
        "Payment — vì gọi cổng thanh toán chậm nhất",
        "Inventory — vì cần trừ kho nhanh",
        "Email và Analytics — khách không cần chờ chúng xong mới biết đơn đã đặt",
        "Tất cả — async luôn nhanh hơn sync",
      ],
      answerIndex: 2,
      explanation:
        "Như quán phở: thu ngân vẫn phải thu tiền ngay (Payment cần kết quả để trả lời khách), còn rửa bát, ghi sổ thống kê thì ghim phiếu làm sau. Chỉ đẩy sang async những bước mà người gọi không cần kết quả ngay.",
    },
    {
      id: "spike-backlog-math",
      question:
        "Flash sale 10 phút: 2.000 event/s đổ vào topic, email consumer xử lý tối đa 1.000 event/s. Sau đợt sale tải về 200/s. Điều gì đúng?",
      options: [
        "Backlog cỡ 600.000 event rồi rút dần khoảng 800/s — email trễ vài chục phút là có thể",
        "Không có backlog vì Kafka tự scale consumer",
        "Broker sẽ từ chối 50% event để bảo vệ consumer",
        "Consumer sẽ bị crash ngay vì nhận quá nhiều event",
      ],
      answerIndex: 0,
      explanation:
        "Bảng ghim phiếu hấp thụ phần dư: (2.000 − 1.000) × 600 s ≈ 600.000 phiếu. Sau sale bếp rút (1.000 − 200) = 800/s ⇒ ~12,5 phút nữa mới hết. Async dời việc sang sau chứ không làm nó biến mất.",
    },
    {
      id: "pubsub-vs-queue-fanout",
      question:
        "Event OrderPlaced cần được cả Email service và Analytics service nhận đủ, và Email service chạy 3 instance chia tải. Mô hình nào phù hợp nhất?",
      options: [
        "Một queue duy nhất cho cả hai service đọc chung",
        "Redis Pub/Sub với mỗi instance subscribe riêng",
        "Log (Kafka/Redpanda) với group email-svc và group analytics riêng",
        "Gọi HTTP song song từ Order API",
      ],
      answerIndex: 2,
      explanation:
        "Sổ nhật ký chung: mỗi 'hộ' (consumer group) tự đánh dấu đã đọc tới đâu nên cả hai đều đọc đủ, còn trong group email-svc thì 3 instance chia partition. Queue chung sẽ làm hai service tranh nhau; Redis Pub/Sub làm 3 instance email nhận trùng và ai offline là lỡ.",
    },
    {
      id: "ordering-per-partition",
      question:
        "Topic orders có 6 partition. Bạn cần mọi event của cùng một đơn (Created → Paid → Shipped) được xử lý đúng thứ tự. Nên làm gì?",
      options: [
        "Không cần làm gì, Kafka đảm bảo thứ tự trên toàn topic",
        "Dùng key = order_id khi produce",
        "Dùng key ngẫu nhiên để chia đều tải",
        "Giảm consumer xuống 1 là đủ, giữ nguyên 6 partition và không đặt key",
      ],
      answerIndex: 1,
      explanation:
        "Như quầy thu ngân chia theo số thẻ: cùng thẻ luôn vào cùng quầy. Kafka chỉ giữ thứ tự TRONG một partition; cùng key ⇒ cùng partition ⇒ đúng thứ tự. Không đặt key thì các event của một đơn có thể rơi vào partition khác nhau.",
    },
    {
      id: "consumers-exceed-partitions",
      question: "Consumer group có 8 instance nhưng topic chỉ có 4 partition. Lag vẫn cao. Chuyện gì đang xảy ra?",
      options: [
        "Mỗi partition được 2 consumer đọc song song nên đã nhanh gấp đôi",
        "Broker đang chia message ngẫu nhiên cho 8 consumer",
        "Cần thêm consumer group thứ hai để tăng tốc",
        "Chỉ 4 consumer làm việc, 4 cái còn lại idle — muốn song song hơn phải tăng partition (và cân nhắc ảnh hưởng tới key)",
      ],
      answerIndex: 3,
      explanation:
        "3 quầy thu ngân mà 4 nhân viên thì 1 người đứng chơi. Trong một group mỗi partition chỉ giao cho tối đa 1 consumer, nên parallelism bị chặn bởi số partition. Thêm partition làm đổi hash(key) % N nên thứ tự của key cũ có thể bị xáo trộn trong giai đoạn chuyển.",
    },
    {
      id: "crash-after-process-before-commit",
      question:
        "Consumer gửi email xong thì bị OOM-kill trước khi commit offset. Consumer khởi động lại với cấu hình mặc định 'xử lý rồi mới commit'. Kết quả?",
      options: [
        "Email bị mất vì offset chưa commit",
        "Khách nhận email lần hai vì message được đọc lại từ offset cũ",
        "Kafka biết email đã gửi nên bỏ qua",
        "Consumer group bị xoá và phải tạo lại",
      ],
      answerIndex: 1,
      explanation:
        "Shipper giao hàng xong nhưng hết pin trước khi gạch sổ ⇒ hôm sau giao lại. Đó là at-least-once: không mất nhưng có thể trùng. Muốn khách chỉ nhận 1 lần, 'lễ tân' phải kiểm tra mã vận đơn (idempotency key).",
    },
    {
      id: "kafka-exactly-once-scope",
      question:
        "Team bật idempotent producer + Kafka transactions và nói 'giờ đã exactly-once, không cần dedup khi gọi API gửi SMS nữa'. Nhận định nào đúng?",
      options: [
        "Đúng, transactions bao trùm mọi hệ thống consumer gọi tới",
        "Đúng, miễn là SMS provider dùng HTTPS",
        "Sai, Kafka không hỗ trợ transactions",
        "Sai, exactly-once của Kafka chỉ áp dụng cho đọc-xử lý-ghi trong Kafka; lời gọi SMS bên ngoài vẫn cần idempotency key",
      ],
      answerIndex: 3,
      explanation:
        "Sổ gạch của bưu cục chỉ đồng bộ với kho của chính bưu cục. Transactions gom 'ghi topic + commit offset' thành một, nhưng SMS provider nằm ngoài sổ đó — crash sau khi gọi SMS vẫn dẫn tới gọi lại. Cần idempotency key hoặc dedup.",
    },
    {
      id: "dual-write-problem",
      question:
        "Code: `await db.query('INSERT INTO orders ...'); await producer.send(orderPlaced);`. Rủi ro chính và cách sửa chuẩn là gì?",
      options: [
        "Service có thể crash giữa hai lệnh làm đơn tồn tại mà không có event — dùng transactional outbox hoặc CDC",
        "producer.send chậm — chuyển sang gửi song song với INSERT",
        "INSERT có thể trùng — thêm retry cho producer",
        "Không có rủi ro vì Postgres và Kafka đều bền",
      ],
      answerIndex: 0,
      explanation:
        "Đây là dual write: hai hệ thống không chung transaction. Outbox giống viết phiếu bằng giấy than — đơn và event được ghi trong cùng một transaction Postgres, relay (hoặc CDC đọc WAL) mang event đi sau.",
    },
    {
      id: "outbox-relay-duplicates",
      question: "Relay của outbox gửi event thành công nhưng crash trước khi UPDATE published_at. Sau khi relay chạy lại, điều gì xảy ra và ai phải xử lý?",
      options: [
        "Event bị mất, cần backup Postgres",
        "Redpanda tự phát hiện trùng vì cùng payload",
        "Event được gửi lại (trùng) — consumer phải idempotent theo event-id",
        "Relay bị kẹt vĩnh viễn vì dòng outbox đang bị khoá",
      ],
      answerIndex: 2,
      explanation:
        "Người chạy bàn đưa phiếu xuống bếp nhưng ngã trước khi đóng dấu 'đã gửi' ⇒ người khác mang phiếu đó xuống lần nữa. Outbox bảo đảm không mất (at-least-once), còn bếp phải nhận ra số phiếu trùng. Lock FOR UPDATE tự nhả khi transaction của relay chết.",
    },
    {
      id: "poison-message-dlq",
      question:
        "Một message có payload sai schema làm consumer throw liên tục; lag partition 2 tăng từ 0 lên 50.000 trong khi các partition khác bình thường. Cách xử lý đúng nhất?",
      options: [
        "Tăng số lần retry lên vô hạn cho chắc",
        "Retry có giới hạn cho lỗi tạm thời, lỗi vĩnh viễn thì đẩy sang DLQ kèm metadata, commit offset rồi đi tiếp; alert và replay sau khi sửa",
        "Xoá topic và tạo lại",
        "Thêm consumer vào group để xử lý nhanh hơn",
      ],
      answerIndex: 1,
      explanation:
        "Gói hàng ghi sai địa chỉ thì đưa lên kệ thất lạc chứ không để shipper cố giao mãi làm kẹt cả tuyến. Thêm consumer không giúp vì partition 2 vẫn chỉ có 1 consumer và nó vẫn kẹt ở cùng message.",
    },
  ],
};
