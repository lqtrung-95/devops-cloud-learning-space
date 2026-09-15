import type { ModuleDefinition } from "@/content/content-types";

export const sd05DatabaseFundamentalsModule: ModuleDefinition = {
  id: "sd05",
  slug: "sd05-database-fundamentals",
  phaseId: "sd-phase-1",
  order: 5,
  weeks: "Tuần 6–7",
  title: "Database nền tảng",
  emoji: "🗄️",
  eli5Summary:
    "Database giống cái kho của cửa hàng: chọn kiểu kệ theo cách bạn hay lấy hàng, dán mục lục để tìm nhanh, và đặt luật để hai nhân viên không cùng bán một món hàng cuối cùng. Module này dạy bạn chọn kho, dán mục lục và đặt luật đó cho đúng.",
  objectives: [
    "Chọn loại database (relational, key-value, document, wide-column, graph) dựa trên access pattern thay vì trend",
    "Đọc `EXPLAIN (ANALYZE, BUFFERS)`, thiết kế composite/covering index và cân nhắc chi phí ghi của index",
    "Giải thích B-tree vs LSM-tree qua write/read/space amplification",
    "Gọi đúng tên anomaly (lost update, write skew, phantom…) và biết isolation level nào của PostgreSQL chặn được nó",
    "Chọn giữa pessimistic locking (`SELECT … FOR UPDATE`) và optimistic locking (version column) cho luồng trừ tiền",
    "Thiết kế schema cho cùng một bộ access pattern theo hai cách: Postgres normalized và DynamoDB single-table",
  ],
  lessons: [
    { slug: "sql-vs-nosql", title: "SQL vs NoSQL: chọn theo access pattern", minutes: 40, summary: "Năm họ database, mỗi họ giỏi một kiểu truy vấn — chọn theo cách dữ liệu được đọc/ghi, không theo trend." },
    { slug: "indexes-btree-vs-lsm", title: "Index: B-tree vs LSM-tree", minutes: 50, summary: "Mục lục giúp đọc nhanh nhưng làm ghi chậm đi; composite, covering index và hai kiểu storage engine." },
    { slug: "transactions-isolation-levels", title: "Transaction, ACID & isolation level", minutes: 50, summary: "Các anomaly khi transaction chạy song song và isolation level nào của PostgreSQL chặn được chúng." },
    { slug: "locking-pessimistic-optimistic", title: "Locking: pessimistic vs optimistic", minutes: 45, summary: "`SELECT … FOR UPDATE` hay version column — chọn cách chống lost update cho luồng trừ tiền." },
    { slug: "data-modeling-access-patterns", title: "Data modeling theo access pattern", minutes: 50, summary: "Normalize vs denormalize, và thiết kế DynamoDB single-table từ danh sách access pattern." },
  ],
  labs: [
    {
      id: "composite-index-explain-analyze",
      title: "5 triệu dòng: index trước/sau bằng EXPLAIN ANALYZE",
      description: "Tạo bảng orders 5 triệu dòng, đọc query plan, thêm composite/covering index và đo cả lợi ích đọc lẫn chi phí ghi.",
      steps: [
        "Vào Postgres của playground: `docker compose exec postgres psql -U app -d app`, bật `\\timing on`",
        "Tạo bảng `orders(id, customer_id, status, total_cents, created_at)` và nạp dữ liệu bằng `INSERT INTO orders (...) SELECT ... FROM generate_series(1, 5000000)`, sau đó chạy `ANALYZE orders;`",
        "Chạy `EXPLAIN (ANALYZE, BUFFERS) SELECT id, total_cents, created_at FROM orders WHERE customer_id = 4242 ORDER BY created_at DESC LIMIT 20;` — ghi lại loại scan, `Buffers: shared hit/read` và `Execution Time`",
        "Tạo `CREATE INDEX CONCURRENTLY idx_orders_customer_created ON orders (customer_id, created_at DESC);` rồi chạy lại cùng query, so sánh plan và số buffer",
        "Thử query chỉ lọc `created_at` (không có `customer_id`) và giải thích vì sao composite index trên không giúp được (leftmost prefix)",
        "Thêm covering index `(customer_id, created_at DESC) INCLUDE (id, total_cents)`, chạy `VACUUM orders;` rồi tìm `Index Only Scan` và `Heap Fetches` trong plan",
        "Đo chi phí ghi: tạo `orders_noidx (LIKE orders INCLUDING DEFAULTS INCLUDING IDENTITY)`, chèn 500.000 dòng vào mỗi bảng với `\\timing on`, xem kích thước index bằng `\\di+ orders*` và điền bảng kết quả trước/sau",
      ],
    },
    {
      id: "lost-update-locking",
      title: "Tái hiện lost update rồi sửa bằng 2 kiểu locking",
      description: "Hai session psql cùng rút tiền một tài khoản ở READ COMMITTED; sửa bằng `FOR UPDATE`, bằng version column và bằng atomic update.",
      steps: [
        "Tạo `accounts(id int primary key, balance int not null, version int not null)` với một dòng `(1, 100, 1)`; mở 2 terminal chạy `docker compose exec postgres psql -U app -d app` (session A và B)",
        "Tái hiện: A `BEGIN; SELECT balance FROM accounts WHERE id = 1;` → B làm y hệt → A `UPDATE accounts SET balance = 70 WHERE id = 1; COMMIT;` → B `UPDATE accounts SET balance = 50 WHERE id = 1; COMMIT;` → số dư còn 50 thay vì 20",
        "Pessimistic: reset dữ liệu, thêm `FOR UPDATE` vào câu SELECT của cả hai session; quan sát B bị treo và xem ở terminal thứ 3 bằng `SELECT pid, state, wait_event_type, wait_event, left(query, 60) FROM pg_stat_activity WHERE datname = 'app';`",
        "Optimistic: đọc `balance, version`, rồi ghi bằng `UPDATE accounts SET balance = 20, version = version + 1 WHERE id = 1 AND version = 1;` — session thua nhận `UPDATE 0`, phải đọc lại và thử lại",
        "Thử atomic update `UPDATE accounts SET balance = balance - 50 WHERE id = 1 AND balance >= 50;` ở cả hai session và giải thích vì sao không mất update",
        "Viết endpoint `POST /accounts/:id/withdraw` trong service `app` dùng optimistic retry (tối đa 3 lần, có jitter); chạy `k6 run` với 50 VU cùng rút tiền và kiểm tra số dư cuối cùng không âm, khớp với số request thành công",
      ],
    },
    {
      id: "isolation-anomalies-demo",
      title: "Demo anomaly theo từng isolation level",
      description: "Tự tay tạo non-repeatable read và write skew, rồi xem REPEATABLE READ và SERIALIZABLE của PostgreSQL 17 phản ứng thế nào.",
      steps: [
        "Non-repeatable read: session A `BEGIN;` (mặc định READ COMMITTED) đọc `balance` hai lần; giữa hai lần B chạy `UPDATE ... ; COMMIT;`. Lặp lại với `BEGIN ISOLATION LEVEL REPEATABLE READ;` và so sánh",
        "Write skew: tạo bảng `doctors(name text primary key, on_call boolean)` với 2 bác sĩ đang trực; A và B cùng `BEGIN ISOLATION LEVEL REPEATABLE READ;`, cùng `SELECT count(*) FROM doctors WHERE on_call;` (thấy 2), mỗi bên tắt `on_call` của một người khác nhau rồi `COMMIT` → không còn ai trực",
        "Lặp lại bước write skew với `BEGIN ISOLATION LEVEL SERIALIZABLE;` → một session nhận `ERROR: could not serialize access due to read/write dependencies among transactions` (SQLSTATE `40001`)",
        "Điền bảng anomaly × isolation level (READ COMMITTED / REPEATABLE READ / SERIALIZABLE) theo kết quả tự đo, đối chiếu với trang PostgreSQL docs – Transaction Isolation",
        "Viết hàm TypeScript `withTransactionRetry(fn)` bắt lỗi `40001`, rollback và retry toàn bộ transaction với exponential backoff + jitter",
      ],
    },
    {
      id: "order-schema-sql-vs-dynamodb",
      title: "Một app đặt hàng, hai cách thiết kế schema",
      description: "Cùng 5 access pattern, thiết kế Postgres normalized và DynamoDB single-table, rồi viết design doc so sánh trade-off.",
      steps: [
        "Viết 5 access pattern kèm ước lượng tần suất (vd `DAU 200k, mỗi user xem lịch sử đơn 2 lần/ngày ⇒ 4×10⁵ lượt/ngày ≈ 4–5 QPS`): hồ sơ khách, 20 đơn mới nhất của khách, chi tiết đơn + items, đơn `PENDING` trong ngày, tìm đơn theo `orderId`",
        "Postgres: viết DDL `customers`, `orders`, `order_items` (có foreign key) + index cho từng pattern, chạy `EXPLAIN` cho cả 5 query trên dữ liệu sinh bằng `generate_series`",
        "DynamoDB single-table: lập bảng `PK`/`SK`/`GSI1PK`/`GSI1SK`/`GSI2PK` cho từng entity sao cho mỗi pattern là đúng một `GetItem` hoặc `Query` — không có `Scan`",
        "(Tuỳ chọn) chạy `docker run -d -p 8000:8000 amazon/dynamodb-local`, tạo bảng bằng `aws dynamodb create-table --endpoint-url http://localhost:8000 ...`, `put-item` vài item và `query` thử pattern 2 và 3",
        "Viết design doc theo Phụ lục A (mục 4 Data model và mục 7 Trade-off): chọn gì, bỏ gì, và khi nào đổi ý (vd thêm nhu cầu báo cáo ad-hoc)",
      ],
    },
  ],
  deliverable:
    "Thư mục `sd05/` trong repo sd-playground gồm: script SQL sinh dữ liệu + query plan `EXPLAIN ANALYZE` trước/sau khi thêm index (kèm chi phí ghi), transcript demo lost update và write skew cùng cách sửa, và design doc schema app đặt hàng (Postgres normalized vs DynamoDB single-table).",
  successCriteria:
    "Nhìn query plan nói được vì sao query chậm và index nào sẽ giúp; chọn và bảo vệ được isolation level + cách locking cho luồng trừ tiền; với một danh sách access pattern cho trước, thiết kế được schema không cần Scan.",
  resources: [
    { title: "PostgreSQL docs – Transaction Isolation", url: "https://www.postgresql.org/docs/current/transaction-iso.html", kind: "doc" },
    { title: "PostgreSQL docs – Explicit Locking", url: "https://www.postgresql.org/docs/current/explicit-locking.html", kind: "doc" },
    { title: "PostgreSQL docs – Using EXPLAIN", url: "https://www.postgresql.org/docs/current/using-explain.html", kind: "doc" },
    { title: "Use The Index, Luke! — SQL indexing cho developer", url: "https://use-the-index-luke.com/", kind: "book" },
    { title: "Designing Data-Intensive Applications (Kleppmann) — ch.2–3, 7", url: "https://dataintensive.net/", kind: "book" },
    { title: "Amazon DynamoDB – Best practices for designing and architecting", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html", kind: "doc" },
    { title: "explain.dalibo.com — trực quan hoá query plan PostgreSQL", url: "https://explain.dalibo.com/", kind: "tool" },
  ],
  quiz: [
    {
      id: "pick-db-wallet",
      question: "Bạn thiết kế ví điện tử: trừ tiền người gửi, cộng tiền người nhận, ghi sổ cái (ledger) và cuối ngày chạy truy vấn đối soát tuỳ ý. Lựa chọn database chính hợp lý nhất là gì?",
      options: [
        "Wide-column (Cassandra) vì ghi rất nhanh",
        "Redis làm nguồn dữ liệu chính vì latency thấp nhất",
        "Relational (PostgreSQL) với transaction nhiều dòng và ràng buộc `CHECK`",
        "Graph database vì có quan hệ người gửi – người nhận",
      ],
      answerIndex: 2,
      explanation:
        "Đây là 'sổ kế toán có kiểm tra chéo': cần transaction ACID trên nhiều dòng, ràng buộc (số dư không âm) và truy vấn ad-hoc. Relational làm tốt cả ba. Cassandra/Redis giỏi truy cập theo key, không giỏi transaction nhiều bảng hay đối soát tuỳ ý.",
    },
    {
      id: "composite-index-column-order",
      question: "Query chạy nhiều nhất là `WHERE customer_id = $1 AND created_at >= $2 ORDER BY created_at DESC LIMIT 20`. Index nào phù hợp nhất?",
      options: [
        "`(customer_id, created_at)`",
        "`(created_at, customer_id)`",
        "Hai index riêng `(customer_id)` và `(created_at)` — luôn tốt ngang composite",
        "Không cần index, shared buffers sẽ cache đủ",
      ],
      answerIndex: 0,
      explanation:
        "Giống danh bạ sắp theo họ rồi mới tới tên: cột so sánh bằng (`customer_id`) đứng trước, cột range/sort (`created_at`) đứng sau, nên B-tree nhảy thẳng tới đúng 'họ' rồi đọc tuần tự 20 entry đã sắp sẵn. Đảo thứ tự thì phải lướt qua mọi khách trong khoảng thời gian đó.",
    },
    {
      id: "lsm-read-amplification",
      question: "Cụm Cassandra ghi rất ổn nhưng point read p99 tăng dần; metric cho thấy số SSTable mỗi partition tăng vì compaction không theo kịp. Giải thích đúng nhất là gì?",
      options: [
        "B-tree bị page split quá nhiều",
        "Memtable quá nhỏ nên dữ liệu bị mất khi flush",
        "Commit log ghi ngẫu nhiên nên chậm",
        "Read amplification: một lần đọc phải kiểm tra nhiều SSTable hơn vì chưa được compaction gộp lại",
      ],
      answerIndex: 3,
      explanation:
        "Như cuốn sổ nháp thu ngân: trang đã xếp vào hộp nhưng chưa ai gộp các hộp, nên tìm một món phải lục nhiều hộp. LSM đổi ghi rẻ lấy đọc/compaction đắt hơn; bloom filter giúp bỏ qua bớt file, nhưng compaction tụt lại thì đọc vẫn chậm.",
    },
    {
      id: "pg-default-isolation-reread",
      question: "Trên PostgreSQL với cấu hình mặc định, transaction T1 đọc `balance` hai lần. Giữa hai lần, T2 cập nhật balance và COMMIT. Lần đọc thứ hai của T1 thấy gì?",
      options: [
        "Giá trị cũ, vì PostgreSQL mặc định là REPEATABLE READ",
        "Giá trị mới, vì mặc định là READ COMMITTED: mỗi câu lệnh lấy snapshot mới",
        "T1 bị lỗi `40001` và phải retry",
        "T1 bị chặn cho tới khi T2 commit",
      ],
      answerIndex: 1,
      explanation:
        "READ COMMITTED giống xem bảng giá dán ở cửa mỗi lần đi ngang: lần nào nhìn cũng thấy bản mới nhất đã dán (committed). Đó là non-repeatable read. Muốn 'chụp ảnh' một lần cho cả transaction thì dùng REPEATABLE READ.",
    },
    {
      id: "write-skew-repeatable-read",
      question: "Hai bác sĩ trực cùng ca, luật là phải còn ít nhất 1 người trực. Cả hai đồng thời xin nghỉ: mỗi transaction (REPEATABLE READ, PostgreSQL) đếm thấy 2 người trực rồi tắt `on_call` của chính mình. Kết quả?",
      options: [
        "PostgreSQL chặn vì REPEATABLE READ của nó ngăn được phantom",
        "Transaction thứ hai lỗi `40001` vì hai bên sửa cùng một dòng",
        "Cả hai commit thành công và không còn ai trực — write skew; cần SERIALIZABLE hoặc khoá tường minh",
        "Xảy ra dirty read vì hai bên đọc dữ liệu chưa commit của nhau",
      ],
      answerIndex: 2,
      explanation:
        "Mỗi người nhìn 'ảnh chụp' lúc bắt đầu (snapshot) và sửa hai dòng khác nhau, nên snapshot isolation không phát hiện xung đột. SERIALIZABLE (SSI) theo dõi phụ thuộc đọc–ghi và huỷ một transaction; hoặc dùng `SELECT … FOR UPDATE` trên các dòng liên quan.",
    },
    {
      id: "for-update-plain-select",
      question: "T1 đã chạy `SELECT * FROM accounts WHERE id = 1 FOR UPDATE` và chưa commit. T2 chạy `SELECT balance FROM accounts WHERE id = 1` (không có FOR UPDATE). Chuyện gì xảy ra?",
      options: [
        "T2 bị chặn cho tới khi T1 commit",
        "T2 đọc được ngay giá trị đã commit gần nhất; chỉ UPDATE/DELETE/`FOR UPDATE` trên dòng đó mới phải chờ",
        "T2 nhận lỗi deadlock",
        "T2 đọc được giá trị T1 đang sửa dở",
      ],
      answerIndex: 1,
      explanation:
        "`FOR UPDATE` giống cầm chìa khoá phòng thử đồ: người khác không vào *sửa* được, nhưng vẫn nhìn được tấm ảnh đã chụp trước đó. Nhờ MVCC, SELECT thường không bị row lock chặn và không bao giờ thấy dữ liệu chưa commit.",
    },
    {
      id: "optimistic-update-zero",
      question: "App chạy `UPDATE products SET stock = 4, version = version + 1 WHERE id = 10 AND version = 7` và nhận `UPDATE 0`. Nên xử lý thế nào?",
      options: [
        "Có người đã sửa dòng này sau khi bạn đọc (version không còn là 7): đọc lại, tính lại và thử lại hoặc báo conflict",
        "Dòng không tồn tại, tạo mới bằng INSERT",
        "Lỗi mạng, gửi lại đúng câu UPDATE đó cho tới khi thành công",
        "Bỏ điều kiện `version = 7` để câu lệnh chạy được",
      ],
      answerIndex: 0,
      explanation:
        "Optimistic locking giống nộp bài sửa trên 'bản số 7': nếu lúc nộp tài liệu đã thành bản 8 thì phải lấy bản mới về sửa lại. Gửi lại y nguyên câu cũ sẽ luôn trả 0; bỏ điều kiện version thì quay về lost update.",
    },
    {
      id: "choose-optimistic-for-forms",
      question: "Trang admin cho sửa thông tin sản phẩm: người dùng mở form vài phút rồi bấm Lưu, hiếm khi hai người sửa cùng lúc. Cách chống ghi đè nào hợp lý nhất?",
      options: [
        "`SELECT … FOR UPDATE` khi mở form và giữ transaction tới lúc bấm Lưu",
        "Chuyển toàn bộ database sang SERIALIZABLE",
        "`LOCK TABLE products` mỗi lần có người sửa",
        "Optimistic locking: gửi kèm `version` (hoặc ETag) và `UPDATE … WHERE version = $v`",
      ],
      answerIndex: 3,
      explanation:
        "Xung đột hiếm + thời gian suy nghĩ dài ⇒ optimistic. Giữ 'chìa khoá phòng thử' (row lock + transaction mở) suốt vài phút người dùng suy nghĩ sẽ chặn người khác, giữ connection và cản VACUUM dọn phiên bản cũ.",
    },
    {
      id: "dynamodb-avoid-scan",
      question: "Bảng DynamoDB `orders` có partition key `orderId`. Tính năng mới cần 'liệt kê 20 đơn mới nhất của một khách'. Cách làm đúng?",
      options: [
        "`Scan` cả bảng với `FilterExpression` theo customerId",
        "Tăng read capacity để Scan nhanh hơn",
        "Thêm GSI có partition key `CUSTOMER#<id>`, sort key là thời gian tạo đơn, rồi `Query` với `ScanIndexForward=false, Limit=20`",
        "`Query` trên bảng chính với `FilterExpression` theo customerId",
      ],
      answerIndex: 2,
      explanation:
        "Như tủ gửi đồ đánh số: chỉ lấy nhanh khi biết đúng mã tủ. Pattern mới cần một 'dãy tủ' mới xếp theo khách — tức GSI. Scan hay FilterExpression vẫn đọc (và tính tiền) mọi item trước khi lọc; còn Query trên bảng chính thì bắt buộc phải có `orderId`.",
    },
    {
      id: "index-write-cost",
      question: "Bảng `events` nhận cỡ vài nghìn INSERT/giây. Một dev thêm 8 index 'cho chắc', sau đó ghi chậm hẳn và lượng WAL tăng mạnh. Giải thích và hướng xử lý đúng?",
      options: [
        "Index không ảnh hưởng tới ghi, nguyên nhân chắc là mạng",
        "Mỗi INSERT phải cập nhật thêm 8 cây index (kèm WAL tương ứng); giữ index phục vụ query thật, bỏ index có `idx_scan = 0` trong `pg_stat_user_indexes`",
        "Nên chuyển mọi index sang kiểu hash để ghi nhanh gấp đôi",
        "Tăng `work_mem` là hết chậm",
      ],
      answerIndex: 1,
      explanation:
        "Mỗi index là một cuốn mục lục phải chép thêm một dòng mỗi khi có hàng mới vào kho. 8 mục lục ⇒ 8 lần chép thêm + WAL. Index là trade-off: chỉ giữ cái phục vụ access pattern thật, đo bằng thống kê sử dụng.",
    },
  ],
};
