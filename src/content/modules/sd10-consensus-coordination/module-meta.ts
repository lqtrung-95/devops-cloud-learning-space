import type { ModuleDefinition } from "@/content/content-types";

export const sd10ConsensusCoordinationModule: ModuleDefinition = {
  id: "sd10",
  slug: "sd10-consensus-coordination",
  phaseId: "sd-phase-2",
  order: 10,
  weeks: "Tuần 13–14",
  title: "Consensus & coordination",
  emoji: "🗳️",
  eli5Summary:
    "Một nhóm lính gác đứng nhiều chốt quanh kho hàng, không có chỉ huy cố định — họ phải tự thống nhất ai là ca trưởng ca này bằng cách hô to xin phiếu và đếm tay, dù đường liên lạc có lúc chập chờn và đồng hồ đeo tay mỗi người chạy lệch nhau vài phút. Module này dạy bạn cách nhiều máy tự thống nhất một quyết định (Raft), cách mượn dịch vụ đã làm sẵn việc đó (etcd/ZooKeeper) thay vì tự cài, và vì sao một cái khoá kho chỉ có hạn dùng (lease) chưa chắc đã an toàn.",
  objectives: [
    "Giải thích vì sao heartbeat/timeout đơn thuần (không majority) dẫn tới split brain, và vì sao majority (quá bán) là điều kiện toán học bắt buộc để chỉ có tối đa một leader hợp lệ",
    "Diễn giải Raft: term tăng đơn điệu, bầu leader bằng randomized election timeout, một entry được coi là committed khi đã replicate tới đa số (không cần tất cả), và log matching property giữ log các node nhất quán",
    "Dùng etcd (hoặc ZooKeeper) cho leader election/distributed lock/service discovery qua lease + watch, hiểu vì sao thời gian failover bị chặn dưới bởi TTL của lease",
    "Giải thích vì sao một distributed lock chỉ dựa vào TTL/lease không đủ an toàn khi holder bị pause (GC) lâu hơn TTL, và cách fencing token đóng lỗ hổng đó ở tầng storage nhận ghi",
    "Phân biệt đồng hồ vật lý (wall-clock, có NTP skew) với đồng hồ logic (Lamport) — biết khi nào timestamp vật lý gây kết luận sai thứ tự nhân-quả",
    "Thiết kế ID generator kiểu Snowflake (timestamp + worker id + sequence) và giải thích chính xác ID sinh ra 'roughly time-sortable' chứ không phải sort tuyệt đối theo thời gian sinh",
  ],
  lessons: [
    {
      slug: "vi-sao-dong-thuan-kho",
      title: "Vì sao đồng thuận giữa nhiều máy lại khó",
      minutes: 40,
      summary: "Split brain khi thiếu majority, và vì sao không nên tin đồng hồ tường để quyết định ai là leader hay sự kiện nào trước.",
    },
    {
      slug: "raft-tung-buoc",
      title: "Raft từng bước: term, bầu leader, replicate log",
      minutes: 55,
      summary: "Randomized election timeout, term chỉ tăng, và một entry committed ngay khi đủ đa số ack — không cần chờ node chậm nhất.",
    },
    {
      slug: "etcd-zookeeper-trong-thuc-te",
      title: "etcd/ZooKeeper trong thực tế: lease, watch, leader election",
      minutes: 45,
      summary: "Dùng dịch vụ coordination đã có sẵn Raft/Zab bên trong thay vì tự cài — và cái giá thời gian failover phụ thuộc TTL lease.",
    },
    {
      slug: "distributed-lock-fencing-token",
      title: "Distributed lock & fencing token",
      minutes: 45,
      summary: "Vì sao lease một mình không đủ an toàn khi holder bị pause, và fencing token đóng lỗ hổng đó ở đâu.",
    },
    {
      slug: "dong-ho-va-id-generator",
      title: "Đồng hồ phân tán & ID generator (Lamport, Snowflake)",
      minutes: 40,
      summary: "Đồng hồ vật lý lệch (NTP) không dùng để sắp thứ tự được; đồng hồ logic (Lamport) và ID kiểu Snowflake giải quyết theo hai cách khác nhau.",
    },
  ],
  labs: [
    {
      id: "raft-simulator-kill-leader-partition",
      title: "Mô phỏng Raft: kill leader, cắt mạng, ghi lại term",
      description: "Dùng trực quan hoá Raft trên trình duyệt, chủ động gây sự cố và ghi lại `term`/log sau mỗi sự kiện để thấy invariant term-chỉ-tăng và majority ngoài đời.",
      steps: [
        "Mở `https://raft.github.io/` (5 node mặc định), bấm play để cụm tự bầu leader; ghi lại `term` hiện tại và node đang leader vào file cục bộ bằng `echo \"t=0 term=1 leader=S1\" >> sd10/raft-observations.md`",
        "Bấm nút dừng (kill) lên đúng node đang là leader để giả lập crash; đợi các node còn lại hết `election timeout` trên UI, ghi lại `term` mới và leader mới bằng `echo \"t=1 term=2 leader=S3\" >> sd10/raft-observations.md`",
        "Kéo để tạo network partition tách 2 node khỏi 3 node còn lại, ngắt đúng lúc nhóm 2 node đó KHÔNG có leader; quan sát 30 giây rồi đếm số lần nhóm thiểu số tự tăng term mà không bao giờ bầu được leader (không đủ majority) bằng `grep 'minority' sd10/raft-observations.md | wc -l`",
        "Nối lại mạng; quan sát 2 node thiểu số nhận `AppendEntries` từ leader hiện tại có term cao hơn term chúng đang giữ — chúng lập tức step down về follower và cập nhật term của mình; xác nhận bằng `tail -5 sd10/raft-observations.md` rằng term của 2 node đó tăng đúng bằng term của leader hợp lệ, không có node nào giữ term cũ",
      ],
    },
    {
      id: "etcd-cluster-lease-leader-election",
      title: "Cụm etcd 3 node: leader election bằng lease",
      description: "Dựng cụm etcd thật trong sd-playground, cho 2 worker tranh một key qua lease, rồi đo thời gian failover khi kill worker đang là leader.",
      steps: [
        "Thêm 3 service `etcd1`, `etcd2`, `etcd3` (image `gcr.io/etcd-io/etcd`) tạo thành 1 cụm etcd static 3 node trong `sd-playground`; chạy `docker compose up -d etcd1 etcd2 etcd3` rồi kiểm tra cụm khoẻ bằng `docker compose exec etcd1 etcdctl --endpoints=etcd1:2379,etcd2:2379,etcd3:2379 endpoint health`",
        "Viết `sd10/leader-election-worker.ts` (< 60 dòng, dùng thư viện `etcd3`): mỗi worker xin `lease.grant(10)` rồi thử `put('/election/leader')` gắn lease đó theo kiểu compare-and-swap (chỉ ghi nếu key chưa tồn tại); chạy 2 terminal `npx tsx sd10/leader-election-worker.ts --name workerA` và `--name workerB`, quan sát chỉ một bên in `\"tôi là leader\"`, bên kia in `\"đang watch...\"`",
        "Dừng 1 trong 3 node etcd để mô phỏng node chết: `docker compose stop etcd2`; xác nhận cụm vẫn hoạt động bình thường vì còn 2/3 (majority) bằng `docker compose exec etcd1 etcdctl --endpoints=etcd1:2379,etcd3:2379 endpoint status --cluster`",
        "Kill đúng process worker đang là leader (`Ctrl+C` hoặc `kill -9 <pid>`) và ghi lại thời điểm; đo thời gian tới khi worker còn lại in `\"tôi là leader\"` (nhận qua `watch`) — thời gian này phải xấp xỉ TTL 10 giây đã cấu hình, không thể nhanh hơn nhiều",
      ],
    },
    {
      id: "distributed-lock-fencing-token-repro",
      title: "Tái hiện lỗi lock hết hạn khi GC pause, sửa bằng fencing token",
      description: "Dựng 1 storage service giả lập không kiểm tra gì, chứng minh lock TTL đơn thuần bị vi phạm khi holder pause lâu hơn TTL, rồi vá bằng fencing token.",
      steps: [
        "Viết `sd10/storage-service.ts` (< 40 dòng, Fastify) lắng nghe cổng 4000 trong `sd-playground`, endpoint `POST /write` nhận `{ value }` và ghi thẳng vào biến trong bộ nhớ, KHÔNG kiểm tra gì; chạy bằng `npx tsx sd10/storage-service.ts`",
        "Viết `sd10/lock-client.ts` acquire lock trên Redis của playground bằng `docker compose exec redis redis-cli SET lock:doc1 A NX PX 5000`; mô phỏng client A pause 8 giây (`sleep(8000)` TRƯỚC khi gọi `/write`) — dài hơn TTL 5 giây; trong lúc A đang pause, chạy client B: `docker compose exec redis redis-cli SET lock:doc1 B NX PX 5000` (thành công vì TTL A đã hết) rồi B gọi `curl -X POST localhost:4000/write -d '{\"value\":\"B\"}'`",
        "Đợi A hết pause, để A tiếp tục gọi `curl -X POST localhost:4000/write -d '{\"value\":\"A\"}'` với dữ liệu A tính từ TRƯỚC lúc pause; kiểm tra `curl localhost:4000/read` và xác nhận giá trị cuối cùng là `\"A\"` — GHI ĐÈ SAI lên kết quả hợp lệ của B",
        "Sửa: đổi acquire lock sang `docker compose exec redis redis-cli INCR lock:doc1:fencing` lấy token tăng dần, gửi token kèm mọi request `/write`; sửa `storage-service.ts` lưu thêm `lastToken`, chỉ chấp nhận ghi khi `token > lastToken` (ngược lại trả `409`); chạy lại đúng kịch bản GC pause — lần này ghi trễ của A bị từ chối `409`, `curl localhost:4000/read` trả đúng `\"B\"`",
      ],
    },
    {
      id: "snowflake-id-generator-no-collision",
      title: "Viết Snowflake ID generator, kiểm tra không trùng 4 worker song song",
      description: "Tự viết bộ sinh ID kiểu Snowflake (timestamp + worker id + sequence) và chứng minh 4 worker chạy song song không bao giờ sinh trùng ID.",
      steps: [
        "Viết `sd10/snowflake.ts` (< 50 dòng): 41 bit timestamp (ms từ epoch tuỳ chọn `2024-01-01T00:00:00Z`) + 10 bit worker id + 12 bit sequence; hàm `nextId(workerId)` tăng sequence trong cùng 1ms, khi sequence tràn 4096 thì BUSY-WAIT sang mili-giây tiếp theo rồi reset sequence về 0",
        "Chạy 4 worker song song, mỗi worker sinh 100.000 id ra 4 file riêng: `for w in 0 1 2 3; do npx tsx sd10/snowflake.ts --worker $w --count 100000 > sd10/ids-$w.txt & done; wait`",
        "Gộp toàn bộ 400.000 id và kiểm tra trùng lặp: `cat sd10/ids-*.txt | sort | uniq -d | wc -l` phải in ra `0`",
        "Kiểm tra tính roughly time-sortable: `cat sd10/ids-*.txt | sort -n | head -3` và `... | tail -3`, rồi giải mã bit timestamp của id đầu và id cuối bằng `node -e \"console.log((BigInt(process.argv[1]) >> 22n).toString())\" <id>` — xác nhận timestamp giải mã của id đầu nhỏ hơn hoặc bằng id cuối",
      ],
    },
  ],
  deliverable:
    "Thư mục `sd10/` gồm: `raft-observations.md` (log term/leader qua các sự kiện kill/partition trên raft.github.io), `leader-election-worker.ts` cùng thời gian đo failover thực tế của cụm etcd, `storage-service.ts` + `lock-client.ts` cùng kết quả TRƯỚC/SAU khi thêm fencing token, và `snowflake.ts` cùng 400.000 id từ 4 worker không trùng lặp.",
  successCriteria:
    "Giải thích đúng vì sao Raft cần majority để commit một entry (không phải toàn bộ node); chỉ ra chính xác lỗ hổng của một distributed lock chỉ dựa vào TTL/lease khi không có fencing token, và storage phải kiểm tra gì để vá lỗ hổng đó.",
  resources: [
    { title: "Raft paper — In Search of an Understandable Consensus Algorithm (PDF)", url: "https://raft.github.io/raft.pdf", kind: "doc" },
    { title: "raft.github.io — trực quan hoá Raft tương tác", url: "https://raft.github.io/", kind: "tool" },
    { title: "The Secret Lives of Data — Raft", url: "http://thesecretlivesofdata.com/raft/", kind: "tool" },
    { title: "Designing Data-Intensive Applications (Kleppmann) — ch.8–9", url: "https://dataintensive.net/", kind: "book" },
    { title: "Martin Kleppmann — How to do distributed locking", url: "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html", kind: "doc" },
    { title: "etcd docs — Learning: Why etcd, Leases & Locks", url: "https://etcd.io/docs/latest/learning/", kind: "doc" },
    { title: "Apache ZooKeeper — Documentation", url: "https://zookeeper.apache.org/doc/current/", kind: "doc" },
    { title: "Twitter Snowflake — bộ sinh ID gốc (GitHub archive)", url: "https://github.com/twitter-archive/snowflake/tree/snowflake-2010", kind: "doc" },
  ],
  quiz: [
    {
      id: "why-heartbeat-alone-splits-brain",
      question:
        "Hệ thống bầu leader chỉ bằng luật: 'node nào không nghe heartbeat quá 3 giây thì tự phong mình làm leader', KHÔNG cần hỏi ý kiến node nào khác. Điều gì có thể xảy ra khi mạng nội bộ giữa 2 node bị đứt nhưng cả hai vẫn phục vụ được client riêng?",
      options: [
        "Không sao, node im lặng lâu hơn sẽ tự nhường quyền",
        "Hệ thống sẽ tự dừng hẳn cho tới khi mạng nối lại",
        "Cả hai có thể cùng lúc tin mình là leader và cùng nhận ghi — split brain, vì không có bước nào yêu cầu xác nhận từ đa số trước khi tự phong",
        "Chỉ node có địa chỉ IP nhỏ hơn được phép tự phong leader",
      ],
      answerIndex: 2,
      explanation:
        "Giống 2 tổng đài viên trực đêm mất liên lạc nội bộ nhưng đường dây ra ngoài vẫn ổn: mỗi bên chỉ dựa vào việc 'có nghe heartbeat hay không' để tự quyết, không ai cần xin phép ai — nên cả hai có thể cùng tự phong. Cần một điều kiện MẠNH hơn: chỉ được làm leader khi có XÁC NHẬN từ đa số.",
    },
    {
      id: "majority-guarantees-single-leader",
      question: "Vì sao yêu cầu 'phải được ĐA SỐ (majority, quá bán) chấp thuận' lại đảm bảo không có 2 leader hợp lệ cùng lúc trong một cụm N node?",
      options: [
        "Vì hai tập hợp, mỗi tập chiếm hơn một nửa N node, BẮT BUỘC phải có ít nhất một node chung — node đó không thể đồng thời chấp thuận hai leader khác nhau trong cùng một nhiệm kỳ",
        "Vì đa số luôn là số lẻ nên không thể hoà",
        "Vì majority luôn bao gồm node có ID nhỏ nhất",
        "Vì etcd/ZooKeeper cấm node bỏ phiếu hai lần suốt vòng đời cụm",
      ],
      answerIndex: 0,
      explanation:
        "Đây là pigeonhole giống hệt quorum `W+R>N` ở SD09: hai tập hợp cùng lớn hơn N/2 không thể rời nhau hoàn toàn. Node nằm trong cả hai tập chỉ bỏ phiếu một lần cho một term, nên không thể có 2 leader cùng thắng majority ở cùng một term.",
    },
    {
      id: "raft-term-monotonic-and-election-timeout-random",
      question: "Trong Raft, vì sao `election timeout` của mỗi node phải được chọn NGẪU NHIÊN (mỗi node một khoảng khác nhau) thay vì đặt cố định giống nhau cho mọi node?",
      options: [
        "Ngẫu nhiên giúp tiết kiệm băng thông mạng",
        "Ngẫu nhiên là bắt buộc để mã hoá term cho an toàn",
        "Vì etcd yêu cầu vậy, bản thân thuật toán Raft gốc không cần ngẫu nhiên",
        "Nếu tất cả node có cùng timeout cố định, chúng có xu hướng hết timeout gần như đồng thời, cùng trở thành candidate một lúc và chia phiếu — không ai đạt majority, phải bầu lại nhiều vòng; ngẫu nhiên hoá làm một node thường hết timeout trước, giảm khả năng chia phiếu",
      ],
      answerIndex: 3,
      explanation:
        "Giống nhóm lính gác nếu tất cả cùng đếm '3 giây không nghe lệnh thì xin ứng cử' y hệt nhau, họ sẽ đồng loạt giơ tay cùng lúc, phiếu bị chia đều, không ai đủ quá bán. Random hoá (thường 150–300ms) làm gần như luôn có một người giơ tay trước, tránh chia phiếu và giúp bầu xong trong 1 vòng.",
    },
    {
      id: "raft-commit-needs-majority-not-all",
      question: "Leader Raft của cụm 5 node vừa nhận ACK từ chính nó và từ 2 follower khác (tổng 3/5) cho một log entry mới; 2 follower còn lại vẫn chưa phản hồi (mạng chậm). Leader có thể coi entry đó là `committed` chưa?",
      options: [
        "Chưa, phải đợi đủ cả 5/5 node ACK mới được coi là committed",
        "Rồi — 3/5 đã là ĐA SỐ trên 5 node; leader có thể commit và trả lời client ngay, không cần chờ 2 node chậm nhất",
        "Chưa, Raft luôn cần ít nhất 4/5 để an toàn",
        "Không thể xác định nếu không biết `term` hiện tại",
      ],
      answerIndex: 1,
      explanation:
        "'Committed khi đã replicate tới đa số' nghĩa đúng là đa số, không phải toàn bộ. Với N=5, majority = 3. Leader không cần chờ node chậm nhất — đây chính là lý do Raft chịu được một số node chậm/chết mà vẫn tiếp tục nhận ghi.",
    },
    {
      id: "raft-log-matching-uncommitted-entry",
      question: "Một follower vừa hồi phục sau khi crash, trong log của nó có một entry ở `index 5, term 2` mà KHÔNG node nào khác trong cụm từng có (nó chưa bao giờ được replicate xong khi follower này còn là leader cũ). Leader hiện tại (term 4) yêu cầu ghi đè `index 5` bằng entry khác. Điều gì đúng?",
      options: [
        "Ghi đè là AN TOÀN: vì entry cũ ở index 5 chưa từng committed (không đạt majority), Raft cho phép loại bỏ nó và thay bằng entry của leader hiện tại — log matching property chỉ đảm bảo bất biến cho phần ĐÃ committed",
        "Follower phải giữ nguyên entry cũ vì dữ liệu không bao giờ được xoá trong Raft",
        "Đây là lỗi không thể xảy ra trong Raft vì mọi entry đều committed ngay khi ghi vào log",
        "Chỉ được ghi đè nếu term cũ và term mới bằng nhau",
      ],
      answerIndex: 0,
      explanation:
        "Đúng như trong lab log replication: entry chưa committed chỉ tồn tại cục bộ trên node đó, không có gì đảm bảo nó đúng — leader có quyền yêu cầu follower xoá và ghi đè theo log của leader hiện tại (term mới hơn luôn thắng). Bất biến của Raft chỉ áp dụng cho entry đã committed.",
    },
    {
      id: "etcd-vs-rolling-own-raft",
      question: "Một đội cần leader election cho vài worker xử lý batch job hằng ngày. Lựa chọn nào hợp lý hơn: tự cài thuật toán Raft riêng, hay dùng etcd có sẵn?",
      options: [
        "Luôn tự cài Raft riêng để tối ưu hiệu năng tối đa cho use case cụ thể",
        "Không dùng cái nào cả, chỉ cần một cron job chạy trên 1 máy duy nhất là đủ mọi trường hợp",
        "Dùng etcd (hoặc ZooKeeper): nó đã triển khai, kiểm chứng và vận hành thuật toán consensus (Raft/Zab) sẵn — worker chỉ cần gọi API lease + watch, không phải tự lo các cạnh khó của consensus (log matching, snapshot, membership change…)",
        "etcd chỉ dùng để lưu config, không thể dùng cho leader election",
      ],
      answerIndex: 2,
      explanation:
        "Giống thuê hẳn công ty bảo vệ chuyên nghiệp thay vì tự huấn luyện đội lính gác bầu cử: etcd/ZooKeeper đã giải quyết các phần khó nhất của consensus (snapshot, membership change, network partition) và kiểm chứng qua production ở quy mô lớn — worker chỉ cần dùng lease/watch, rẻ hơn rất nhiều so với tự cài Raft cho một bài toán không cần tối ưu cực hạn.",
    },
    {
      id: "etcd-failover-time-bounded-by-ttl",
      question: "Worker A giữ lease TTL=10s cho key leader election trên etcd. A bị kill đột ngột (crash cứng, không kịp gửi tín hiệu gì). Thời gian TỐI THIỂU để worker B nhận ra và giành được quyền leader là khoảng bao nhiêu, và vì sao?",
      options: [
        "Gần như 0 giây, vì etcd phát hiện crash ngay lập tức qua TCP RST",
        "Xấp xỉ TTL (khoảng 10 giây) tính từ lần renew cuối cùng của A — etcd chỉ xoá lease khi TTL thật sự hết hạn, không có cách nào biết A chết sớm hơn nếu A không tự báo",
        "Luôn đúng bằng đúng thời gian round-trip mạng giữa A và etcd",
        "Không xác định được, phụ thuộc hoàn toàn vào tốc độ CPU của B",
      ],
      answerIndex: 1,
      explanation:
        "etcd không có phép màu phát hiện crash tức thời — nó chỉ biết 'không nhận KeepAlive trong TTL giây'. TTL ngắn phát hiện nhanh hơn nhưng tốn tài nguyên renew hơn; đây là trade-off khi chọn TTL, không phải lỗi cấu hình.",
    },
    {
      id: "lock-without-fencing-corruption",
      question: "Client A giữ lock Redis TTL=5s rồi rơi vào GC pause 8 giây. Trong lúc đó B giành lock (TTL A đã hết), ghi dữ liệu, rồi A tỉnh dậy và vẫn gọi ghi vào cùng storage vì tưởng mình còn giữ lock. Nếu storage KHÔNG kiểm tra gì thêm ngoài nhận request, hệ quả là gì?",
      options: [
        "Redis sẽ tự chặn request ghi của A vì lock đã hết hạn",
        "Không có vấn đề gì vì Redis lock TTL luôn đủ an toàn cho race condition này",
        "A sẽ nhận lỗi ngay khi cố ghi vì Redis phát hiện lock đã đổi chủ",
        "Ghi của A (dựa trên dữ liệu cũ trước pause) có thể ghi đè lên ghi hợp lệ của B mà storage hoàn toàn không biết có gì sai — mất cập nhật của B",
      ],
      answerIndex: 3,
      explanation:
        "Đây đúng là lỗ hổng kinh điển trong bài 'How to do distributed locking' của Kleppmann: Redis chỉ quản lý AI GIỮ LOCK, không quản lý AI ĐƯỢC PHÉP GHI vào storage. Khi A gọi ghi trực tiếp vào storage (không qua Redis), không có gì ngăn nó — storage cần tự kiểm tra thêm, đó là lý do cần fencing token.",
    },
    {
      id: "fencing-token-fix",
      question: "Với đúng kịch bản GC pause ở trên, thêm fencing token giải quyết vấn đề như thế nào?",
      options: [
        "Mỗi lần giành lock, client nhận một token TĂNG DẦN (vd qua `INCR`); storage lưu `lastToken` đã chấp nhận và CHỈ ghi khi `token mới > lastToken` — ghi trễ của A mang token nhỏ hơn (giành lock trước B) sẽ bị storage từ chối dù A không biết mình đã mất lock",
        "Fencing token làm GC pause không xảy ra nữa",
        "Fencing token thay thế hoàn toàn Redis, không cần lock nữa",
        "Fencing token chỉ hoạt động nếu dùng etcd, không dùng được với Redis",
      ],
      answerIndex: 0,
      explanation:
        "Điểm mấu chốt: an toàn không nằm ở việc ngăn A gửi request (không ngăn được) mà ở việc STORAGE từ chối request có token cũ hơn token đã thấy gần nhất. Token đơn điệu tăng biến 'ai giành lock trước/sau' thành một con số so sánh được ngay tại nơi ghi dữ liệu thật.",
    },
    {
      id: "lamport-vs-wallclock-ordering",
      question: "Node A gửi tin cho node B. Do NTP lệch, đồng hồ TƯỜNG của B đang chạy chậm hơn A; timestamp tường lúc B nhận tin (`10:00:00.015`) nhỏ hơn timestamp tường lúc A gửi tin (`10:00:00.050`). Nhận định nào đúng?",
      options: [
        "Kết luận đúng: B thực sự nhận tin trước khi A gửi, do mạng có độ trễ âm",
        "Không có cách nào giải quyết, distributed system không thể biết thứ tự sự kiện",
        "So sánh timestamp tường ở đây cho kết luận SAI (nhận trước gửi là vô lý về nhân-quả); muốn sắp đúng thứ tự nhân-quả giữa các máy khác đồng hồ, nên dùng đồng hồ logic (Lamport: `L_nhận = max(L_nhận, L_gửi) + 1`), không dùng timestamp tường để so sánh chéo máy",
        "Chỉ cần đồng bộ NTP chính xác tuyệt đối 0ms là hết vấn đề, đây là mục tiêu khả thi trong thực tế",
      ],
      answerIndex: 2,
      explanation:
        "Đúng như trong diagram: NTP skew (vài ms tới hàng trăm ms tuỳ chất lượng đồng bộ) là thật và không triệt tiêu tuyệt đối được. Lamport clock không phụ thuộc đồng hồ vật lý, chỉ tăng theo quan hệ gửi/nhận nên LUÔN cho thứ tự nhân-quả đúng — đổi lại nó không cho biết khoảng cách thời gian thực.",
    },
    {
      id: "snowflake-roughly-sortable-not-exact",
      question: "Hai worker (worker id = 3 và worker id = 7) cùng sinh một ID Snowflake trong đúng cùng một mili-giây. Phát biểu nào đúng về thứ tự hai ID này?",
      options: [
        "ID không xác định được thứ tự vì Snowflake không hoạt động khi trùng mili-giây",
        "ID của worker 7 chắc chắn lớn hơn ID của worker 3 (vì phần bit worker id nằm sau phần timestamp bằng nhau), NHƯNG điều đó phản ánh worker id lớn hơn — không phản ánh worker 7 sinh ID sau worker 3 trong thực tế; đây chính là ý nghĩa 'roughly' time-sortable, không phải sort tuyệt đối theo thời điểm sinh",
        "Hai ID luôn bằng nhau vì cùng timestamp",
        "Sequence sẽ tự động phá vỡ tính duy nhất khi hai worker trùng mili-giây",
      ],
      answerIndex: 1,
      explanation:
        "Đúng theo bit layout: 41 bit timestamp bằng nhau ở cả hai ID, phần còn lại (worker id, rồi sequence) quyết định ai lớn hơn về mặt SỐ, không phải về mặt THỜI GIAN THỰC sinh ra. 'Roughly time-sortable' nghĩa là đúng thứ tự theo từng mili-giây, không đảm bảo thứ tự tuyệt đối bên trong cùng một mili-giây giữa các worker khác nhau.",
      recallPrompt: "Khi hai worker khác nhau sinh ID Snowflake trong đúng cùng một mili-giây, ID lớn hơn có chắc chắn phản ánh ai sinh ra sau trong thực tế không? Vì sao 'roughly time-sortable' không phải là sort tuyệt đối?",
    },
  ],
};
