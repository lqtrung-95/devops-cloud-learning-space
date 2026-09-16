import type { ModuleDefinition } from "@/content/content-types";

export const sd11ReliabilityPatternsModule: ModuleDefinition = {
  id: "sd11",
  slug: "sd11-reliability-patterns",
  phaseId: "sd-phase-2",
  order: 11,
  weeks: "Tuần 15",
  title: "Reliability patterns",
  emoji: "🧯",
  eli5Summary:
    "Một nhà hàng giờ cao điểm: đừng để bàn nào chờ món vô thời hạn (timeout), đừng để mọi bàn cùng gọi lại bếp một lúc khi bếp vừa hết nghẽn (retry storm), ngừng gửi order cho nhà cung cấp không trả lời (circuit breaker), dùng lò riêng cho từng loại món để một lò hỏng không kéo sập cả bếp (bulkhead), và khi khách quá đông thì chặn khách mới ở cửa thay vì để khách đang ngồi cũng bị đói (load shedding).",
  objectives: [
    "Giải thích vì sao retry theo exponential backoff KHÔNG có jitter có thể tạo ra retry storm đánh sập chính dependency đang hồi phục, và áp dụng đúng công thức full jitter `random(0, min(cap, base*2^attempt))`",
    "Thiết kế circuit breaker với 3 trạng thái closed/open/half-open, chọn ngưỡng failure-rate + volume tối thiểu và `resetTimeout` hợp lý",
    "Phân biệt bulkhead (cô lập resource pool theo dependency) với circuit breaker (ngắt mạch theo tỉ lệ lỗi) — và biết khi nào cần cả hai",
    "So sánh 4 thuật toán rate limiting (token bucket, leaky bucket, fixed window, sliding window) theo khả năng chịu burst và độ phức tạp cài đặt, chọn đúng theo yêu cầu",
    "Thiết kế load shedding từ chối request rẻ (fail fast, trước khi tốn tài nguyên xử lý) khi hệ thống quá tải, thay vì cố xử lý hết rồi mới lỗi chậm",
    "Truy vết một cascading failure qua nhiều service và chỉ ra chính xác nên chặn nó ở đâu (timeout, bulkhead, hay circuit breaker)",
  ],
  lessons: [
    {
      slug: "timeout-retry-jitter",
      title: "Timeout & retry có jitter",
      minutes: 45,
      summary: "Timeout ở mọi call; retry với exponential backoff phải có jitter, nếu không sẽ gây retry storm đánh sập dependency đang hồi phục.",
    },
    {
      slug: "circuit-breaker-bulkhead",
      title: "Circuit breaker & bulkhead",
      minutes: 50,
      summary: "Circuit breaker ngắt mạch khi dependency lỗi liên tục; bulkhead cô lập resource pool để một dependency chậm không kéo sập cả hệ thống.",
    },
    {
      slug: "rate-limiting-algorithms",
      title: "Thuật toán rate limiting",
      minutes: 50,
      summary: "Token bucket, leaky bucket, fixed window, sliding window — mỗi thuật toán xử lý burst khác nhau, đặt ở edge hay ở service cũng khác nhau.",
    },
    {
      slug: "load-shedding-cascading-failure",
      title: "Load shedding & cascading failure",
      minutes: 45,
      summary: "Từ chối request rẻ trước khi hệ thống sập hoàn toàn, và cách chặn một lỗi nhỏ lan thành cascading failure toàn hệ thống.",
    },
  ],
  labs: [
    {
      id: "toxiproxy-timeout-retry-jitter",
      title: "Đo tác hại của việc thiếu timeout, rồi thêm retry có jitter",
      description: "Dùng Toxiproxy thêm độ trễ vào một dependency chậm trong sd-playground, quan sát thread/connection bị giữ khi không có timeout, rồi sửa bằng timeout + retry full jitter.",
      steps: [
        "Tạo proxy trỏ tới dependency giả lập chậm: `docker compose exec toxiproxy toxiproxy-cli create slow-dep --listen 0.0.0.0:8666 --upstream app:3001`, rồi thêm toxic latency: `docker compose exec toxiproxy toxiproxy-cli toxic add slow-dep -t latency -a latency=2000 -a jitter=100`",
        "Trong service `app`, viết endpoint `GET /checkout` gọi `slow-dep` KHÔNG có timeout (dùng `fetch` mặc định); chạy `k6 run --vus 50 --duration 30s checkout-load.js` và dùng `docker stats app` để quan sát connection/event-loop bị giữ tăng dần vì mỗi request chờ nguyên 2s",
        "Thêm timeout 500ms cho call đó (`AbortController` với `setTimeout(() => controller.abort(), 500)`), chạy lại k6 và xác nhận request trả lỗi nhanh thay vì treo — nhưng tỉ lệ lỗi tăng vì dependency thật ra chỉ chậm chứ chưa chết hẳn",
        "Thêm retry tối đa 3 lần với full jitter: `const delay = Math.random() * Math.min(cap, base * 2 ** attempt)`; so sánh log 2 lần chạy — không jitter (tất cả request trong cùng 1 k6 VU-batch retry cùng lúc, thấy spike CPU của `slow-dep`) và có jitter (spike biến mất, tải trải đều)",
      ],
    },
    {
      id: "opossum-circuit-breaker-state-log",
      title: "Cài circuit breaker bằng opossum, vẽ log chuyển trạng thái",
      description: "Bọc lời gọi dependency bằng thư viện `opossum`, ghi log mỗi lần đổi trạng thái, và tự tay làm dependency lỗi rồi hồi phục để thấy đủ 3 trạng thái.",
      steps: [
        "Cài `opossum` trong service `app`: `pnpm add opossum` rồi bọc hàm gọi `slow-dep`: `const breaker = new CircuitBreaker(callSlowDep, { timeout: 1000, errorThresholdPercentage: 50, resetTimeout: 10000 })`",
        "Đăng ký listener log trạng thái: `breaker.on(\"open\", () => log(\"open\"))`, `breaker.on(\"halfOpen\", () => log(\"half-open\"))`, `breaker.on(\"close\", () => log(\"closed\"))`",
        "Làm dependency lỗi 100%: `docker compose exec toxiproxy toxiproxy-cli toxic add slow-dep -t timeout -a timeout=0`, gọi endpoint liên tục bằng `for i in {1..20}; do curl -s localhost:3000/checkout; done` và xem log breaker chuyển `closed → open` sau khi vượt `errorThresholdPercentage`",
        "Gỡ toxic (`docker compose exec toxiproxy toxiproxy-cli toxic remove slow-dep -n timeout_downstream`), đợi hết `resetTimeout` (10s), gọi lại 1 request và xác nhận log hiện `half-open` rồi `closed` vì request thử thành công",
      ],
    },
    {
      id: "redis-token-bucket-k6-429",
      title: "Token bucket bằng Redis Lua script, bắn quá limit bằng k6",
      description: "Viết token bucket atomic bằng Lua script chạy qua `redis-cli --eval`, gắn vào middleware rate limit, rồi dùng k6 kiểm tra tỉ lệ 429 khi vượt limit.",
      steps: [
        "Viết `token-bucket.lua` (< 30 dòng): `KEYS[1]` là key bucket, `ARGV` gồm `capacity`, `refill_rate`, `now`; script đọc `tokens`/`last_refill` hiện tại bằng `redis.call(\"HMGET\", ...)`, tính token mới = `min(capacity, tokens + (now - last_refill) * refill_rate)`, nếu `>= 1` thì trừ 1 token và trả `1` (cho qua), ngược lại trả `0` (từ chối) — toàn bộ chạy atomic trong Redis nên không race condition dù nhiều request cùng lúc",
        "Chạy thử trực tiếp: `docker compose exec redis redis-cli --eval /scripts/token-bucket.lua rate:user:42 , 10 5 $(date +%s)` (capacity 10, refill 5 token/giây) và xác nhận trả `1` cho vài lần gọi liên tiếp rồi `0` khi hết token",
        "Gắn script vào middleware Fastify: mỗi request gọi script qua `ioredis`'s `.eval(...)`, trả `429 Too Many Requests` khi kết quả là `0`",
        "Chạy `k6 run --vus 20 --duration 10s rate-limit-burst.js` bắn vượt xa `refill_rate`, kiểm tra output k6: burst đầu (≤ capacity) qua hết (`200`), phần vượt quá bị `429` đúng theo rate ổn định, không phải chặn cứng ngay từ token đầu tiên",
      ],
    },
    {
      id: "load-shedding-fail-fast-under-overload",
      title: "Load shedding: từ chối rẻ trước khi hệ thống sập hoàn toàn",
      description: "Thêm bộ đếm request đang xử lý (in-flight) và một cổng load-shedding từ chối request mới ngay tại middleware đầu tiên khi vượt ngưỡng, đo hiệu quả bằng k6.",
      steps: [
        "Thêm middleware đầu tiên trong pipeline Fastify: biến đếm `inFlight` tăng khi nhận request, giảm khi trả response; nếu `inFlight > MAX_IN_FLIGHT` (vd 100) thì trả ngay `503 Service Unavailable` KHÔNG chạm tới handler thật (không query Postgres, không gọi dependency nào)",
        "Không thêm load shedding, chạy `k6 run --vus 300 --duration 20s overload.js` nhắm vào 1 endpoint có query Postgres nặng; quan sát p99 latency tăng vọt và cả request 'nhẹ' khác cũng bị chậm theo vì connection pool Postgres cạn kiệt",
        "Bật middleware load shedding, chạy lại đúng kịch bản k6 đó; so sánh: request vượt ngưỡng bị `503` gần như tức thì (chi phí gần bằng 0, không chạm DB), còn request lọt qua vẫn giữ p99 ổn định vì connection pool không bị tràn",
        "Thử một biến thể ưu tiên: gắn header `X-Priority: low` cho traffic không quan trọng (vd prefetch), sửa middleware shed request `low` trước khi shed request thường — xác nhận endpoint quan trọng (checkout) vẫn được phục vụ lâu hơn khi tải tăng dần",
      ],
    },
  ],
  deliverable:
    "Thư mục `sd11/` gồm: kết quả k6 so sánh có/không timeout+jitter (log spike CPU dependency), log chuyển trạng thái circuit breaker `closed→open→half-open→closed`, `token-bucket.lua` cùng kết quả k6 đo tỉ lệ `429`, và kết quả k6 so sánh p99 latency có/không load shedding khi quá tải.",
  successCriteria:
    "Giải thích được vì sao retry không jitter có thể đánh sập chính dependency đang yếu; chỉ ra đúng lúc circuit breaker mở/đóng từ log thật; chọn đúng thuật toán rate limit theo yêu cầu burst; thiết kế được điểm chặn cascading failure cụ thể (timeout, bulkhead hay circuit breaker) cho một tình huống cho trước.",
  resources: [
    {
      title: "AWS Builders' Library — Timeouts, retries, and backoff with jitter",
      url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/",
      kind: "doc",
    },
    {
      title: "Google SRE Book — Handling Overload",
      url: "https://sre.google/sre-book/handling-overload/",
      kind: "book",
    },
    {
      title: "Stripe Engineering Blog — Scaling your API with rate limiters",
      url: "https://stripe.com/blog/rate-limiters",
      kind: "doc",
    },
    {
      title: "opossum — Node.js circuit breaker (docs & API)",
      url: "https://github.com/nodeshift/opossum",
      kind: "tool",
    },
    {
      title: "Martin Fowler — CircuitBreaker",
      url: "https://martinfowler.com/bliki/CircuitBreaker.html",
      kind: "doc",
    },
    {
      title: "Release It! — Design and Deploy Production-Ready Software (Michael Nygard)",
      url: "https://www.oreilly.com/library/view/release-it-2nd/9781680500264/",
      kind: "book",
    },
    {
      title: "Toxiproxy — CLI reference",
      url: "https://github.com/Shopify/toxiproxy",
      kind: "tool",
    },
  ],
  quiz: [
    {
      id: "retry-storm-root-cause",
      question:
        "Dependency vừa hồi phục sau 30 giây down. Ngay lập tức nó sập lại. Log cho thấy hàng nghìn client cùng backoff theo cấp số nhân (khớp giây chẵn: 1s, 2s, 4s...) và cùng retry đúng những giây đó. Nguyên nhân chính là gì?",
      options: [
        "Dependency vốn dĩ yếu, không liên quan tới cách client retry",
        "Retry storm: mọi client backoff đồng bộ nên retry dồn cùng một thời điểm, tổng tải tại đúng giây đó vượt xa capacity — cần thêm jitter để trải đều",
        "Do exponential backoff tăng quá chậm, cần backoff nhanh hơn",
        "Do dùng quá ít lần retry, cần retry nhiều hơn để bù lỗi",
      ],
      answerIndex: 1,
      explanation:
        "Giống mọi bàn trong nhà hàng cùng gọi lại bếp đúng lúc bếp vừa hết nghẽn: dù mỗi bàn tự tính thời điểm gọi lại hợp lý, tất cả cùng lúc thì bếp lại sập tiếp. Full jitter phá vỡ sự đồng bộ đó bằng cách random hoá thời điểm retry.",
    },
    {
      id: "full-jitter-formula",
      question: "Công thức full jitter mà AWS Builders' Library khuyến nghị cho delay của lần retry thứ `attempt` là gì?",
      options: [
        "`delay = base * 2^attempt` (không random)",
        "`delay = base * attempt` (tuyến tính, không random)",
        "`delay = random(0, min(cap, base * 2^attempt))`",
        "`delay = cap` cố định cho mọi lần retry",
      ],
      answerIndex: 2,
      explanation:
        "Full jitter lấy giá trị exponential backoff `min(cap, base*2^attempt)` làm CẬN TRÊN rồi random đều trong khoảng `[0, cận trên]` — giống việc mỗi bàn tự bốc một số ngẫu nhiên trong khung giờ cho phép để gọi lại bếp, thay vì tất cả gọi đúng phút thứ N.",
    },
    {
      id: "timeout-without-circuit-breaker-cost",
      question:
        "Một service gọi dependency chậm với timeout 2s, không có circuit breaker. Dependency bắt đầu treo 100% request trong 10 phút. Điều gì xảy ra với service gọi, dù mỗi request đều timeout đúng 2s?",
      options: [
        "Không vấn đề gì vì mỗi request đều được timeout kịp thời",
        "Vẫn có vấn đề: mỗi request vẫn TỐN 2s giữ thread/connection trước khi timeout — dưới tải cao, connection pool vẫn cạn kiệt dù không request nào 'treo mãi mãi'",
        "Timeout tự động biến thành circuit breaker sau vài lần lỗi liên tiếp",
        "Vấn đề chỉ xảy ra nếu timeout lớn hơn 5s",
      ],
      answerIndex: 1,
      explanation:
        "Timeout giới hạn THỜI GIAN chờ mỗi request, nhưng không ngăn việc LIÊN TỤC gửi request mới tới một dependency đã biết là chết. Circuit breaker mới là cơ chế 'ngừng gọi hẳn' để không tốn resource chờ 2s mỗi lần — như bếp ngừng nhận order từ nhà cung cấp không trả lời thay vì gọi lại rồi chờ hết giờ mỗi lần.",
    },
    {
      id: "circuit-breaker-open-state-behavior",
      question: "Ở trạng thái `open`, circuit breaker xử lý request mới như thế nào?",
      options: [
        "Vẫn gọi dependency nhưng với timeout ngắn hơn",
        "Từ chối ngay lập tức (hoặc trả fallback) mà KHÔNG gọi dependency — cực rẻ, không tốn thread/connection chờ",
        "Chuyển toàn bộ request sang retry vô hạn cho tới khi thành công",
        "Chặn tất cả request tới toàn bộ hệ thống, không chỉ dependency đó",
      ],
      answerIndex: 1,
      explanation:
        "`open` nghĩa là breaker đã 'biết' dependency đang lỗi nên fail fast: trả lỗi/fallback ngay, không tốn công gọi thật. Đây là khác biệt cốt lõi so với chỉ dùng timeout — giống bếp treo bảng 'tạm ngừng nhận order từ nhà cung cấp X' thay vì vẫn gọi rồi đợi máy đổ chuông xong mới biết không ai nghe.",
    },
    {
      id: "half-open-trial-purpose",
      question: "Vì sao circuit breaker ở `half-open` chỉ cho MỘT (hoặc rất ít) request đi qua để thử, thay vì mở lại toàn bộ traffic ngay khi hết `resetTimeout`?",
      options: [
        "Vì thư viện circuit breaker luôn giới hạn cứng 1 request, không có lý do kỹ thuật",
        "Nếu dependency vẫn chưa hồi phục thật sự mà mở lại toàn bộ traffic ngay, một lượng lớn request lỗi sẽ dồn vào nó lần nữa — request thử với số lượng nhỏ giúp dò an toàn trước khi cam kết mở hẳn",
        "Để tiết kiệm chi phí gọi API trả phí",
        "Vì `half-open` chỉ tồn tại trên lý thuyết, thực tế không thư viện nào cài đặt state này",
      ],
      answerIndex: 1,
      explanation:
        "Giống bếp thử gọi lại nhà cung cấp bằng MỘT đơn hàng nhỏ trước khi đẩy cả trăm đơn hàng dồn dập — nếu nhà cung cấp vẫn chưa ổn, chỉ mất 1 đơn thử thay vì lặp lại toàn bộ sự cố ban đầu.",
    },
    {
      id: "bulkhead-vs-circuit-breaker",
      question:
        "Service `checkout` gọi cả `payment` và `recommendation` qua CÙNG một connection pool dùng chung. `recommendation` bắt đầu chậm (chưa đủ lỗi để circuit breaker trip). Điều gì bảo vệ `payment` khỏi bị ảnh hưởng?",
      options: [
        "Circuit breaker cho `recommendation`, vì nó sẽ tự động bảo vệ luôn cả `payment`",
        "Không có gì bảo vệ nếu chỉ dùng chung 1 pool — cần BULKHEAD: tách connection/thread pool riêng cho `recommendation` để nó dùng hết pool của chính nó, không đụng tới pool của `payment`",
        "Timeout ngắn hơn cho `recommendation` là đủ, không cần bulkhead",
        "Retry với jitter cho `recommendation` sẽ giải quyết được vấn đề này",
      ],
      answerIndex: 1,
      explanation:
        "Circuit breaker phản ứng theo TỈ LỆ LỖI của một dependency cụ thể — nó không ngăn việc pool dùng chung bị chiếm hết bởi các call đang chậm (chưa hẳn là lỗi). Bulkhead giải quyết đúng vấn đề cô lập tài nguyên: giống lò nướng cá riêng và lò nướng thịt riêng, lò cá cháy không ảnh hưởng lò thịt.",
    },
    {
      id: "token-bucket-vs-leaky-bucket-burst",
      question: "Một API cho phép user thỉnh thoảng gửi burst 20 request liền (vd đồng bộ dữ liệu sau khi mất mạng), miễn tổng thể vẫn ≤ 5 req/giây trung bình. Thuật toán nào PHÙ HỢP hơn?",
      options: [
        "Leaky bucket, vì nó luôn xử lý theo rate cố định nên mượt hơn",
        "Token bucket, vì nó tích luỹ token khi rảnh (lên tới burst capacity) và cho phép xài hết một lúc, đúng nhu cầu cho phép burst hợp lệ",
        "Fixed window, vì đơn giản cài đặt nhất",
        "Cả 4 thuật toán đều xử lý burst giống hệt nhau",
      ],
      answerIndex: 1,
      explanation:
        "Token bucket tích token theo thời gian (tới trần = burst capacity) và cho phép tiêu hết một lượt — đúng kiểu 'tích luỹ vé rồi dùng dồn' user cần ở đây. Leaky bucket thì ép mọi thứ ra đều đặn theo hàng đợi, sẽ delay burst hợp lệ giống hệt burst xấu.",
    },
    {
      id: "fixed-window-edge-burst",
      question:
        "Rate limit fixed window: 100 req/phút, tính theo mốc đồng hồ (0:00-1:00, 1:00-2:00...). Client gửi 100 request lúc 0:59 và thêm 100 request lúc 1:01. Điều gì xảy ra?",
      options: [
        "Bị chặn ngay vì tổng 200 request vượt limit 100/phút",
        "Cả 200 request đều được chấp nhận vì mỗi request rơi vào một window riêng (window trước và window sau) dù chỉ cách nhau 2 giây — đây chính là 'edge burst' của fixed window",
        "Fixed window sẽ tự động gộp 2 window lại để tính chung",
        "Chỉ 100 request đầu được chấp nhận, 100 request sau bị từ chối do window trước chưa đóng",
      ],
      answerIndex: 1,
      explanation:
        "Fixed window chỉ đếm trong MỐC đồng hồ cố định, không quan tâm khoảng cách thời gian thực. 200 request trong 2 giây (thực chất là burst rất mạnh) vẫn lọt qua vì rơi đúng ranh giới 2 window — đây là lỗ hổng kinh điển mà sliding window được thiết kế để vá.",
    },
    {
      id: "load-shedding-fail-cheap",
      question: "Nguyên tắc cốt lõi của load shedding đúng cách là gì?",
      options: [
        "Xử lý mọi request bình thường cho tới khi hệ thống hết tài nguyên rồi mới trả lỗi timeout",
        "Từ chối request VƯỢT NGƯỠNG một cách RẺ và SỚM (fail fast) — trước khi tốn tài nguyên xử lý (query DB, gọi dependency) — để phần request còn lại vẫn được phục vụ tốt",
        "Luôn từ chối 50% request bất kể tải hiện tại là bao nhiêu",
        "Chuyển toàn bộ request bị shed sang một retry queue để xử lý sau",
      ],
      answerIndex: 1,
      explanation:
        "Giống người gác cửa chặn khách mới NGAY TẠI CỬA khi nhà hàng đã kín bàn — rẻ, tức thì, không tốn công bưng nước rồi mới báo hết bàn. Nếu để request đi sâu vào hệ thống rồi mới lỗi (do hết connection, hết CPU), chi phí xử lý dở dang đã lãng phí và làm chậm luôn cả request đang được phục vụ tốt.",
    },
    {
      id: "cascading-failure-break-point",
      question:
        "`service-a` gọi `service-b` gọi `service-c`. `service-c` bắt đầu treo 100% request không timeout. `service-b` dùng chung 1 thread pool cho mọi loại call và không có circuit breaker. Kết quả điển hình là gì, và nên chặn ở đâu?",
      options: [
        "Chỉ `service-c` bị ảnh hưởng, `service-a` và `service-b` vẫn khoẻ mạnh bình thường",
        "`service-b` cạn thread pool vì mọi thread đều treo chờ `service-c` → `service-b` cũng ngừng phục vụ được `service-a`, dù `service-b` tự nó không có lỗi gì — cascading failure lan từ `c` lên `b` lên `a`; cần chặn bằng timeout ở `b→c`, bulkhead tách pool cho call tới `c`, và circuit breaker ngắt khi `c` lỗi liên tục",
        "Cascading failure chỉ xảy ra nếu cả 3 service dùng chung 1 database",
        "Vấn đề tự hết khi `service-c` restart, không cần thêm cơ chế gì ở `service-b`",
      ],
      answerIndex: 1,
      explanation:
        "Đây đúng là domino: thiếu timeout khiến thread treo vô hạn, thiếu bulkhead khiến pool dùng chung cạn kiệt, thiếu circuit breaker khiến `b` vẫn tiếp tục gọi `c` dù đã biết lỗi. Ba lớp phòng thủ (timeout + bulkhead + circuit breaker) cộng lại mới chặn được domino lan từ `c` ngược lên `a`.",
    },
  ],
};
