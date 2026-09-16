import type { ModuleDefinition } from "@/content/content-types";

export const sd09ConsistencyReplicationModule: ModuleDefinition = {
  id: "sd09",
  slug: "sd09-consistency-replication",
  phaseId: "sd-phase-2",
  order: 9,
  weeks: "Tuần 12",
  title: "Consistency, CAP & replication nâng cao",
  emoji: "⚖️",
  eli5Summary:
    "Hai chi nhánh bưu điện nối nhau bằng đường dây điện thoại để đồng bộ sổ sách. Khi đường dây đứt, mỗi chi nhánh phải chọn: đóng cửa chờ nối lại dây (đúng sổ nhưng ngừng phục vụ) hay cứ phục vụ theo sổ cũ của mình (phục vụ tiếp nhưng có thể sai lệch). Module này dạy bạn chọn đúng, và chọn đúng cả khi dây không đứt nhưng đồng bộ chậm.",
  objectives: [
    "Giải thích đúng CAP: `C` là linearizability, và CAP chỉ bắt bạn chọn `C` hay `A` khi có network partition — không có khái niệm 'hệ thống CA' cho một hệ phân tán nhiều node",
    "Dùng PACELC để nói về trade-off latency vs consistency ngay cả lúc mạng bình thường (nhánh `else`)",
    "Phân biệt 5 mức consistency (linearizable, sequential, causal, read-your-writes, eventual) và chọn đúng mức theo tính năng nghiệp vụ",
    "Tính quorum `W + R > N` cho leaderless replication, và giải thích vì sao sloppy quorum/hinted handoff phá vỡ đảm bảo overlap đó",
    "So sánh last-write-wins, version vector và CRDT khi hai replica ghi đồng thời lúc mất kết nối, chỉ ra cái giá của mỗi cách",
    "Với một danh sách tính năng (giỏ hàng, số dư ví, like count, tồn kho), gán đúng mức consistency và bảo vệ được lựa chọn đó",
  ],
  lessons: [
    {
      slug: "cap-and-pacelc",
      title: "CAP & PACELC nói cho đúng",
      minutes: 45,
      summary: "CAP chỉ áp dụng khi có network partition; PACELC thêm nhánh latency-vs-consistency cho lúc mạng bình thường.",
    },
    {
      slug: "consistency-models",
      title: "Các mức consistency: từ linearizable tới eventual",
      minutes: 50,
      summary: "Năm mức đảm bảo — mức nào cấm điều gì, và ví dụ cụ thể ai thấy gì khi nào.",
    },
    {
      slug: "quorum-leaderless-replication",
      title: "Quorum & leaderless replication",
      minutes: 50,
      summary: "`W + R > N` đảm bảo tập đọc/ghi giao nhau — cho tới khi sloppy quorum và hinted handoff phá vỡ nó.",
    },
    {
      slug: "conflict-resolution",
      title: "Xử lý conflict: last-write-wins, version vector, CRDT",
      minutes: 45,
      summary: "Ba cách hoà giải hai ghi đồng thời — cách nào lặng lẽ mất dữ liệu, cách nào bắt bạn tự xử lý, cách nào tự hội tụ.",
    },
  ],
  labs: [
    {
      id: "quorum-sim-stale-read",
      title: "Viết quorum simulator, đo tỉ lệ stale read",
      description: "Tự viết mô phỏng N replica bằng TypeScript, chỉnh W/R và bật sloppy quorum để thấy khi nào đảm bảo `W + R > N` còn đúng.",
      steps: [
        "Tạo `sd09/quorum-sim.ts` (< 60 dòng): mảng `N` replica trong bộ nhớ, mỗi replica có `{ value, timestamp }`; hàm `write(value)` ghi vào `W` replica chọn ngẫu nhiên (mỗi lần ghi có độ trễ giả lập `setTimeout` ngẫu nhiên 0–50ms); hàm `read()` đọc `R` replica ngẫu nhiên và trả giá trị có `timestamp` lớn nhất",
        "Chạy `npx tsx quorum-sim.ts --n 3 --w 1 --r 1 --iterations 2000` (mỗi iteration: ghi giá trị mới rồi đọc ngay) và ghi lại % lần đọc trả về giá trị **không phải** giá trị vừa ghi (stale read)",
        "Chạy lại với `npx tsx quorum-sim.ts --n 3 --w 2 --r 2 --iterations 2000` (`W + R = 4 > N = 3`) — tỉ lệ stale read phải về ~0%",
        "Thêm cờ `--sloppy`: khi 1 replica được chọn ghi đang 'down' (giả lập ngẫu nhiên 20% mỗi lần ghi), ghi tạm vào một replica khác ngoài quorum ban đầu (hinted handoff) nhưng vẫn tính là đủ `W`; chạy `npx tsx quorum-sim.ts --n 3 --w 2 --r 2 --sloppy --iterations 2000` và cho thấy stale read quay lại dù `W + R > N`",
      ],
    },
    {
      id: "toxiproxy-partition-cp-vs-ap",
      title: "Cắt mạng thật bằng Toxiproxy: chọn CP hay AP",
      description: "Dựng proxy giữa app và replica trong sd-playground, cắt kết nối và quan sát hai chế độ xử lý: từ chối (CP) hay trả dữ liệu cũ (AP).",
      steps: [
        "Thêm service `toxiproxy` vào `docker-compose.yml` của sd-playground: `image: ghcr.io/shopify/toxiproxy`, `ports: [\"8474:8474\"]` (API), rồi `docker compose up -d toxiproxy`",
        "Tạo proxy trỏ tới `postgres-replica`: `docker compose exec toxiproxy toxiproxy-cli create replica-proxy --listen 0.0.0.0:5433 --upstream postgres-replica:5432`, rồi trỏ biến môi trường `REPLICA_URL` của service `app` sang `toxiproxy:5433` thay vì thẳng tới replica",
        "Thêm hai endpoint trong `app`: `GET /profile/:id?mode=cp` đọc từ replica, timeout 1s, lỗi thì trả `503 Service Unavailable`; `GET /profile/:id?mode=ap` cùng logic nhưng khi lỗi thì trả bản cache gần nhất kèm header `X-Stale: true`",
        "Mô phỏng partition: `docker compose exec toxiproxy toxiproxy-cli toggle replica-proxy` (disable) rồi gọi `curl -i localhost:3000/profile/1?mode=cp` (nhận `503`) và `curl -i localhost:3000/profile/1?mode=ap` (nhận `200` kèm `X-Stale: true`)",
        "Bật lại proxy (`docker compose exec toxiproxy toxiproxy-cli toggle replica-proxy`), rồi thêm toxic latency để minh hoạ nhánh PACELC khi **không** có partition: `docker compose exec toxiproxy toxiproxy-cli toxic add replica-proxy -t latency -a latency=2000 -a jitter=200`; so sánh `mode=cp` (chờ đủ 2s mới trả) với `mode=ap` (trả ngay từ cache, có thể chưa cập nhật)",
      ],
    },
    {
      id: "consistency-per-feature-table",
      title: "Chọn đúng mức consistency cho 4 tính năng",
      description: "Đo thực tế 3 tính năng tiêu biểu rồi điền bảng: giỏ hàng, số dư ví, like count, tồn kho — mỗi cái cần mức consistency nào.",
      steps: [
        "Số dư ví: tạo bảng `wallets(user_id int primary key, balance_cents int not null check (balance_cents >= 0))` trong Postgres của playground, viết transaction trừ tiền dùng `SELECT … FOR UPDATE` — chạy `docker compose exec postgres psql -U app -d app` và xác nhận không thể trừ âm dù chạy song song (đây là linearizable trong phạm vi 1 tài khoản)",
        "Like count: mở 3 terminal, mỗi terminal chạy `for i in {1..1000}; do docker compose exec redis redis-cli INCR like:post:42 > /dev/null; done`, sau đó `docker compose exec redis redis-cli GET like:post:42` phải đúng 3000 dù không ai chờ ai — vì `INCR` là phép cộng giao hoán (commutative), hội tụ đúng mà không cần linearizable",
        "Giỏ hàng: thêm route đọc sau ghi bám cùng 1 replica trong 5 giây bằng cookie `sticky-replica=<id>`; test bằng `curl -c cookies.txt -X POST localhost:8080/cart/1/items -d '{\"sku\":\"A1\"}'` rồi `curl -b cookies.txt localhost:8080/cart/1` — phải luôn thấy item vừa thêm (read-your-writes), dù có 3 instance sau Nginx",
        "Điền bảng cuối vào design doc (Phụ lục A, mục 7): giỏ hàng → read-your-writes; số dư ví → linearizable trong phạm vi 1 tài khoản; like count → eventual (bộ đếm commutative); tồn kho hiển thị → eventual, nhưng bước trừ kho lúc thanh toán → atomic conditional update (linearizable)",
      ],
    },
    {
      id: "conflict-demo-lww-vector-crdt",
      title: "Demo conflict: LWW mất dữ liệu, version vector phát hiện, CRDT tự hội tụ",
      description: "Viết script mô phỏng 2 replica offline cùng sửa dữ liệu, so 3 chiến lược hoà giải xung đột trên cùng một kịch bản.",
      steps: [
        "Tạo `sd09/conflict-demo.ts`: 2 replica offline `A` và `B` giữ cùng 1 user record `{ email, tags: Set<string> }`; `A` đổi `email` lúc `t=10`, `B` đổi `email` khác lúc `t=12` nhưng đồng hồ của `B` lệch trước 5 giây (nên trông như `t=7`)",
        "Chạy `npx tsx conflict-demo.ts --strategy lww` — script hợp nhất theo timestamp: vì đồng hồ lệch, giá trị của `A` (thật ra ghi sau) bị ghi đè bởi giá trị của `B` (thật ra ghi trước) — in cảnh báo mất update do clock skew",
        "Chạy `npx tsx conflict-demo.ts --strategy version-vector` — mỗi replica giữ vector `{A: n, B: m}`; khi merge, script phát hiện hai vector không so sánh được (concurrent) và in ra **cả hai** giá trị `email` để tầng ứng dụng tự quyết định, không âm thầm chọn một bên",
        "Chạy `npx tsx conflict-demo.ts --strategy crdt-set` cho trường `tags`: `A` thêm `\"vip\"`, `B` xoá `\"new\"` cùng lúc offline; merge bằng OR-Set (mỗi lần add gắn unique tag, remove chỉ xoá add đã thấy) — kết quả có `\"vip\"` và không có `\"new\"`, không cần trọng tài, không mất add nào",
      ],
    },
  ],
  deliverable:
    "Thư mục `sd09/` gồm: `quorum-sim.ts` và kết quả đo % stale read theo N/W/R (có/không sloppy quorum), transcript demo Toxiproxy cắt mạng cho cả 2 chế độ CP/AP, bảng chọn consistency cho 4 tính năng, và `conflict-demo.ts` cùng kết quả 3 chiến lược hoà giải conflict.",
  successCriteria:
    "Giải thích đúng CAP (không nói 'hệ thống chọn CA'); tính được quorum có giao nhau hay không từ N/W/R; với một tính năng bất kỳ, chọn được mức consistency và nêu lý do bằng ví dụ cụ thể, không chỉ bằng tên gọi.",
  resources: [
    { title: "Jepsen — Consistency Models", url: "https://jepsen.io/consistency", kind: "doc" },
    { title: "Martin Kleppmann — Please stop calling databases CP or AP", url: "https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html", kind: "doc" },
    { title: "Designing Data-Intensive Applications (Kleppmann) — ch.5, 9", url: "https://dataintensive.net/", kind: "book" },
    { title: "Dynamo: Amazon's Highly Available Key-value Store (paper)", url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf", kind: "doc" },
    { title: "Apache Cassandra docs — Consistency", url: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html#tunable-consistency", kind: "doc" },
    { title: "PACELC theorem — tổng quan (Wikipedia)", url: "https://en.wikipedia.org/wiki/PACELC_theorem", kind: "doc" },
    { title: "Shopify Engineering — CRDTs: The Hard Parts (video, Martin Kleppmann)", url: "https://www.youtube.com/watch?v=x7drE24geUw", kind: "video" },
    { title: "Toxiproxy — CLI reference", url: "https://github.com/Shopify/toxiproxy", kind: "tool" },
  ],
  quiz: [
    {
      id: "cap-partition-choice",
      question:
        "Dịch vụ tồn kho chạy ở 2 region, replicate hai chiều. Đường truyền liên vùng rớt 30 giây. Trong lúc đó, region B nhận request trừ tồn kho. Theo CAP, region B có đúng hai lựa chọn nào?",
      options: [
        "Chọn 'CA': vẫn phục vụ bình thường và vẫn đảm bảo dữ liệu đúng tuyệt đối",
        "Từ chối request (ưu tiên Consistency) hoặc cứ xử lý theo dữ liệu cục bộ có thể lệch với A (ưu tiên Availability)",
        "Luôn phải chọn Availability vì availability quan trọng hơn consistency",
        "Chuyển toàn bộ traffic sang region A cho tới khi hết chưa xác định",
      ],
      answerIndex: 1,
      explanation:
        "Giống chi nhánh bưu điện mất đường dây: chỉ còn 2 lựa chọn thật — đóng cửa chờ nối lại (C) hay tiếp tục theo sổ cục bộ, chấp nhận sai lệch (A). 'CA' không phải một lựa chọn khi mạng đang đứt giữa các node.",
    },
    {
      id: "cap-c-meaning",
      question: "Trong CAP, chữ `C` (Consistency) nói chính xác đến điều gì?",
      options: [
        "Eventual consistency — cuối cùng mọi bản sao sẽ giống nhau",
        "ACID consistency — ràng buộc dữ liệu (constraint) luôn đúng",
        "Linearizability — sau khi một write được xác nhận, mọi read sau đó (theo thời gian thực) đều thấy nó, như chỉ có một bản sao duy nhất",
        "Causal consistency — chỉ giữ thứ tự cho các thao tác có quan hệ nhân-quả",
      ],
      answerIndex: 2,
      explanation:
        "CAP's `C` = linearizability: hệ thống hành xử như chỉ có một bản sao duy nhất, cập nhật tức thời với thời gian thực. Đây là lý do CAP hay bị hiểu nhầm — 'consistency' trong ACID hay trong tên gọi 'eventual consistency' là nghĩa khác.",
    },
    {
      id: "no-ca-system",
      question:
        "Một đồng nghiệp đề xuất 'xây hệ thống CA để vừa nhất quán vừa luôn sẵn sàng, không cần chọn CP hay AP'. Nhận xét nào đúng?",
      options: [
        "Được, chỉ cần replicate đồng bộ (synchronous) là có CA",
        "'CA' chỉ có ý nghĩa khi hệ thống chạy trên **một node** (không phân tán); một khi có ≥2 node và network có thể đứt, CAP buộc phải chọn C hay A lúc đó — không có lựa chọn thứ ba",
        "CA khả thi nếu dùng NTP đồng bộ đồng hồ đủ chính xác giữa các node",
        "CA chỉ cần một load balancer đủ thông minh để route request tới node còn sống",
      ],
      answerIndex: 1,
      explanation:
        "Network partition giữa các node phân tán là một khả năng luôn tồn tại (cáp đứt, switch lỗi, packet loss), không phải một tuỳ chọn để tránh. Khi nó xảy ra, CAP buộc chọn C hoặc A cho request tại thời điểm đó — 'CA' chỉ có nghĩa cho một hệ không phân tán.",
    },
    {
      id: "pacelc-else-branch",
      question:
        "Một cluster database 3 node đang hoạt động bình thường (không có partition), nhưng để đảm bảo mọi read thấy write mới nhất, mỗi write phải chờ xác nhận (ack) từ cả 3 node trước khi trả về cho client — làm p99 write tăng cao. Đây là ví dụ của nhánh nào trong PACELC?",
      options: [
        "Nhánh `PA` — Partition, chọn Availability",
        "Nhánh `PC` — Partition, chọn Consistency",
        "Nhánh `ELC` — Else (không partition), chọn Consistency, đánh đổi Latency",
        "Đây không thuộc PACELC vì PACELC chỉ áp dụng lúc có partition",
      ],
      answerIndex: 2,
      explanation:
        "PACELC nói: nếu có Partition thì chọn A hay C (như CAP); Else (bình thường) thì vẫn phải chọn giữa Latency và Consistency. Chờ ack từ mọi node để bảo đảm consistency mạnh hơn chính là trả latency thấp hơn để lấy consistency cao hơn — nhánh `else, consistency`.",
    },
    {
      id: "consistency-model-read-your-writes",
      question:
        "User A đăng ảnh đại diện mới trên điện thoại, bấm F5 ngay sau đó trên chính điện thoại đó và vẫn thấy ảnh cũ trong vài giây, dù server báo lưu thành công. Đây là hệ thống đang thiếu đảm bảo nào?",
      options: [
        "Sequential consistency",
        "Read-your-writes",
        "Causal consistency",
        "Eventual consistency (đây là hành vi bình thường của eventual, không phải lỗi)",
      ],
      answerIndex: 1,
      explanation:
        "Read-your-writes chỉ đòi hỏi *chính người vừa ghi* luôn thấy được ghi của mình ở lần đọc sau — không cần đảm bảo mạnh cỡ linearizable cho toàn hệ thống. Thiếu nó khi routing đọc/ghi rớt vào 2 replica khác nhau (vd sau LB round-robin) mà chưa kịp đồng bộ.",
    },
    {
      id: "consistency-model-causal",
      question:
        "Diễn đàn: bình luận trả lời (\"đồng ý luôn!\") phải luôn hiện SAU bình luận gốc (\"mai đi ăn không?\") với MỌI người xem — nhưng thứ tự giữa hai chủ đề bình luận không liên quan nhau thì không cần giống nhau ở mọi người xem. Đây là mô tả của mức consistency nào?",
      options: [
        "Linearizable",
        "Eventual",
        "Causal consistency",
        "Read-your-writes",
      ],
      answerIndex: 2,
      explanation:
        "Causal consistency chỉ giữ thứ tự cho các thao tác có quan hệ nhân-quả (trả lời phải sau bài gốc nó trả lời) và cho phép các thao tác độc lập (2 chủ đề khác nhau) hiện thứ tự khác nhau ở người xem khác nhau — rẻ hơn linearizable/sequential nhưng vẫn đúng trực giác người dùng.",
    },
    {
      id: "quorum-boundary-case",
      question: "Với `N = 5` replica, `W = 3`, `R = 2` (`W + R = N = 5`), tập ghi và tập đọc có CHẮC CHẮN giao nhau không?",
      options: [
        "Chắc chắn giao nhau vì 3 + 2 = 5 = N",
        "Không chắc — có thể chọn 3 node để ghi và 2 node còn lại (khác hoàn toàn) để đọc, tập rỗng giao nhau; cần `W + R > N` (nghiêm ngặt) mới đảm bảo",
        "Chắc chắn giao nhau vì N là số lẻ",
        "Không liên quan tới N, chỉ phụ thuộc W và R",
      ],
      answerIndex: 1,
      explanation:
        "Pigeonhole: `W + R > N` mới ép hai tập kích thước W và R (chọn từ N phần tử) buộc phải có phần tử chung. Khi `W + R = N` đúng bằng N, hoàn toàn có thể chia N phần tử thành 2 nhóm rời nhau kích thước W và R — không có gì đảm bảo đọc thấy ghi mới nhất.",
    },
    {
      id: "sloppy-quorum-breaks-overlap",
      question:
        "Hệ thống cấu hình `N=3, W=2, R=2` (`W+R=4>N`) tưởng như luôn đọc thấy dữ liệu mới. Nhưng khi 1 trong 3 replica down, hệ thống bật sloppy quorum: ghi tạm vào một node khác ngoài 3 node gốc (hinted handoff) để vẫn đạt đủ `W=2`. Hệ quả nào đúng?",
      options: [
        "Không ảnh hưởng gì, `W+R>N` vẫn giữ đúng vì vẫn có 2 xác nhận ghi",
        "Đảm bảo overlap toán học bị phá vỡ: node hinted không nằm trong 3 node mà client đọc sẽ hỏi, nên read có thể không thấy được write đó cho tới khi hinted handoff chuyển dữ liệu về đúng node — vẫn có thể stale read dù `W+R>N`",
        "Sloppy quorum làm hệ thống chuyển hẳn sang linearizable vì có thêm một node xác nhận",
        "Sloppy quorum chỉ ảnh hưởng tới ghi, không bao giờ ảnh hưởng tới đọc",
      ],
      answerIndex: 1,
      explanation:
        "`W+R>N` chỉ đúng khi cả W lẫn R đều chọn trong đúng tập N node 'chính chủ'. Sloppy quorum đếm cả node ngoài tập đó vào W để đổi lấy availability lúc có node down — công thức toán vẫn viết ra `4>3` nhưng đảm bảo overlap không còn giữ, nên vẫn có thể đọc dữ liệu cũ tới khi read repair/hinted handoff hoàn tất.",
    },
    {
      id: "lww-clock-skew-risk",
      question:
        "Hai replica offline cùng sửa `shipping_address` của một đơn hàng. Khi merge bằng last-write-wins theo timestamp của MÁY GHI (client clock), rủi ro lớn nhất là gì?",
      options: [
        "LWW luôn giữ được cả hai giá trị nên không có rủi ro",
        "Do đồng hồ hai máy lệch nhau (clock skew), giá trị ghi *trước* về mặt thời gian thực nhưng có timestamp lớn hơn (đồng hồ chạy nhanh) có thể thắng, âm thầm xoá mất giá trị ghi sau — không có cảnh báo nào cho app hay người dùng",
        "LWW chỉ hoạt động với dữ liệu dạng số, không dùng được cho string như địa chỉ",
        "LWW luôn cần một coordinator trung tâm nên không dùng được ở leaderless replication",
      ],
      answerIndex: 1,
      explanation:
        "LWW chọn 'người thắng' chỉ dựa trên timestamp, không dựa trên quan hệ nhân-quả thật. Clock skew (hay đồng hồ không đồng bộ) có thể làm bản ghi thật sự mới hơn bị timestamp nhỏ hơn và bị ghi đè — mất update mà không ai biết, vì LWW không báo xung đột, nó tự quyết luôn.",
    },
    {
      id: "crdt-scope-limitation",
      question:
        "Một CRDT (vd G-Counter) giúp bộ đếm lượt xem hội tụ đúng trên nhiều datacenter mà không cần coordination. Điều nào mô tả đúng giới hạn của CRDT?",
      options: [
        "CRDT giải quyết được mọi bài toán conflict, kể cả 'chỉ 1 người được là chủ sở hữu record cuối cùng' (vd đặt phòng cuối cùng)",
        "CRDT hội tụ đúng vì mọi thao tác nó hỗ trợ là commutative/idempotent theo thiết kế (đếm cộng, set thêm/xoá có theo dõi) — nhưng chỉ cho các kiểu dữ liệu/thao tác được thiết kế sẵn, không thay thế được logic nghiệp vụ tuỳ ý cần trọng tài (như 'chỉ 1 vé cuối cùng')",
        "CRDT chỉ dùng được khi có đúng 2 replica",
        "CRDT tương đương version vector về cách hoạt động, chỉ khác tên gọi",
      ],
      answerIndex: 1,
      explanation:
        "CRDT hội tụ mà không cần coordination *vì* các thao tác nó cung cấp (add-only, OR-Set add/remove, PN-Counter) được chứng minh commutative/associative/idempotent — merge theo thứ tự nào cũng ra cùng kết quả. Bài toán cần 'đúng một người thắng' (double-booking, số lượng có hạn) không map được vào các thao tác đó, vẫn cần quorum/lock/consensus.",
    },
  ],
};
