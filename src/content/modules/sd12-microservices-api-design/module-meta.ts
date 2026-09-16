import type { ModuleDefinition } from "@/content/content-types";

export const sd12MicroservicesApiDesignModule: ModuleDefinition = {
  id: "sd12",
  slug: "sd12-microservices-api-design",
  phaseId: "sd-phase-2",
  order: 12,
  weeks: "Tuần 16",
  title: "Microservices & API design",
  emoji: "🍜",
  eli5Summary:
    "Một quán ăn nhỏ có 1 bếp chung nấu hết mọi món — khi đông khách, chủ quán mở thành khu ẩm thực nhiều quầy chuyên biệt (phở, nước ép, chè), mỗi quầy tự quản nguyên liệu riêng. Nhanh và linh hoạt hơn, nhưng khi khách đặt combo và quầy chè hết nguyên liệu, không ai bấm 'rollback cả hoá đơn' được nữa — phải tự tay hoàn tiền từng quầy đã làm xong. Module này dạy khi nào nên mở thêm quầy, tách ranh giới ở đâu, ai dẫn khách tới đúng quầy, và cách hoàn tiền dây chuyền khi một quầy làm sai.",
  objectives: [
    "Nêu được ≥3 lý do KHÔNG nên tách microservices và áp dụng nguyên tắc 'monolith-first' khi quy mô/đội ngũ chưa cần",
    "Vẽ ranh giới service theo bounded context (domain), không theo layer kỹ thuật, và giải thích vì sao database-per-service loại bỏ cross-service join/transaction",
    "So sánh API gateway, BFF, service discovery (client-side vs server-side) và biết khi nào cần thêm service mesh",
    "Thiết kế saga (choreography vs orchestration) với compensating transaction để giữ dữ liệu nhất quán khi một bước lỗi giữa chừng",
    "Áp dụng API design tốt: resource naming, versioning, idempotent POST bằng idempotency key, và chọn cursor thay vì offset pagination khi dữ liệu lớn",
  ],
  lessons: [
    {
      slug: "should-you-split-microservices",
      title: "Có nên tách microservices?",
      minutes: 40,
      summary: "Từ 1 bếp chung (monolith) tới khu ẩm thực nhiều quầy (microservices) — cái giá vận hành thật đằng sau lời hứa 'linh hoạt hơn'.",
    },
    {
      slug: "service-boundary-data-ownership",
      title: "Service boundary & data ownership",
      minutes: 45,
      summary: "Mỗi quầy có tủ nguyên liệu riêng: bounded context, database-per-service, và vì sao không còn JOIN chung được nữa.",
    },
    {
      slug: "api-gateway-service-discovery",
      title: "API gateway & service discovery",
      minutes: 40,
      summary: "Quầy lễ tân dẫn khách tới đúng quầy đang mở: gateway, BFF, service discovery và service mesh (khi nào cần).",
    },
    {
      slug: "saga-choreography-orchestration",
      title: "Saga: choreography vs orchestration",
      minutes: 50,
      summary: "Combo phở + nước ép + chè lỡ hết nguyên liệu giữa chừng: ai điều phối hoàn tiền, và hoàn theo thứ tự nào.",
    },
    {
      slug: "api-design-pagination-idempotency",
      title: "API design tốt: pagination, idempotency, error",
      minutes: 45,
      summary: "Tờ menu rõ ràng, mã phiếu chống gọi món trùng, và cách lật trang menu dài 5 triệu dòng mà không chậm dần.",
    },
  ],
  labs: [
    {
      id: "monolith-to-services-design-doc",
      title: "Design doc: tách app đặt hàng monolith thành service",
      description: "Viết design doc (Phụ lục A) xác định ranh giới service, dữ liệu mỗi service sở hữu và API giữa chúng cho luồng đặt hàng.",
      steps: [
        "Liệt kê mọi entity/bảng trong app đặt hàng monolith hiện có ở `sd-playground` (`orders`, `inventory`, `payments`, `users`…) và nhóm chúng theo bounded context: Order, Inventory, Payment, Shipping",
        "Với mỗi context, viết bảng `Service | Dữ liệu sở hữu | Không được service khác đọc thẳng DB` — quyết định service nào là 'nguồn sự thật' (source of truth) cho từng entity",
        "Thiết kế API đồng bộ giữa các service cho luồng đặt hàng (vd `POST /orders` gọi `GET /inventory/{sku}/availability`) và ghi rõ timeout/retry mặc định cho mỗi call, tham chiếu pattern reliability đã học ở SD11",
        "Điền mục 7 'Trade-off & alternatives considered' của template: so sánh giữ nguyên monolith / modular monolith / tách 3 service — nêu rõ khi nào đổi ý quay lại monolith",
        "Liệt kê ≥3 lý do cụ thể của hệ thống này KHÔNG nên tách thêm nữa (vd Shipping chưa đủ tải riêng để cần scale độc lập)",
      ],
    },
    {
      id: "saga-orchestration-order-flow",
      title: "Saga orchestration: đặt hàng → giữ hàng → trừ tiền → giao hàng",
      description: "Dựng saga orchestrator cho luồng đặt hàng trên nền outbox + Redpanda của SD07, tiêm lỗi ở bước trừ tiền và chứng minh compensation chạy đúng.",
      steps: [
        "Tạo bảng `outbox` riêng cho từng service (`order_outbox`, `inventory_outbox`, `payment_outbox`, `shipping_outbox`) — dùng đúng schema và relay polling đã viết ở SD07 (`transactional-outbox-cdc`), chỉ đổi tên bảng",
        "Viết `saga-orchestrator` (Node/TypeScript) là consumer group riêng, giữ state machine theo `order_id`: `CREATED → INVENTORY_RESERVED → PAYMENT_CHARGED → SHIPPED`, mỗi bước publish command tương ứng (`ReserveInventory`, `ChargePayment`, `ShipOrder`) vào topic `order-saga-commands`",
        "Chạy 20 đơn hàng bình thường qua saga, quan sát `rpk topic consume order-saga-events -n 40` thấy đủ 4 sự kiện mỗi đơn theo đúng thứ tự",
        "Set `PAYMENT_FAIL_SKU=sku-42` để service Payment cố tình trả lỗi khi charge; chạy 1 đơn với sku đó và xác nhận orchestrator publish `ReleaseInventory` (compensation) thay vì `ShipOrder`",
        "Kiểm tra trạng thái cuối trong Postgres: `SELECT status FROM orders WHERE id = '<id>'` phải là `COMPENSATED`, và `SELECT reserved_qty FROM inventory WHERE sku = 'sku-42'` phải quay lại số ban đầu — không có hàng bị giữ 'treo'",
      ],
    },
    {
      id: "api-gateway-idempotent-routing",
      title: "API gateway: routing 2 service + idempotency key cho POST /orders",
      description: "Cấu hình Nginx làm API gateway route tới 2 upstream service, thêm health check chủ động và bắt buộc idempotency key cho endpoint tạo đơn.",
      steps: [
        "Chạy thêm 1 instance app thứ hai đóng vai `inventory-service` (`docker compose up -d --scale app=2`) và cấu hình `nginx.conf` với 2 upstream block: `order_service` (path `/orders`) và `inventory_service` (path `/inventory`)",
        "Thêm `proxy_next_upstream` + `max_fails=2 fail_timeout=5s` cho upstream `inventory_service`, `docker compose stop` một instance rồi bắn 20 request `curl localhost:8080/inventory/sku-1` — xác nhận Nginx tự loại instance chết ra khỏi vòng quay sau vài lỗi",
        "Thêm middleware ở `order-service` bắt buộc header `Idempotency-Key` cho `POST /orders`; lưu `(idempotency_key, response_body)` vào bảng `idempotency_keys` với unique constraint trên key",
        "Gửi cùng 1 request `POST /orders` với cùng `Idempotency-Key` 3 lần liên tiếp (`curl -H 'Idempotency-Key: abc-123' ...`) — xác nhận chỉ tạo 1 đơn trong `orders`, 2 lần sau trả lại đúng response đã lưu",
        "Gửi request khác payload nhưng CÙNG idempotency key — quyết định và code hoá cách xử lý (trả lỗi 409 vì payload không khớp key đã dùng) rồi ghi vào design doc",
      ],
    },
    {
      id: "offset-vs-cursor-pagination-lab",
      title: "Đổi pagination từ offset sang cursor, đo latency ở trang sâu",
      description: "Seed 5 triệu dòng vào bảng orders, đo p95 của offset pagination ở trang 1 và trang 10.000, rồi chuyển sang cursor pagination và đo lại.",
      steps: [
        "Seed dữ liệu: `docker compose exec postgres psql -U app -d app -c \"INSERT INTO orders (user_id, total, created_at) SELECT 'user-' || (g % 50000), (g % 500000), now() - (g || ' seconds')::interval FROM generate_series(1, 5000000) g;\"`",
        "Đo offset trang 1: `EXPLAIN ANALYZE SELECT * FROM orders ORDER BY id OFFSET 0 LIMIT 20;` rồi trang sâu: `EXPLAIN ANALYZE SELECT * FROM orders ORDER BY id OFFSET 4999980 LIMIT 20;` — ghi lại `Execution Time` của cả hai",
        "Sửa endpoint `GET /orders?cursor=<last_id>&limit=20` dùng keyset pagination: `SELECT * FROM orders WHERE id > $1 ORDER BY id LIMIT 20`, đảm bảo có index trên `id` (mặc định PK đã có)",
        "Chạy `k6 run` bắn 50 request liên tiếp mô phỏng lật hết 10.000 trang bằng offset, rồi lặp lại bằng cursor (giữ `last_id` từ response trước) — so sánh p95 latency ở trang cuối cùng giữa hai kịch bản trong báo cáo k6",
        "Viết vào design doc: vì sao `OFFSET n` vẫn phải quét/bỏ qua n dòng dù `LIMIT` nhỏ, còn cursor luôn quét cỡ đúng `limit` dòng nhờ index — và đánh đổi của cursor (không nhảy thẳng tới 'trang 500', chỉ đi tiếp/lùi)",
      ],
    },
  ],
  deliverable:
    "Design doc (Phụ lục A) tách app đặt hàng monolith thành service với bảng data ownership, saga orchestration chạy được trên sd-playground (outbox + Redpanda từ SD07) có compensation khi trừ tiền lỗi, API gateway Nginx route 2 service với idempotent POST /orders, và endpoint list orders đã chuyển sang cursor pagination kèm số đo latency offset vs cursor ở trang sâu.",
  successCriteria:
    "Nêu được ≥3 lý do cụ thể KHÔNG nên tách microservices cho hệ thống đang xét; saga để lại dữ liệu nhất quán (không hàng bị giữ treo, không tiền bị trừ mà không giao hàng) khi bất kỳ bước nào lỗi; giải thích được vì sao OFFSET pagination chậm dần ở trang sâu còn cursor thì không.",
  resources: [
    { title: "microservices.io (Chris Richardson) — pattern catalog", url: "https://microservices.io/", kind: "doc" },
    { title: "microservices.io — Pattern: Saga", url: "https://microservices.io/patterns/data/saga.html", kind: "doc" },
    { title: "Martin Fowler — MonolithFirst", url: "https://martinfowler.com/bliki/MonolithFirst.html", kind: "doc" },
    { title: "Martin Fowler — MicroservicesPrerequisites", url: "https://martinfowler.com/bliki/MicroservicesPrerequisites.html", kind: "doc" },
    { title: "Martin Fowler & James Lewis — Microservices (bài gốc)", url: "https://martinfowler.com/articles/microservices.html", kind: "doc" },
    { title: "Google API Improvement Proposals (AIP) — API design tại Google", url: "https://google.aip.dev/", kind: "doc" },
    { title: "Google Cloud — API Design Guide", url: "https://cloud.google.com/apis/design", kind: "doc" },
    { title: "Sam Newman — Building Microservices, 2nd Edition (O'Reilly)", url: "https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/", kind: "book" },
  ],
  quiz: [
    {
      id: "when-not-to-microservices",
      question:
        "Team 4 người đang vận hành một app thương mại điện tử nhỏ, monolith Postgres duy nhất, deploy 2 lần/tuần, chưa gặp vấn đề scale. Một kỹ sư đề xuất tách ngay thành 8 microservices để 'sẵn sàng cho tương lai'. Nhận định nào đúng nhất?",
      options: [
        "Nên làm ngay — microservices luôn tốt hơn về lâu dài",
        "Chưa nên: team nhỏ sẽ gánh thêm network call, distributed tracing, 8 pipeline CI/CD và on-call phức tạp hơn mà chưa đổi lại được gì (chưa có nhu cầu scale/độc lập deploy thật)",
        "Chỉ nên tách nếu dùng Kubernetes",
        "Nên tách nhưng chỉ thành 2 service cho dễ",
      ],
      answerIndex: 1,
      explanation:
        "Mở khu ẩm thực 8 quầy cho quán chỉ có 4 nhân viên và chưa đông khách: chi phí quản lý (dọn dẹp, kiểm kê từng quầy) tăng vọt mà lượng khách chưa cần tốc độ 8 quầy song song. Chi phí vận hành thật của microservices (network, tracing, nhiều pipeline) chỉ đáng trả khi có lý do cụ thể — độc lập scale, độc lập deploy theo team, khác yêu cầu reliability.",
    },
    {
      id: "service-boundary-by-domain",
      question:
        "Một team định tách monolith theo layer kỹ thuật: service 'Controllers', service 'Business Logic', service 'Database Access'. Vấn đề chính của cách chia này là gì?",
      options: [
        "Không có vấn đề, đây là cách chia chuẩn",
        "Ba service này luôn phải gọi nhau theo chuỗi cho MỌI tính năng (đặt hàng, huỷ đơn…) — coupling còn chặt hơn monolith vì giờ là network call, không phải cách chia theo bounded context",
        "Chia theo layer thì không cần database riêng",
        "Chia theo layer giúp scale tốt hơn chia theo domain",
      ],
      answerIndex: 1,
      explanation:
        "Như chia khu ẩm thực thành 'quầy thớt', 'quầy nồi', 'quầy bát' — mọi món ăn đều phải đi qua cả 3 quầy theo đúng thứ tự, chậm hơn và dễ vỡ hơn 1 bếp chung. Ranh giới đúng là theo domain (Order, Inventory, Payment) — bounded context, để mỗi service tự chứa đủ logic cho một nghiệp vụ trọn vẹn.",
    },
    {
      id: "database-per-service-join",
      question:
        "Sau khi tách Order service và Inventory service với 2 database Postgres riêng, một dev muốn viết `SELECT * FROM orders o JOIN inventory i ON o.sku = i.sku` để lấy báo cáo nhanh. Cách làm đúng là gì?",
      options: [
        "Vẫn JOIN được vì cả hai đều là Postgres",
        "Không JOIN chéo database được nữa — Order service gọi API của Inventory service (hoặc đọc bản sao dữ liệu inventory đã được đồng bộ/cache về phía Order) để lấy thông tin cần thiết",
        "Gộp lại thành 1 database duy nhất cho tiện báo cáo",
        "Dùng chung 1 connection pool cho cả hai service",
      ],
      answerIndex: 1,
      explanation:
        "Hai tủ nguyên liệu ở hai quầy khác nhau — không ai thò tay qua tủ quầy bên cạnh lấy đồ. Database-per-service đổi lấy: gọi API (đồng bộ, chịu thêm latency/lỗi mạng) hoặc giữ bản sao cục bộ đã đồng bộ qua event (bất đồng bộ, có độ trễ). Gộp lại 1 DB xoá luôn lợi ích ranh giới rõ ràng mà bạn vừa tách ra.",
    },
    {
      id: "api-gateway-vs-service-mesh",
      question:
        "Hệ thống có 5 service, traffic chủ yếu là request từ client bên ngoài đi vào (north-south), chưa có nhiều gọi nội bộ phức tạp giữa các service. Nên đầu tư vào cái gì trước?",
      options: [
        "Service mesh (Istio/Linkerd) với sidecar proxy cho mọi service",
        "API gateway ở edge lo routing, auth, rate limit cho traffic vào — service mesh chỉ đáng chi phí vận hành thêm khi traffic nội bộ (service-to-service) phức tạp và cần mTLS/observability đồng loạt",
        "Không cần gateway, để client gọi thẳng từng service",
        "Cả hai cùng lúc ngay từ đầu để 'chuẩn production'",
      ],
      answerIndex: 1,
      explanation:
        "Chưa cần thuê thêm đội bảo vệ tuần tra giữa các quầy (service mesh) khi vấn đề chính chỉ là dẫn khách từ cổng vào đúng quầy (traffic vào). Service mesh thêm một sidecar proxy cho mỗi service — chi phí vận hành thật, chỉ đáng trả khi traffic đông giữa nhiều service với nhu cầu mTLS/retry/observability đồng nhất.",
    },
    {
      id: "service-discovery-purpose",
      question: "Trong Kubernetes, Order service gọi Inventory service qua DNS name `inventory-service.default.svc.cluster.local` thay vì hard-code IP một pod cụ thể. Đây là ví dụ của cơ chế nào và vì sao cần?",
      options: [
        "Load balancing — không liên quan tới service discovery",
        "Service discovery: pod IP đổi liên tục khi restart/scale, nên cần một lớp tra cứu 'tên service → địa chỉ instance đang khoẻ' thay vì hard-code",
        "API versioning",
        "Idempotent request",
      ],
      answerIndex: 1,
      explanation:
        "Bảng thông báo 'quầy phở hôm nay ở vị trí nào' — vị trí (IP pod) đổi mỗi khi quầy dọn dẹp lại (restart/scale), khách (service gọi) chỉ cần nhớ tên quầy và tra bảng lúc cần. Đây chính là service discovery; Kubernetes làm việc này qua DNS + kube-proxy, không cần code riêng.",
    },
    {
      id: "saga-choreography-vs-orchestration",
      question:
        "Luồng đặt hàng gồm 4 bước (Order, Inventory, Payment, Shipping). Team muốn dễ nhìn thấy toàn bộ trạng thái một đơn đang ở bước nào và dễ thêm bước mới sau này, chấp nhận có một điểm điều phối trung tâm. Nên chọn kiểu saga nào?",
      options: [
        "Choreography — mỗi service tự nghe event và quyết định làm gì tiếp theo",
        "Orchestration — một saga orchestrator giữ state machine, ra lệnh từng bước và biết chính xác đơn đang ở đâu, dễ thêm bước mới mà không sửa logic các service khác",
        "Không cần saga, dùng transaction 2PC cho cả 4 service",
        "Không cần cả hai, cứ gọi tuần tự đồng bộ",
      ],
      answerIndex: 1,
      explanation:
        "Có 'quản lý tầng' cầm sổ theo dõi combo của từng bàn (orchestrator) thì nhìn vào sổ là biết ngay bàn nào tới món nào — đổi thực đơn (thêm bước) chỉ cần sửa sổ, không cần báo lại từng quầy. Choreography (mỗi quầy tự nghe loa) linh hoạt hơn về decoupling nhưng khó nhìn thấy toàn cảnh và khó thêm bước mà không rà lại logic nhiều quầy.",
    },
    {
      id: "saga-compensation-order",
      question:
        "Saga orchestration: Inventory đã giữ hàng (RESERVED), Payment charge thất bại. Thứ tự hành động đúng của orchestrator là gì?",
      options: [
        "Bỏ qua, coi như đơn thành công vì hàng đã giữ",
        "Gọi compensating transaction 'ReleaseInventory' để trả lại hàng đã giữ, đánh dấu đơn COMPENSATED/FAILED — không tiếp tục sang Shipping",
        "Thử lại Payment vô hạn lần cho tới khi thành công",
        "Xoá luôn đơn hàng khỏi database để 'dọn sạch'",
      ],
      answerIndex: 1,
      explanation:
        "Combo lỡ hết chè giữa chừng: phải hoàn lại phần nguyên liệu phở/nước ép đã trừ trước đó (compensating transaction) chứ không thể 'rollback' cả hệ thống như một transaction DB. Saga không có isolation của ACID — mỗi bước là một transaction cục bộ đã commit, lỗi ở bước sau phải sửa bằng hành động bù trừ ở bước trước, không phải xoá dữ liệu.",
    },
    {
      id: "idempotent-post-retry",
      question:
        "Client gọi `POST /orders` nhưng mạng timeout ngay khi response đang trên đường về (server đã tạo đơn thành công). Client retry y hệt request đó. Thiết kế nào tránh tạo đơn trùng?",
      options: [
        "Server tự động phát hiện request giống hệt nhau trong 1 giây và bỏ qua",
        "Client gửi kèm header `Idempotency-Key` duy nhất cho lần đặt hàng đó; server lưu key + response đã trả, request lặp lại với cùng key trả lại đúng response cũ thay vì tạo đơn mới",
        "Đổi POST thành GET để idempotent tự nhiên",
        "Không cần xử lý vì HTTP POST vốn đã idempotent",
      ],
      answerIndex: 1,
      explanation:
        "Phiếu order có mã số riêng: dù đưa phiếu số 42 xuống bếp hai lần (do chạy bàn ngã giữa đường rồi thử lại), bếp thấy mã 42 đã nấu thì trả lại đúng món cũ, không nấu thêm lần hai. POST vốn KHÔNG idempotent theo chuẩn HTTP — phải tự thêm idempotency key nếu muốn retry an toàn.",
    },
    {
      id: "offset-pagination-deep-page",
      question:
        "Bảng `orders` có 5 triệu dòng. Query `SELECT * FROM orders ORDER BY id OFFSET 4999980 LIMIT 20` chậm hơn hẳn `OFFSET 0 LIMIT 20` dù `LIMIT` bằng nhau. Vì sao?",
      options: [
        "LIMIT 20 ở trang sâu trả về nhiều dữ liệu hơn",
        "`OFFSET n` vẫn phải đọc và bỏ qua n dòng trước khi lấy 20 dòng cần — chi phí quét tăng tuyến tính theo số trang, dù client chỉ thấy 20 dòng",
        "Postgres cache trang 1 nên luôn nhanh hơn trang sau",
        "Do index trên cột id bị hỏng ở dòng thứ 5 triệu",
      ],
      answerIndex: 1,
      explanation:
        "Đếm từ đầu menu tới món thứ 4.999.980 rồi mới lấy 20 món tiếp — càng lật sâu càng phải đếm nhiều. `OFFSET` không 'nhảy thẳng' tới vị trí, engine phải quét qua từng dòng bị bỏ để đếm cho đủ offset trước khi trả LIMIT.",
    },
    {
      id: "cursor-pagination-property",
      question:
        "Sau khi đổi sang cursor pagination (`WHERE id > $lastId ORDER BY id LIMIT 20`, có index trên `id`), thời gian trả lời ở trang đầu và trang thứ 250.000 gần như bằng nhau. Đánh đổi mà cursor pagination phải chấp nhận là gì?",
      options: [
        "Không có đánh đổi nào, cursor tốt hơn offset ở mọi mặt",
        "Không thể nhảy thẳng tới một số trang cụ thể (vd 'trang 500') — chỉ đi tiếp/lùi tuần tự từ cursor hiện tại, và cần cột sắp xếp có index ổn định (không đổi thứ tự giữa các lần đọc)",
        "Cursor pagination chỉ dùng được với NoSQL, không dùng được với Postgres",
        "Cursor pagination không hỗ trợ LIMIT",
      ],
      answerIndex: 1,
      explanation:
        "Cursor giống 'đánh dấu trang đang đọc dở' — lật tiếp từ đó luôn nhanh vì chỉ cần quét đúng 20 dòng kế tiếp nhờ index, nhưng không thể nói 'cho tôi xem thẳng trang 500' vì không biết dấu trang ở đâu nếu chưa lật qua. Nếu UI thật sự cần nhảy số trang tuỳ ý, phải chấp nhận chi phí offset hoặc dùng giải pháp khác (đánh index theo trang trước).",
    },
  ],
};
