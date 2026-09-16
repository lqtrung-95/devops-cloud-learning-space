import type { ModuleDefinition } from "@/content/content-types";

export const sd13SloCapacityMultiRegionModule: ModuleDefinition = {
  id: "sd13",
  slug: "sd13-slo-capacity-multi-region",
  phaseId: "sd-phase-3",
  order: 13,
  weeks: "Tuần 17",
  title: "SLO, capacity planning & multi-region",
  emoji: "🌏",
  eli5Summary:
    "Một bệnh viện hứa '95% ca cấp cứu được bác sĩ tiếp nhận trong 10 phút' — đó là lời hứa (SLO). Module này không dạy lại cách viết lời hứa đó (đã học ở M16 khoá DevOps), mà dạy: lời hứa đó bắt bệnh viện phải chuẩn bị bao nhiêu giường (capacity), bao nhiêu ca trực dự phòng (HA/DR), và mở thêm chi nhánh ở đâu (multi-region) — cùng cái giá phải trả cho từng lựa chọn.",
  objectives: [
    "Từ một mức SLO cụ thể, suy ra được kiến trúc tối thiểu cần có (redundancy, số region) thay vì chỉ tính error budget suông",
    "Lập capacity plan cho kịch bản tăng trưởng 10× dựa trên số đo thật (k6, headroom từng thành phần), chỉ ra đúng chỗ vỡ trước",
    "Rà soát một kiến trúc để tìm single point of failure (SPOF) và chọn mức redundancy phù hợp (N+1, theo AZ)",
    "Phân biệt RPO và RTO, và chọn đúng chiến lược DR (backup/restore, pilot light, warm standby, active-active) theo yêu cầu nghiệp vụ",
    "Nêu được cái giá thật của multi-region (cross-region egress, độ phức tạp consistency) thay vì chỉ nói 'multi-region cho chắc'",
    "Viết một design doc mà mỗi quyết định HA/DR đều có số RPO/RTO và chi phí đi kèm — không quyết định nào 'chọn vì nghe an toàn'",
  ],
  lessons: [
    {
      slug: "slo-design-decisions",
      title: "SLO trong thiết kế: từ lời hứa tới kiến trúc",
      minutes: 40,
      summary: "Nếu đã học SLI/SLO/error budget ở M16, phần ôn ở đây rất nhanh — trọng tâm là: mức SLO nào bắt bạn phải multi-AZ, mức nào bắt bạn phải multi-region.",
    },
    {
      slug: "capacity-planning-headroom",
      title: "Capacity planning: đo headroom, dự báo tăng trưởng",
      minutes: 45,
      summary: "Dùng số đo k6 thật từ các lab trước để tính còn bao nhiêu dư địa, và thành phần nào vỡ trước khi tải tăng 10×.",
    },
    {
      slug: "high-availability-spof",
      title: "High availability & loại bỏ single point of failure",
      minutes: 45,
      summary: "Mỗi thành phần trong kiến trúc, tự hỏi: nếu cái này chết, ai gánh? Không ai gánh nghĩa là bạn vừa tìm ra SPOF.",
    },
    {
      slug: "disaster-recovery-rpo-rto",
      title: "Disaster recovery: RPO, RTO và 4 chiến lược DR",
      minutes: 45,
      summary: "RPO trả lời 'mất bao nhiêu dữ liệu chấp nhận được', RTO trả lời 'ngừng bao lâu chấp nhận được' — hai con số này chọn chiến lược DR, không phải ngược lại.",
    },
    {
      slug: "multi-region-cost-tradeoffs",
      title: "Multi-region: data residency, replicate xuyên vùng & chi phí",
      minutes: 40,
      summary: "Multi-region không miễn phí: cross-region egress, độ trễ đồng bộ, và consistency phức tạp hơn hẳn khi có ≥2 region cùng ghi.",
    },
  ],
  labs: [
    {
      id: "capacity-plan-10x-growth",
      title: "Lập capacity plan cho 10× user từ số đo k6 cũ",
      description:
        "Tái sử dụng số đo k6 từ SD01 (ước lượng) và SD03 (load balancing) trong sd-playground để tính headroom hiện tại và dự đoán thành phần nào vỡ trước khi traffic tăng 10 lần.",
      steps: [
        "Chạy lại smoke test cũ để có baseline mới: `docker compose up -d` rồi `k6 run sd03-load-test.js --vus 100 --duration 3m`; ghi lại p95 latency, CPU % của service `app` (`docker stats app-1 app-2 app-3`) và số connection đang mở ở Postgres (`docker compose exec postgres psql -U app -d app -c \"SELECT count(*) FROM pg_stat_activity;\"`)",
        "Tính headroom từng thành phần: `headroom = (capacity - usage) / capacity`. Ví dụ CPU app đang 35% ở 100 VU ⇒ còn ~65% headroom theo CPU; Postgres `max_connections=100` đang dùng 40 ⇒ còn 60 connection headroom",
        "Ngoại suy tuyến tính lên 10×: 100 VU × 10 = 1000 VU giả định QPS tăng tỉ lệ thuận — CPU app cần ~350% (tức cần thêm ít nhất 3 instance app nữa ngoài mức hiện tại), connection Postgres cần ~400 (vượt `max_connections=100`, phải qua PgBouncer trước khi tới 10×)",
        "Xác nhận thực tế bằng cách chạy k6 ở mức tải cao nhất máy local chịu được (`k6 run sd03-load-test.js --vus 400 --duration 3m`) và xem thành phần nào báo lỗi hoặc p95 tăng vọt trước — so với dự đoán ở bước trên, ghi rõ sai lệch nếu có",
        "Viết bảng capacity plan (đưa vào design doc mục 8): thành phần | headroom hiện tại | cần gì ở 10× | vỡ trước hay sau",
      ],
    },
    {
      id: "dr-restore-drill-rpo-rto",
      title: "Thực hành DR: restore Postgres và bấm giờ đo RPO/RTO thật",
      description:
        "Đặt mục tiêu RPO 5 phút, RTO 30 phút cho Postgres trong sd-playground (kế thừa từ SD01/SD06), rồi giả lập sự cố và đo xem có đạt không.",
      steps: [
        "Bật WAL archiving liên tục để đáp ứng RPO 5 phút: trong `postgresql.conf` đặt `archive_mode = on` và `archive_command = 'cp %p /backup/wal/%f'`, sau đó lấy base backup: `docker compose exec postgres pg_basebackup -U app -D /backup/base -Fp -Xs -P`",
        "Ghi timestamp bắt đầu sự cố rồi giả lập mất dữ liệu: `docker compose stop postgres && docker volume rm sd-playground_postgres-data`",
        "Restore từ base backup: khôi phục thư mục data từ `/backup/base`, đặt file `recovery.signal` và `restore_command = 'cp /backup/wal/%f %p'` trong `postgresql.conf`, rồi `docker compose up -d postgres` để Postgres tự replay WAL tới điểm gần sự cố nhất",
        "Ghi timestamp lúc app connect lại DB thành công (`curl localhost:8080/healthz` trả `200`) — đó là RTO đo được. So với mục tiêu 30 phút",
        "Tính RPO thực tế = khoảng cách thời gian giữa WAL segment cuối cùng archive được và lúc sự cố xảy ra; so với mục tiêu 5 phút và ghi vào design doc lý do đạt/không đạt (tần suất archive, tốc độ ghi WAL)",
      ],
    },
    {
      id: "multi-region-cost-estimate",
      title: "Ước tính chi phí AWS: 1 region vs 2 region active-passive",
      description:
        "Dùng AWS Pricing Calculator để ước lượng chi phí hàng tháng cho kiến trúc tương ứng sd-playground chạy 1 region so với 2 region (region chính + region DR pilot light/warm standby).",
      steps: [
        "Liệt kê thành phần playground tương ứng dịch vụ AWS thật: app (EC2/ECS Fargate), Postgres (RDS), Redis (ElastiCache), reverse proxy (ALB) — ghi lại instance size và số lượng dùng ở lab capacity plan",
        "Dùng AWS Pricing Calculator (calculator.aws) tạo ước tính cho kiến trúc 1 region ở mức tải hiện tại (không phải mức 10×) — lưu link estimate",
        "Thêm một estimate thứ hai: nhân bản thành phần compute + RDS cho region DR ở mức capacity nhỏ hơn (theo chiến lược đã chọn ở lab DR — pilot light hay warm standby), cộng thêm dòng phí `Data Transfer` cho lưu lượng replication liên vùng (ước lượng % dữ liệu ghi mỗi ngày cần replicate)",
        "So sánh 2 estimate: chênh lệch % chi phí hàng tháng — không chốt số tuyệt đối, ghi rõ trong design doc 'con số tham khảo tại thời điểm ước tính, cần kiểm tra lại Pricing Calculator trước khi quyết định thật'",
      ],
    },
    {
      id: "slo-capacity-dr-design-doc",
      title: "Design doc: gộp SLO, capacity, HA/SPOF và DR vào một quyết định kiến trúc",
      description:
        "Dùng template Phụ lục A viết design doc hoàn chỉnh cho sd-playground, mỗi quyết định kèm số RPO/RTO/chi phí — đúng tiêu chí đạt của SD13.",
      steps: [
        "Mục 1–2 (requirements & ước lượng): copy số liệu DAU/QPS từ design doc SD01 của bạn, thêm dòng NFR mới: SLO availability mục tiêu (vd 99.9%) và lý do chọn mức đó (không chọn 99.99% chỉ vì 'nghe an toàn hơn')",
        "Mục 7 (trade-off): viết ≥3 dòng — mức SLO đã chọn (kèm downtime budget/tháng theo Phụ lục B), chiến lược DR đã thực hành ở lab 2 (kèm RPO/RTO đo được thật, không phải số lý thuyết), có multi-region hay không (kèm % chênh chi phí từ lab 3) — mỗi dòng có cột 'khi nào đổi ý'",
        "Mục 8 (bottleneck & mở rộng): điền bảng capacity plan từ lab 1 (thành phần nào vỡ trước ở 10×) và liệt kê SPOF còn sót lại (nếu có) sau khi rà soát theo bài học HA",
        "Trình bày design doc trong 10 phút, tự bấm giờ, tự chấm theo đúng tiêu chí đạt của SD13: mỗi quyết định HA/DR có số RPO/RTO và chi phí đi kèm — không có dòng nào chỉ ghi 'chọn vì an toàn hơn' mà thiếu số",
      ],
    },
  ],
  deliverable:
    "Một design doc hoàn chỉnh (theo Phụ lục A) cho sd-playground: bảng capacity plan cho 10× traffic, kết quả đo RPO/RTO thật từ lab restore, 2 estimate chi phí AWS Pricing Calculator (1 region vs 2 region), và bảng trade-off SLO/DR/multi-region có số đi kèm mỗi dòng.",
  successCriteria: "Mỗi quyết định HA/DR trong design doc có số RPO/RTO và chi phí đi kèm — không có quyết định nào chỉ dựa trên cảm giác 'an toàn hơn'.",
  resources: [
    { title: "Google — Site Reliability Engineering (sách, miễn phí online)", url: "https://sre.google/sre-book/table-of-contents/", kind: "book" },
    { title: "Google — The Site Reliability Workbook (chương capacity planning)", url: "https://sre.google/workbook/table-of-contents/", kind: "book" },
    { title: "AWS Well-Architected Framework — Reliability Pillar", url: "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html", kind: "doc" },
    { title: "AWS Well-Architected — trang tổng quan 6 pillar", url: "https://aws.amazon.com/architecture/well-architected/", kind: "doc" },
    {
      title: "AWS Whitepaper — Disaster Recovery of Workloads on AWS: Recovery in the Cloud",
      url: "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-workloads-on-aws.html",
      kind: "doc",
    },
    { title: "AWS Pricing Calculator", url: "https://calculator.aws/", kind: "tool" },
  ],
  quiz: [
    {
      id: "slo-drives-architecture",
      question:
        "Team đang chạy 1 region, 1 AZ, SLO hiện tại 99.9% (downtime cho phép ~43,8 phút/tháng theo bảng số 9). Sếp muốn nâng lên 99.99% (~4,4 phút/tháng) mà không đổi gì khác. Nhận xét đúng nhất?",
      options: [
        "Chỉ cần theo dõi kỹ hơn và phản ứng nhanh hơn khi có sự cố là đủ, không cần đổi kiến trúc",
        "Không khả thi nếu chỉ 1 AZ: một sự cố AZ (thường kéo dài hàng chục phút) đã ăn hết cả ngân sách 4,4 phút/tháng; 99.99% thường đòi hỏi tối thiểu multi-AZ với failover tự động",
        "Chỉ cần tăng số lượng instance trong cùng AZ là đạt được 99.99%",
        "99.9% và 99.99% chỉ khác nhau về cách tính, kiến trúc không cần đổi",
      ],
      answerIndex: 1,
      explanation:
        "Giống bệnh viện muốn nâng cam kết từ '95% ca trong 10 phút' lên '99,99% ca trong 10 phút' — không thể chỉ hứa suông, phải có thêm ca trực dự phòng. Một AZ chết là sự cố hàng chục phút, vượt xa ngân sách 4,4 phút/tháng của SLO 99,99%; multi-instance cùng AZ không cứu được khi cả AZ đó mất điện/mất mạng.",
    },
    {
      id: "error-budget-burn-design-implication",
      question:
        "Với SLO 99,999% (ngân sách lỗi ~26 giây/tháng theo Phụ lục B), một sự cố đang đốt ngân sách với burn rate 10×. Theo logic ở bài 'SLO trong thiết kế', vì sao mức SLO này gần như bắt buộc phải có failover tự động thay vì con người phản ứng?",
      options: [
        "Vì SLO 99,999% không cho phép con người tham gia vận hành",
        "Vì ngân sách chỉ 26 giây/tháng — con người dù giỏi cỡ nào cũng cần vài phút để phát hiện + phản ứng, tức là VƯỢT quá toàn bộ ngân sách chỉ trong một sự cố; chỉ có cơ chế tự động (multi-region active-active, health check + failover ngay) mới phản ứng đủ nhanh",
        "Vì burn rate 10× luôn nghĩa là hệ thống sắp sập hoàn toàn",
        "Vì con người không được phép truy cập hệ thống có SLO cao",
      ],
      answerIndex: 1,
      explanation:
        "Đây chính là chỗ SLO 'ra lệnh' cho kiến trúc: ngân sách càng nhỏ, thời gian phản ứng cho phép càng ngắn. 26 giây/tháng nhỏ hơn cả thời gian một kỹ sư mở laptop xem alert — nên bắt buộc phải thiết kế để hệ thống tự phục hồi (multi-region active-active, tự động failover), không thể dựa vào runbook thủ công.",
    },
    {
      id: "capacity-headroom-definition",
      question:
        "Ở tải hiện tại, CPU app trung bình 35%, Postgres đang dùng 40/100 connection. Đâu là phát biểu đúng về 'headroom'?",
      options: [
        "Headroom là công suất tối đa hệ thống từng đạt được trong lịch sử",
        "Headroom là phần dư địa còn lại giữa mức dùng hiện tại và giới hạn (ví dụ CPU còn ~65% headroom, connection còn 60 headroom) — nhưng hai con số headroom này không tăng cùng tỉ lệ khi traffic tăng, nên phải tính riêng từng thành phần",
        "Headroom chỉ có ý nghĩa với CPU, không áp dụng được cho connection pool hay memory",
        "Headroom luôn bằng 100% trừ đi uptime SLO",
      ],
      answerIndex: 1,
      explanation:
        "Giống buffet: bàn còn trống là headroom chỗ ngồi, bếp còn rảnh tay là headroom nhân lực — hai loại headroom này cạn với tốc độ khác nhau khi khách đông lên. Capacity plan phải tính headroom riêng cho từng thành phần (CPU, connection, memory), không gộp chung một con số.",
    },
    {
      id: "capacity-10x-bottleneck-not-linear",
      question:
        "Lab đo thấy: 100 VU → CPU app 35%, connection Postgres 40. Ngoại suy tuyến tính cho 1000 VU (10×): CPU cần ~350%, connection cần ~400 (vượt `max_connections=100`). Kết luận nào rút ra đúng nhất từ con số này?",
      options: [
        "CPU app sẽ luôn vỡ trước vì 350% lớn hơn 400 về mặt số học",
        "Connection Postgres vỡ trước theo đúng nghĩa đen (không thể vượt `max_connections`), trong khi CPU 350% chỉ có nghĩa 'cần thêm ~3 instance nữa' — hai loại giới hạn khác nhau: một cái là giới hạn cứng (hard limit) phải xử lý bằng PgBouncer/connection pooling, một cái là scale ngang được",
        "Cả hai con số đều chỉ mang tính tham khảo, không ảnh hưởng tới quyết định kiến trúc",
        "Ngoại suy tuyến tính luôn sai nên không nên dùng trong capacity planning",
      ],
      answerIndex: 1,
      explanation:
        "CPU vượt 100% chỉ có nghĩa 'thêm máy' — scale ngang bình thường. Connection Postgres vượt `max_connections` là giới hạn cứng của một tiến trình duy nhất, không tự scale được, buộc phải thêm tầng connection pooling (PgBouncer) hoặc đổi kiến trúc. Đây là lý do phải nhìn từng con số headroom theo đúng bản chất giới hạn của nó, không chỉ so sánh độ lớn.",
    },
    {
      id: "spof-redundant-lb-not-enough",
      question:
        "Kiến trúc có 2 load balancer (redundant), 3 instance app (redundant), nhưng chỉ 1 Postgres primary không có replica. Nhận xét nào đúng?",
      options: [
        "Kiến trúc đã loại bỏ hết SPOF vì phần 'chịu tải chính' (LB, app) đã redundant",
        "Postgres primary vẫn là SPOF: LB và app dự phòng không giúp gì nếu Postgres chết — toàn bộ request cần đọc/ghi DB đều fail, bất kể có bao nhiêu app instance đứng sau",
        "SPOF chỉ tính cho tầng network (LB), không áp dụng cho database",
        "Vì Postgres 'ít khi chết' nên không cần liệt kê là SPOF",
      ],
      answerIndex: 1,
      explanation:
        "SPOF phải rà từng thành phần trên đường đi của request, không chỉ tầng đầu vào. Giống cây cầu nhiều làn xe nhưng chỉ có một trụ đỡ ở giữa — nhiều làn không cứu được cầu nếu trụ đó sập. Postgres không replica là SPOF thật sự cho toàn bộ luồng cần DB.",
    },
    {
      id: "spof-cross-az-vs-same-az",
      question:
        "Hai instance Postgres (1 primary, 1 replica) được đặt trong CÙNG một Availability Zone để giảm chi phí data transfer. Về mặt loại bỏ SPOF, cách làm này có vấn đề gì?",
      options: [
        "Không vấn đề gì, có 2 instance là đã hết SPOF",
        "Redundancy trong cùng AZ chỉ chống được lỗi phần cứng/tiến trình của một máy, không chống được sự cố cả AZ (mất điện, mất mạng datacenter) — muốn chống loại sự cố đó phải đặt replica ở AZ khác",
        "Cùng AZ luôn tốt hơn vì không có replication lag",
        "AZ không liên quan gì tới high availability, chỉ liên quan tới latency",
      ],
      answerIndex: 1,
      explanation:
        "Redundancy phải khớp với loại sự cố muốn chống. Hai bản sao trong cùng AZ giống hai cáp thang máy cùng buộc chung một điểm neo — đứt điểm neo thì đứt cả hai. Muốn chịu được sự cố cả AZ, replica bắt buộc phải ở AZ khác, đánh đổi lấy một chút latency/chi phí replication.",
    },
    {
      id: "rpo-rto-distinction",
      question: "Một hệ thống thanh toán đặt RPO = 1 phút và RTO = 15 phút. Diễn giải nào đúng?",
      options: [
        "Hệ thống được phép ngừng hoạt động tối đa 1 phút, và mất dữ liệu tối đa trong 15 phút",
        "Hệ thống được phép mất dữ liệu của tối đa 1 phút giao dịch gần nhất (RPO), và được phép ngừng hoạt động tối đa 15 phút trước khi phục hồi xong (RTO) — hai con số độc lập, không thay thế nhau",
        "RPO và RTO là hai tên gọi khác nhau của cùng một khái niệm downtime",
        "RPO 1 phút nghĩa là backup chạy đúng mỗi 1 giờ",
      ],
      answerIndex: 1,
      explanation:
        "RPO (Recovery Point Objective) đo dữ liệu — 'chấp nhận mất tối đa bao nhiêu', quyết định tần suất backup/replication. RTO (Recovery Time Objective) đo thời gian — 'chấp nhận ngừng tối đa bao lâu', quyết định mức độ sẵn sàng của hạ tầng đứng thay. Một hệ thống có thể có RPO rất nhỏ (replicate liên tục) nhưng RTO lớn (chưa có gì chạy sẵn ở nơi dự phòng), hoặc ngược lại.",
    },
    {
      id: "dr-strategy-pick-pilot-light",
      question:
        "Hệ thống cần RPO vài phút, RTO vài chục phút, ngân sách hạn chế (không thể chạy full stack song song ở 2 region suốt ngày). Chiến lược DR nào khớp nhất trong 4 chiến lược chuẩn AWS?",
      options: [
        "Backup & restore (chỉ backup định kỳ, không có gì chạy sẵn)",
        "Pilot light (dữ liệu replicate liên tục ở region DR dạng thu nhỏ, app server tắt sẵn, bật lên khi cần)",
        "Multi-site active-active (cả 2 region cùng phục vụ traffic thật)",
        "Không chiến lược nào trong 4 loại phù hợp, phải tự nghĩ chiến lược khác",
      ],
      answerIndex: 1,
      explanation:
        "Pilot light đúng là điểm cân bằng cho yêu cầu này: replication liên tục cho RPO vài phút (không phải chờ tới lịch backup), nhưng chỉ giữ phần lõi (thường là DB) chạy thu nhỏ — rẻ hơn nhiều so với warm standby/active-active — đổi lại RTO vài chục phút vì còn phải bật/scale app server khi sự cố xảy ra thật.",
    },
    {
      id: "multi-region-hidden-costs",
      question:
        "Đồng nghiệp đề xuất 'chuyển sang multi-region active-active cho chắc, availability sẽ cao hơn'. Câu hỏi phản biện nào nên đặt ra trước, dựa trên bài học multi-region?",
      options: [
        "Chỉ cần hỏi 'AWS có hỗ trợ multi-region không?' vì công nghệ có sẵn là đủ",
        "Cần hỏi: dữ liệu ghi ở 2 region cùng lúc thì hoà giải conflict thế nào (nối lại kiến thức SD09), chi phí cross-region data transfer/egress là bao nhiêu (ước tính bằng Pricing Calculator, không đoán), và có ràng buộc data residency nào không — vì đây là 3 cái giá thật của multi-region, không tự nhiên có availability cao hơn miễn phí",
        "Không cần hỏi gì thêm vì multi-region luôn tốt hơn single-region trong mọi trường hợp",
        "Chỉ cần hỏi về độ trễ mạng, các yếu tố khác không quan trọng",
      ],
      answerIndex: 1,
      explanation:
        "Giống chuỗi cửa hàng mở thêm chi nhánh: chi nhánh mới không tự động làm sổ sách đúng hơn — phải tốn công đối soát (conflict) và tốn phí vận chuyển hàng giữa hai nơi (egress). Multi-region active-active thật sự nâng availability, nhưng cái giá là consistency phức tạp hơn (ai thắng khi 2 region cùng ghi), chi phí data transfer, và đôi khi vướng luật data residency.",
    },
    {
      id: "cost-as-nfr-hedging",
      question:
        "Khi viết phần chi phí trong design doc SD13, cách trình bày nào ĐÚNG tinh thần 'hedge số liệu' được nhấn mạnh trong module này?",
      options: [
        "\"Kiến trúc 2 region tốn thêm chính xác $1.240/tháng\" — ghi cứng một con số để trông chuyên nghiệp",
        "\"Theo ước tính từ AWS Pricing Calculator tại thời điểm viết, kiến trúc 2 region tốn thêm khoảng 60–90% so với 1 region (chủ yếu do nhân đôi compute/RDS và cross-region data transfer) — cần kiểm tra lại Pricing Calculator trước khi chốt ngân sách thật\" — nêu rõ đây là ước tính, có khoảng, có nguồn, có ngày hết hạn ngầm định",
        "Bỏ qua phần chi phí vì system design interview không quan tâm tới tiền",
        "Chỉ ghi \"chi phí sẽ cao hơn\" mà không có số nào, vì số cụ thể luôn sai",
      ],
      answerIndex: 1,
      explanation:
        "Giá cloud thay đổi liên tục và phụ thuộc region/loại instance/discount — nói 'chính xác $1.240' là giả vờ chắc chắn về một con số không bền. Cách đúng: dùng công cụ thật (Pricing Calculator) để có khoảng ước lượng có căn cứ, nói rõ đây là ước tính tại một thời điểm, và hướng người đọc kiểm tra lại — giống cách module này xử lý mọi con số throughput ('cần benchmark') thay vì đọc thuộc.",
    },
  ],
};
