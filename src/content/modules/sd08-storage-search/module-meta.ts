import type { ModuleDefinition } from "@/content/content-types";

export const sd08StorageSearchModule: ModuleDefinition = {
  id: "sd08",
  slug: "sd08-storage-search",
  phaseId: "sd-phase-1",
  order: 8,
  weeks: "Tuần 11",
  title: "Storage & search",
  emoji: "🗂️",
  eli5Summary:
    "Object storage giống một nhà kho tự quản (self-storage) khổng lồ: bạn không tự khiêng hàng vào tận kho, mà được phát một 'vé vào cổng' chỉ dùng được một lần, đúng ô, đúng giờ. Còn tìm kiếm full-text giống mục lục cuối sách giáo khoa: dựng mục lục một lần tốn công, nhưng tra từ nào cũng ra ngay trang nào có nó thay vì lật từng trang.",
  objectives: [
    "Chọn đúng loại storage (block/file/object) theo access pattern và giải thích mô hình durability, storage class của object storage",
    "Thiết kế luồng upload file lớn qua presigned URL + multipart upload sao cho app server không bao giờ 'cầm' bytes của file",
    "Giải thích tokenization và inverted index hoạt động thế nào, vì sao BM25 là độ đo relevance mặc định của các search engine phổ biến",
    "So sánh Postgres full-text search (`tsvector`/GIN) với một search engine chuyên dụng (OpenSearch/Elasticsearch) và biết khi nào cần cái nào",
    "Đồng bộ dữ liệu từ database nguồn sang search index bằng outbox/CDC thay vì dual write, và giải thích được độ trễ eventual consistency của search",
  ],
  lessons: [
    {
      slug: "block-file-object-storage",
      title: "Block, file & object storage",
      minutes: 40,
      summary: "Ổ cứng riêng, ổ đĩa mạng chia sẻ, và kho tự quản trả theo key: ba mô hình lưu trữ và khi nào dùng cái nào.",
    },
    {
      slug: "uploading-large-files-presigned-multipart",
      title: "Upload file lớn: presigned URL & multipart",
      minutes: 50,
      summary: "Phát 'vé vào kho' thay vì tự bê hàng qua quầy; chia file lớn thành từng thùng nhỏ để lỡ rớt chỉ bê lại đúng thùng đó.",
    },
    {
      slug: "inverted-index-tokenization-relevance",
      title: "Inverted index, tokenization & relevance",
      minutes: 45,
      summary: "Dựng mục lục cuối sách cho dữ liệu văn bản: token, postings list, và vì sao BM25 là điểm relevance mặc định.",
    },
    {
      slug: "search-engine-sync-opensearch",
      title: "Search engine & đồng bộ dữ liệu",
      minutes: 45,
      summary: "OpenSearch là chi nhánh thư viện tra cứu nhanh, luôn 'sao chép sau' kho sách chính — đồng bộ bằng outbox, không phải dual write.",
    },
  ],
  labs: [
    {
      id: "minio-presigned-multipart-upload",
      title: "MinIO: upload file 200MB bằng presigned URL + multipart",
      description:
        "Thêm MinIO (S3-compatible) vào sd-playground, sinh presigned URL từ app, upload file lớn qua multipart trực tiếp từ client, lưu metadata ở Postgres.",
      steps: [
        "Thêm service `minio` (image `minio/minio`, command `server /data --console-address \":9001\"`, port `9000:9000` và `9001:9001`) vào `docker-compose.yml`; `docker compose up -d minio` rồi tạo bucket: `mc alias set local http://localhost:9000 minioadmin minioadmin && mc mb local/uploads`",
        "Cài `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner` trong app; viết `POST /uploads/presign` trả presigned PUT URL (client `forcePathStyle: true`, expiry 5 phút) cho object key `uploads/<uuid>-<filename>`",
        "Tạo file test 200MB: `dd if=/dev/urandom of=big.bin bs=1M count=200`; PUT thẳng bằng `curl -T big.bin \"<presigned-url>\"` — không đi qua app; kiểm tra `mc ls local/uploads` thấy đúng kích thước",
        "Chuyển sang multipart cho file này: dùng `@aws-sdk/lib-storage` (`Upload`, part size 8MB) hoặc tự gọi `CreateMultipartUpload` → nhiều `UploadPart` → `CompleteMultipartUpload`; log số phần và `ETag` từng phần",
        "Giữa lúc upload phần thứ 10, ngắt kết nối (Ctrl+C tiến trình con hoặc `docker compose exec toxiproxy toxiproxy-cli toxic add ...` thêm timeout); retry lại đúng phần đó (không upload lại từ đầu) rồi complete; xác nhận file toàn vẹn bằng `md5sum big.bin` so với `mc cat local/uploads/... | md5sum`",
        "Sau khi client gọi `POST /uploads/complete` (kèm object key), app ghi metadata (`key, size, status='uploaded', created_at`) vào Postgres — chứng minh app server chưa từng cầm một byte nào của file",
      ],
    },
    {
      id: "build-inverted-index-vs-postgres-tsvector",
      title: "Tự build inverted index cho 10k bài viết & so sánh Postgres tsvector",
      description: "Viết inverted index nhỏ bằng TypeScript, đo tốc độ tra cứu, rồi so sánh với `tsvector`/GIN index của Postgres trên cùng dữ liệu.",
      steps: [
        "Seed bảng `articles(id, title, body)` với 10.000 dòng dữ liệu mẫu bằng script TypeScript hoặc `COPY articles FROM '/data/articles.csv' CSV HEADER`",
        "Viết script tokenize (lowercase, bỏ dấu câu, bỏ stopword tiếng Anh cơ bản) và build `Map<string, Set<number>>` (token → set articleId) trong bộ nhớ; đo thời gian build và số token duy nhất",
        "Viết hàm tra cứu AND nhiều từ bằng cách giao (intersection) các postings list tương ứng; đo thời gian truy vấn trên toàn bộ 10.000 bài",
        "Thêm cột `search_vector tsvector`, index `CREATE INDEX articles_search_idx ON articles USING GIN (search_vector)`, rồi `UPDATE articles SET search_vector = to_tsvector('english', title || ' ' || body)`",
        "So sánh bằng `EXPLAIN ANALYZE SELECT id FROM articles WHERE search_vector @@ to_tsquery('english', 'kubernetes & scaling')` với kết quả từ index tự viết; ghi lại thời gian mỗi cách và dòng `Bitmap Heap Scan` dùng GIN index",
        "Ghi nhận trong báo cáo: index tự viết không có ranking, không cập nhật incremental theo từng dòng, không bền (mất khi restart process) — trong khi GIN index giải quyết cả ba nhưng vẫn giới hạn ở scale vừa phải so với search engine chuyên dụng",
      ],
    },
    {
      id: "sync-products-to-opensearch-via-outbox",
      title: "Đồng bộ bảng products sang OpenSearch qua outbox",
      description: "Tái dùng bảng `outbox` và relay từ SD07 để đồng bộ `products` sang OpenSearch, đo độ trễ và chứng minh không mất cập nhật khi relay crash.",
      steps: [
        "Thêm service `opensearch` (image `opensearchproject/opensearch`, biến môi trường `discovery.type=single-node` và `plugins.security.disabled=true` — chỉ dùng cho lab local, không dùng cấu hình này ngoài đời) vào `docker-compose.yml`; `docker compose up -d opensearch` rồi `curl localhost:9200` kiểm tra cluster lên",
        "Tạo index `products` với mapping tối thiểu: `curl -X PUT localhost:9200/products -H 'content-type: application/json' -d '{\"mappings\":{\"properties\":{\"name\":{\"type\":\"text\"},\"price\":{\"type\":\"float\"},\"updated_at\":{\"type\":\"date\"}}}}'`",
        "Tái dùng bảng `outbox(id, aggregate_id, type, payload, created_at, published_at)` từ SD07: khi `UPDATE products SET price = ...`, ghi thêm `INSERT INTO outbox (aggregate_id, type, payload) VALUES (...)` trong cùng transaction",
        "Mở rộng relay: với event `type = 'ProductUpdated'`, thay vì chỉ gửi Redpanda, gọi thêm `PUT /products/_doc/<aggregate_id>` lên OpenSearch (upsert theo id — idempotent nếu gọi lại)",
        "Sửa giá 1 sản phẩm qua API; poll `GET /products/_search?q=name:<tên sản phẩm>` mỗi 100ms và ghi lại số ms từ lúc `COMMIT` Postgres tới khi search trả giá mới",
        "Kill relay (`docker compose kill relay`) giữa lúc sửa 5 sản phẩm liên tiếp, bật lại (`docker compose up -d relay`); xác nhận OpenSearch cuối cùng khớp Postgres cho cả 5 sản phẩm nhờ outbox at-least-once + upsert theo id",
      ],
    },
  ],
  deliverable:
    "Repo sd-playground có thêm MinIO (presigned URL + multipart upload đã kiểm chứng bằng md5sum) và OpenSearch đồng bộ từ `products` qua outbox/relay tái dùng từ SD07, kèm design doc ngắn (Phụ lục A) với bảng trade-off: block/file/object storage, upload qua app vs presigned URL, Postgres tsvector vs search engine chuyên dụng, dual write vs outbox cho search sync.",
  successCriteria:
    "App server không bao giờ phải 'cầm' nội dung file upload (chứng minh bằng log/network không có body file đi qua app); giải thích được độ trễ đồng bộ search bằng số đo thật (ms từ commit tới khi search thấy) thay vì đoán.",
  resources: [
    {
      title: "AWS S3 User Guide — Uploading and copying objects using presigned URLs",
      url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html",
      kind: "doc",
    },
    {
      title: "AWS S3 User Guide — Multipart upload overview",
      url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html",
      kind: "doc",
    },
    {
      title: "AWS S3 User Guide — Using Amazon S3 storage classes",
      url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html",
      kind: "doc",
    },
    {
      title: "AWS — Amazon S3 strong consistency",
      url: "https://aws.amazon.com/s3/consistency/",
      kind: "doc",
    },
    {
      title: "MinIO Object Storage documentation",
      url: "https://min.io/docs/minio/linux/index.html",
      kind: "doc",
    },
    {
      title: "OpenSearch documentation",
      url: "https://opensearch.org/docs/latest/",
      kind: "doc",
    },
    {
      title: "PostgreSQL documentation — Full Text Search",
      url: "https://www.postgresql.org/docs/current/textsearch.html",
      kind: "doc",
    },
  ],
  quiz: [
    {
      id: "choose-storage-tier",
      question:
        "App cần một ổ đĩa gắn riêng cho instance Postgres primary, đòi hỏi latency thấp và IOPS cao, không cần chia sẻ cho instance khác. Loại storage nào phù hợp nhất?",
      options: [
        "Object storage (S3) mount qua FUSE",
        "File storage chia sẻ (NFS/EFS) gắn cho nhiều instance",
        "Block storage (kiểu EBS) gắn riêng cho instance đó",
        "Ghi thẳng dữ liệu dạng blob vào một bảng khác trong chính Postgres",
      ],
      answerIndex: 2,
      explanation:
        "Giống thuê hẳn một phòng riêng trong nhà mình: block storage là ổ cứng ảo gắn riêng cho một máy, latency thấp, phù hợp filesystem của database. Object storage không hỗ trợ random write/IOPS kiểu ổ đĩa; file storage chia sẻ thêm overhead network cho thứ vốn không cần chia sẻ.",
    },
    {
      id: "presigned-url-scope",
      question:
        "Endpoint sinh presigned URL cho phép PUT vào bucket, hết hạn sau 24 giờ, không giới hạn `Content-Length` hay `key` cụ thể ngoài prefix `uploads/`. Rủi ro lớn nhất là gì?",
      options: [
        "Không có rủi ro — presigned URL luôn an toàn vì có chữ ký",
        "URL còn hiệu lực rất lâu và không giới hạn kích thước, ai có URL đó có thể ghi đè/nạp file khổng lồ trong 24 giờ",
        "Presigned URL không dùng được cho PUT, chỉ dùng được cho GET",
        "MinIO/S3 tự động từ chối mọi presigned URL quá 1 giờ",
      ],
      answerIndex: 1,
      explanation:
        "Vé vào kho càng lâu hết hạn và càng ít ràng buộc thì càng dễ bị lộ và lạm dụng. Nên đặt expiry ngắn (vài phút), ký kèm điều kiện `content-length-range` và `key` cụ thể — presigned URL chỉ cấp đúng quyền cho đúng thao tác đã ký, không tự giới hạn nếu người tạo không khai báo.",
    },
    {
      id: "multipart-min-part-size",
      question: "Một multipart upload có 3 part: 6 MiB, 6 MiB, 2 MiB (part cuối). Theo giới hạn của S3, upload này có hợp lệ không?",
      options: [
        "Hợp lệ — mọi part đều ≥ 5 MiB trừ part cuối cùng, và part cuối được phép nhỏ hơn",
        "Không hợp lệ — tất cả các part kể cả part cuối đều phải ≥ 5 MiB",
        "Không hợp lệ — part đầu phải bằng đúng 5 MiB",
        "Không xác định được nếu không biết tổng dung lượng file",
      ],
      answerIndex: 0,
      explanation:
        "Giống chuyển nhà chia thùng: mọi thùng (part) phải đủ lớn (tối thiểu 5 MiB) để không sinh ra quá nhiều thùng vụn, trừ thùng cuối cùng được phép nhỏ hơn vì nó chỉ chứa phần dư. Giới hạn khác cần nhớ: tối đa 10.000 part cho một multipart upload.",
    },
    {
      id: "multipart-part-count-limit",
      question: "File 100 GB cần upload multipart với giới hạn tối đa 10.000 part. Part size tối thiểu cần chọn để không vượt giới hạn này là khoảng bao nhiêu?",
      options: [
        "5 MiB là đủ trong mọi trường hợp vì đó là mức tối thiểu",
        "Khoảng 10 MiB mỗi part (100 GB / 10.000 ≈ 10 MiB) trở lên",
        "Không quan trọng, cứ để part size mặc định của SDK",
        "Phải giảm xuống dưới 10.000 file riêng biệt rồi upload từng file",
      ],
      answerIndex: 1,
      explanation:
        "100 GB ⇒ 102.400 MiB, chia cho tối đa 10.000 part ⇒ mỗi part cần ít nhất ~10,24 MiB (làm tròn lên, thường chọn 16 MiB hoặc lớn hơn cho an toàn). Chọn part size cố định 5 MiB cho file rất lớn sẽ vượt quá 10.000 part và bị từ chối.",
    },
    {
      id: "s3-read-after-write",
      question:
        "Client PUT một object mới lên S3 thành công, ngay lập tức GET lại đúng key đó từ một client khác ở region khác. Theo mô hình consistency hiện tại của S3, điều gì đúng?",
      options: [
        "Luôn có thể nhận 404 hoặc bản cũ trong vài giây tới vài phút, không có gì đảm bảo",
        "S3 cung cấp read-after-write consistency mạnh cho PUT/DELETE trên mọi object — GET ngay sau đó thấy dữ liệu mới (theo tài liệu AWS hiện tại; luôn kiểm tra tài liệu mới nhất và không dựa vào hành vi này cho storage S3-compatible khác như MinIO nếu chưa xác nhận)",
        "Chỉ đúng nếu bật Cross-Region Replication",
        "Chỉ đúng với object nhỏ hơn 5 MB",
      ],
      answerIndex: 1,
      explanation:
        "Đây là thay đổi quan trọng AWS công bố cuối 2020: S3 chuyển sang strong read-after-write consistency cho mọi PUT/DELETE. Trước đó có eventual consistency ở vài trường hợp overwrite. Vẫn nên hedge: đây là hành vi của S3, không tự động đúng với mọi hệ thống S3-compatible khác.",
    },
    {
      id: "why-not-through-app-server",
      question: "Vì sao nên tránh cho client upload file qua app server (client → app → object storage) thay vì presigned URL trực tiếp?",
      options: [
        "Vì object storage không chấp nhận request có origin là app server",
        "Vì app server không hỗ trợ nhận file nhị phân",
        "Vì băng thông bị nhân đôi (nhận rồi lại gửi tiếp) và app server trở thành bottleneck/single point of failure cho việc upload",
        "Vì presigned URL rẻ hơn tính phí theo request",
      ],
      answerIndex: 2,
      explanation:
        "Giống bắt nhân viên quầy bê từng kiện hàng vào kho giùm khách: quầy (app) tốn gấp đôi công (nhận từ khách rồi mang vào kho) và nghẽn khi đông khách. Presigned URL để khách tự đi thẳng vào kho, quầy chỉ ký vé — app chỉ xử lý metadata nhỏ.",
    },
    {
      id: "tokenization-affects-search",
      question:
        "Tài liệu chứa câu 'The Runners are running fast.' Nếu pipeline tokenize chỉ lowercase + tách từ, KHÔNG stemming, người dùng tìm 'run' sẽ KHÔNG khớp với từ nào trong câu trên. Vì sao?",
      options: [
        "Vì stopword removal đã xoá mất từ 'run'",
        "Vì inverted index chỉ lưu 5 ký tự đầu của mỗi token",
        "Vì token lưu trong index là 'runners' và 'running' (nguyên dạng), không phải gốc từ 'run' — thiếu bước stemming/lemmatization",
        "Vì BM25 luôn loại các từ xuất hiện dưới 2 lần",
      ],
      answerIndex: 2,
      explanation:
        "Mục lục chỉ ghi đúng chữ đã xuất hiện. Không stemming thì 'runners' và 'running' là hai token khác 'run' hoàn toàn trong postings list. Thêm bước stemming/lemmatization để quy các biến thể về cùng gốc mới khớp được.",
    },
    {
      id: "bm25-default-similarity",
      question: "Trong Elasticsearch/OpenSearch hiện tại, thuật toán tính điểm relevance mặc định cho full-text query là gì?",
      options: [
        "TF-IDF thuần tuý, không có normalization",
        "BM25 — biến thể có bão hoà term frequency và chuẩn hoá theo độ dài field (tham số cụ thể tuỳ phiên bản, nên kiểm tra tài liệu mới nhất)",
        "Cosine similarity trên vector nhúng (embedding) cho mọi query",
        "Đếm số lần xuất hiện tuyệt đối, từ nào xuất hiện nhiều nhất đứng đầu",
      ],
      answerIndex: 1,
      explanation:
        "BM25 là similarity mặc định của các phiên bản Elasticsearch/OpenSearch phổ biến hiện nay, cải tiến so với TF-IDF thuần bằng cách bão hoà ảnh hưởng của term frequency và chuẩn hoá theo độ dài tài liệu. Tham số như k1, b có thể khác theo cấu hình/phiên bản — không nên thuộc lòng một con số cố định.",
    },
    {
      id: "tsvector-vs-dedicated-engine",
      question:
        "App có 200.000 bài viết, cần full-text search có highlight, facet theo tag, gợi ý sửa lỗi chính tả (fuzzy), và không muốn vận hành thêm hệ thống mới. Lựa chọn hợp lý nhất ở giai đoạn này là gì?",
      options: [
        "Bắt buộc phải dùng OpenSearch ngay vì Postgres không bao giờ làm được full-text search",
        "Postgres `tsvector` + GIN index — đủ cho quy mô này và không cần vận hành thêm hệ thống; chuyển sang OpenSearch/Elasticsearch khi thực sự cần facet phức tạp, fuzzy matching mạnh hoặc scale vượt khả năng một Postgres instance",
        "Dùng `LIKE '%keyword%'` vì đơn giản nhất",
        "Lưu toàn bộ bài viết vào Redis và scan tuần tự khi tìm kiếm",
      ],
      answerIndex: 1,
      explanation:
        "200.000 bài viết chưa phải quy mô cần một cluster search riêng. `tsvector`/GIN cho kết quả tốt, ít vận hành, và dữ liệu luôn nhất quán với bảng gốc vì cùng một database. Khi cần fuzzy search mạnh, facet phức tạp hoặc hàng chục triệu document, cái giá vận hành thêm OpenSearch mới đáng.",
    },
    {
      id: "search-sync-dual-write-vs-outbox",
      question:
        "Team viết `await db.query('UPDATE products ...'); await opensearchClient.index(...)` để đồng bộ search. Sau một thời gian, vài sản phẩm hiển thị giá cũ trên kết quả tìm kiếm dù DB đã đúng. Cách sửa chuẩn theo bài học SD07/SD08 là gì?",
      options: [
        "Tăng timeout của OpenSearch client cho chắc",
        "Đây là dual-write problem giống hệt SD07: hai lệnh ghi không chung transaction, crash/lỗi giữa chừng làm chúng lệch nhau — sửa bằng outbox (ghi event trong cùng transaction Postgres) rồi relay upsert vào OpenSearch theo id (idempotent)",
        "Không có gì để sửa, đây là hành vi bình thường và chấp nhận được vĩnh viễn",
        "Chuyển toàn bộ dữ liệu products sang lưu trực tiếp trong OpenSearch, bỏ Postgres",
      ],
      answerIndex: 1,
      explanation:
        "OpenSearch là chi nhánh tra cứu, Postgres là kho sách chính. Ghi hai nơi không chung transaction (dual write) thì một nơi có thể 'quên cập nhật' khi lỗi giữa chừng. Outbox + relay (tái dùng từ SD07) đảm bảo at-least-once, và upsert theo id vào OpenSearch làm việc gửi lại vô hại (idempotent) — đồng thời chấp nhận eventual consistency: search luôn có độ trễ vài trăm ms tới vài giây sau DB.",
    },
  ],
};
