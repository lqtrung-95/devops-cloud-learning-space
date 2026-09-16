import type { ModuleDefinition } from "@/content/content-types";

export const sd17CaseVideoStreamingFileSyncModule: ModuleDefinition = {
  id: "sd17",
  slug: "sd17-case-video-streaming-file-sync",
  phaseId: "sd-phase-4",
  order: 17,
  weeks: "Tuần 21",
  title: "Case: Video streaming & file sync",
  emoji: "🎬",
  eli5Summary:
    "Video streaming giống một rạp chiếu phim thông minh: phim được cắt sẵn thành nhiều đoạn ngắn ở nhiều 'độ nét' khác nhau, và máy chiếu tự đổi độ nét theo tốc độ đường dây của từng khán giả mà không ai phải dừng phim. File sync (Dropbox) giống hai người cùng giữ một cuốn sổ tay chung ở hai thành phố: thay vì chép lại cả cuốn mỗi lần sửa, chỉ gửi đúng trang đã đổi — và phải có cách xử lý khi cả hai cùng sửa một trang lúc mất liên lạc.",
  objectives: [
    "Thiết kế luồng upload video lớn + transcoding pipeline dạng job queue sinh nhiều rendition, tái dùng presigned upload (SD08) và pattern job-queue/DAG (SD07)",
    "Giải thích HLS/DASH đóng gói video thành segment nhỏ ở nhiều bitrate kèm manifest, và vì sao player chỉ đổi rendition tại ranh giới segment chứ không đổi giữa chừng",
    "Ước lượng storage/băng thông cho một dịch vụ video quy mô lớn và giải thích CDN + cache video giúp giảm tải origin thế nào",
    "Cài đặt và giải thích content-defined chunking (rolling hash) so với fixed-size chunking, và vì sao CDC giới hạn phạm vi chunk phải re-upload khi sửa file",
    "Thiết kế metadata service theo dõi hash từng chunk theo version của file, và chọn chiến lược phát hiện + giải quyết xung đột (last-writer-wins + conflicted copy, hoặc vector clock) kèm lý do đánh đổi",
    "Viết design doc hoàn chỉnh theo template chuẩn (Phụ lục A) cho một hệ thống dữ liệu lớn — YouTube-like hoặc Dropbox-like",
  ],
  lessons: [
    {
      slug: "video-upload-transcoding-pipeline",
      title: "Video case: upload & transcoding pipeline",
      minutes: 50,
      summary:
        "Yêu cầu, ước lượng và data model cho một dịch vụ video: upload resumable đi thẳng vào object storage, rồi một hàng đợi job transcode ra nhiều rendition.",
    },
    {
      slug: "adaptive-bitrate-streaming-cdn",
      title: "Video case: adaptive bitrate streaming & CDN",
      minutes: 45,
      summary:
        "HLS/DASH cắt video thành segment nhiều bitrate kèm manifest; player tự đổi độ nét theo băng thông đo được, và CDN gánh phần lớn lưu lượng thay origin.",
    },
    {
      slug: "file-sync-chunking-dedup",
      title: "File sync case: chunking & dedup",
      minutes: 50,
      summary:
        "Yêu cầu và data model cho Dropbox-like: chia file thành chunk theo nội dung (content-defined) thay vì theo vị trí cố định để dedup và delta sync hiệu quả.",
    },
    {
      slug: "sync-metadata-conflict-resolution",
      title: "File sync case: metadata & conflict resolution",
      minutes: 45,
      summary:
        "Metadata service theo dõi version & hash từng chunk, notify thiết bị khác qua long polling/WebSocket, và xử lý xung đột khi hai thiết bị sửa cùng lúc.",
    },
  ],
  labs: [
    {
      id: "hls-transcode-abr-network-throttle",
      title: "Dùng ffmpeg tạo HLS đa bitrate và xem ABR đổi chất lượng khi mạng chậm",
      description:
        "Transcode 1 video mẫu thành HLS 3 bitrate bằng ffmpeg trong sd-playground, phát qua nginx, rồi giả lập mạng chậm để quan sát player tự đổi rendition tại ranh giới segment.",
      steps: [
        "Tải/copy 1 file `sample.mp4` (~1–2 phút, có sẵn hoặc dùng `ffmpeg -f lavfi -i testsrc=duration=60:size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:duration=60 sample.mp4` để tự sinh) vào thư mục `media/` của `sd-playground`",
        "Chạy `ffmpeg` trong container `app` (hoặc container `ffmpeg` riêng) để tạo 3 rendition H.264 cùng lúc bằng `-var_stream_map`: `ffmpeg -i sample.mp4 -filter_complex \"[0:v]split=3[v1][v2][v3]; [v1]scale=w=640:h=360[v1out]; [v2]scale=w=960:h=540[v2out]; [v3]scale=w=1280:h=720[v3out]\" -map \"[v1out]\" -b:v:0 800k -map \"[v2out]\" -b:v:1 1400k -map \"[v3out]\" -b:v:2 2800k -map 0:a -b:a 128k -var_stream_map \"v:0,a:0 v:1,a:1 v:2,a:2\" -f hls -hls_time 6 -hls_playlist_type vod -master_pl_name master.m3u8 -hls_segment_filename \"media/hls/v%v/segment%03d.ts\" media/hls/v%v/prog.m3u8`",
        "Kiểm tra output: `cat media/hls/master.m3u8` phải liệt kê 3 dòng `#EXT-X-STREAM-INF` (một cho mỗi `BANDWIDTH`/`RESOLUTION`); `ls media/hls/v0/` phải có nhiều file `segment0XX.ts` dài khoảng 6 giây mỗi file",
        "Copy `media/hls/` vào bucket MinIO (từ SD08) hoặc phục vụ thẳng qua nginx bằng volume mount tĩnh; mở `master.m3u8` bằng một HTML player HLS.js đơn giản (`<script src=\"https://cdn.jsdelivr.net/npm/hls.js@latest\"></script>`) trỏ `hls.loadSource(\"http://localhost:8080/hls/master.m3u8\")`",
        "Mở DevTools → Network → chọn `Slow 3G` (hoặc dùng Toxiproxy giới hạn băng thông container nginx), phát video từ đầu; quan sát tab Network thấy các request `.ts` liên tiếp đổi từ `v2/segment...` (rendition cao) xuống `v0/segment...` (rendition thấp) — ghi lại đúng lúc đổi luôn rơi vào ranh giới giữa hai file segment, không bao giờ giữa chừng một file",
        "Tắt throttle, đợi buffer đầy rồi bật lại `Fast 3G`; ghi vào báo cáo: số lần đổi rendition, độ trễ từ lúc mạng chậm tới lúc player đổi xuống rendition thấp hơn (phụ thuộc buffer/ABR heuristic của HLS.js, không có con số cố định)",
      ],
    },
    {
      id: "content-defined-chunker-dedup-ratio",
      title: "Viết content-defined chunker bằng TypeScript, đo tỉ lệ dedup sau khi sửa file",
      description:
        "Cài một rolling-hash chunker đơn giản kiểu Rabin fingerprint, so sánh với chunker cố định kích thước trên cùng một file trước/sau khi chèn dữ liệu ở giữa.",
      steps: [
        "Tạo file test ~2MB văn bản lặp lại có cấu trúc thật (ví dụ nối nhiều đoạn log mẫu): `node -e \"process.stdout.write('line '.repeat(1) )\" > /dev/null` — thực tế dùng script Node ghi 40.000 dòng log ngẫu nhiên nhẹ vào `original.log`",
        "Viết `fixedChunker(buffer, size=8192)`: cắt buffer thành từng đoạn 8KB liên tiếp, trả về mảng `{ hash: sha256(chunk), length }`",
        "Viết `cdcChunker(buffer, { min=2048, max=65536, mask })`: trượt cửa sổ (ví dụ 48 byte) qua buffer, tính rolling hash (dùng thư viện `crypto` băm cửa sổ trượt hoặc polynomial hash tự viết đơn giản), cắt boundary khi `hash & mask === 0` và đã đi qua `min` byte kể từ chunk trước, ép cắt cứng nếu chạm `max`",
        "Chạy cả 2 chunker trên `original.log`, lưu tập hợp `Set<hash>` của từng cách; ghi số lượng chunk và tổng dung lượng mỗi cách",
        "Chèn 1 đoạn text ngắn (~50 byte) vào khoảng giữa file tạo `edited.log`; chạy lại cả 2 chunker trên `edited.log`",
        "Tính dedup ratio = số chunk của `edited.log` đã có hash trùng trong `Set` của `original.log` / tổng số chunk của `edited.log`; so sánh 2 cách — cách cố định phải cho dedup ratio thấp hẳn (gần 0% chunk sau điểm chèn còn khớp) so với content-defined (phần lớn chunk sau điểm chèn vẫn khớp)",
      ],
    },
    {
      id: "design-doc-youtube-or-dropbox",
      title: "Design doc: YouTube-like hoặc Dropbox-like (chọn 1, làm trong 45–60 phút bấm giờ)",
      description:
        "Viết design doc đầy đủ theo template Phụ lục A cho một trong hai hệ thống, tự bấm giờ trước khi đọc lại bài học, rồi bổ sung phần còn thiếu.",
      steps: [
        "Chọn 1 hệ thống: YouTube-like (upload, transcode, xem video) hoặc Dropbox-like (sync file nhiều thiết bị); bấm giờ 45–60 phút, viết một mạch không tra lại lesson",
        "Mục 1–2 (Requirements & Ước lượng): liệt kê functional/non-functional có số cụ thể (ví dụ YouTube: X video upload/ngày, storage 5 năm ở nhiều rendition; Dropbox: X user, trung bình bao nhiêu file/thiết bị, tần suất sync)",
        "Mục 3–4 (API & Data model): định nghĩa API chính (`POST /videos/upload-init`, `GET /files/:id/chunks`, …) và bảng/loại dữ liệu chính (video/rendition/manifest hoặc file/chunk/version)",
        "Mục 5–6 (High-level design & Deep dive): vẽ sơ đồ luồng chính (ASCII hoặc mô tả từng thành phần) và đào sâu 2 điểm khó nhất của hệ thống đã chọn (ví dụ transcoding DAG + CDN, hoặc CDC chunking + conflict resolution)",
        "Mục 7–8 (Trade-off & bottleneck): điền bảng `Quyết định | Chọn | Bỏ | Vì sao | Khi nào đổi ý` cho ít nhất 3 quyết định, và liệt kê điểm nghẽn khi scale 10× lưu lượng hiện tại",
        "Đọc lại lesson tương ứng, bổ sung/sửa những chỗ còn thiếu hoặc sai bằng màu đánh dấu khác — giữ lại bản gốc bấm giờ để so sánh tiến bộ",
      ],
    },
  ],
  deliverable:
    "sd-playground có video mẫu đã transcode HLS 3 bitrate phát được qua player thật (đổi rendition quan sát được khi throttle mạng), một content-defined chunker TypeScript có số đo dedup ratio so với fixed-size chunker, và 1 design doc đầy đủ (Phụ lục A) cho YouTube-like hoặc Dropbox-like kèm bảng trade-off.",
  successCriteria:
    "Giải thích được vì sao HLS/DASH chỉ đổi rendition tại ranh giới segment; chứng minh bằng số đo thật rằng content-defined chunking giữ được phần lớn chunk cũ sau khi chèn dữ liệu giữa file, trong khi fixed-size chunking làm hỏng gần như toàn bộ chunk từ điểm chèn trở đi.",
  resources: [
    {
      title: "Apple — HTTP Live Streaming (HLS) Authoring Specification",
      url: "https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices",
      kind: "doc",
    },
    {
      title: "FFmpeg documentation — HLS muxer & streaming",
      url: "https://ffmpeg.org/ffmpeg-formats.html#hls-2",
      kind: "doc",
    },
    {
      title: "FFmpeg documentation (chính, mọi filter/option)",
      url: "https://ffmpeg.org/documentation.html",
      kind: "doc",
    },
    {
      title: "Dropbox Tech Blog — kỹ thuật vận hành & hạ tầng sync/storage",
      url: "https://dropbox.tech/",
      kind: "doc",
    },
    {
      title: "The System Design Primer (GitHub — donnemartin)",
      url: "https://github.com/donnemartin/system-design-primer",
      kind: "doc",
    },
    {
      title: "System Design Interview Vol. 1 & 2 (Alex Xu) — chương YouTube & Google Drive/Dropbox",
      url: "https://www.amazon.com/dp/1736049119",
      kind: "book",
    },
  ],
  quiz: [
    {
      id: "video-upload-app-server-role",
      question:
        "Người dùng upload video 3GB. Team muốn app server không bao giờ phải nhận nguyên bytes của video. Nên thiết kế endpoint upload thế nào, dựa trên pattern đã học ở SD08?",
      options: [
        "App server nhận toàn bộ file qua `multipart/form-data` rồi tự forward sang object storage",
        "Client xin presigned URL (hoặc presigned multipart) từ app, rồi PUT/UploadPart thẳng lên object storage; app chỉ nhận metadata và sự kiện hoàn tất để enqueue job transcode",
        "Lưu trực tiếp video vào một cột `bytea` trong Postgres",
        "Không cần app server tham gia gì cả, object storage tự biết khi nào cần transcode",
      ],
      answerIndex: 1,
      explanation:
        "Giống bài học SD08: app không cầm bytes. Video lớn càng cần presigned multipart để chịu lỗi mạng tốt (retry từng part). App chỉ xử lý metadata nhỏ và, sau khi nhận sự kiện 'upload xong', đẩy job transcode vào hàng đợi.",
    },
    {
      id: "transcoding-pipeline-as-queue-job",
      question:
        "Sau khi video upload xong, hệ thống cần tạo 4 rendition (240p/480p/720p/1080p) và 1 sprite thumbnail. Cách tổ chức nào hợp lý nhất, tái dùng bài học SD07?",
      options: [
        "App server transcode đồng bộ ngay trong request upload, trả kết quả khi xong",
        "Enqueue 1 job 'transcode video X' vào message queue; worker pool pull job, chạy ffmpeg sinh từng rendition (có thể song song từng rendition như các job con), cập nhật trạng thái khi mỗi rendition xong",
        "Chạy cron job mỗi giờ quét toàn bộ video chưa transcode",
        "Yêu cầu client tự transcode trước khi upload",
      ],
      answerIndex: 1,
      explanation:
        "Transcode là việc nặng CPU, thời gian không cố định — không thể chạy đồng bộ trong request HTTP (giống bài học 'transcoding-as-queue-job' ở SD07: việc nặng, không cần kết quả ngay, đẩy vào queue cho worker pool xử lý, có thể scale worker độc lập với API).",
    },
    {
      id: "hls-segment-switch-boundary",
      question:
        "Player đang phát segment thứ 5 ở rendition 1080p. Giữa lúc phát segment đó, băng thông đo được giảm mạnh. Player sẽ làm gì theo cơ chế HLS/DASH chuẩn?",
      options: [
        "Ngắt giữa segment 5 ngay lập tức, chuyển sang tải phần còn lại của segment 5 ở rendition thấp hơn",
        "Phát hết segment 5 ở 1080p (đã tải), rồi tải segment 6 ở rendition thấp hơn phù hợp băng thông mới — chuyển đổi chỉ xảy ra tại ranh giới segment",
        "Dừng phát hoàn toàn cho tới khi băng thông phục hồi",
        "Luôn tải lại từ segment 1 ở rendition thấp nhất để an toàn",
      ],
      answerIndex: 1,
      explanation:
        "Mỗi segment là một file media độc lập, không thể 'cắt ngang'. ABR heuristic của player chỉ quyết định rendition cho segment TIẾP THEO dựa trên băng thông/buffer đo được — đây là điểm hay bị hiểu sai: đổi chất lượng luôn ở ranh giới segment, không bao giờ giữa chừng.",
    },
    {
      id: "cdn-role-video-scale",
      question:
        "Dịch vụ video có 50 triệu lượt xem/ngày trên vài nghìn video phổ biến. Vì sao gần như bắt buộc phải có CDN phía trước object storage gốc (origin)?",
      options: [
        "Vì object storage không hỗ trợ HTTP GET cho file public",
        "Vì CDN nén video tốt hơn origin nên dung lượng nhỏ hơn",
        "Vì phần lớn lượt xem lặp lại trên cùng một tập video phổ biến (hot content) — để CDN cache gần người xem giảm mạnh tải & chi phí băng thông ra khỏi origin, đồng thời giảm latency do gần người dùng hơn",
        "Vì origin object storage chỉ lưu được tối đa vài nghìn file",
      ],
      answerIndex: 2,
      explanation:
        "Video có access pattern lệch mạnh về vài nội dung hot (long tail). CDN cache segment ở edge gần người xem: giảm băng thông/chi phí egress ở origin và giảm round-trip latency. Đây là lý do gần như mọi dịch vụ video quy mô lớn đều đặt CDN trước origin storage.",
    },
    {
      id: "cdc-vs-fixed-insert-byte",
      question:
        "Một file 10MB được chia chunk theo kích thước cố định 1MB (10 chunk). Người dùng chèn thêm 100 byte vào đầu file rồi lưu lại. Điều gì xảy ra với các chunk khi đồng bộ?",
      options: [
        "Chỉ chunk đầu tiên thay đổi, 9 chunk còn lại giữ nguyên hash, không cần upload lại",
        "Vì ranh giới chunk dựa trên VỊ TRÍ byte cố định, việc chèn 100 byte làm lệch toàn bộ nội dung từ điểm chèn trở đi — gần như cả 10 chunk đều có hash khác, phải upload lại gần hết dù nội dung thực chất chỉ đổi ở đầu file",
        "Không chunk nào thay đổi vì hệ thống tự phát hiện đây là chèn thêm, không phải sửa",
        "Chỉ chunk cuối cùng bị ảnh hưởng",
      ],
      answerIndex: 1,
      explanation:
        "Đây chính là nhược điểm cốt lõi của fixed-size chunking: ranh giới cắt theo offset byte tuyệt đối. Chèn dữ liệu ở đầu làm dịch toàn bộ byte phía sau sang vị trí mới, nên mọi cửa sổ 1MB tính từ đó đều chứa nội dung khác trước, hash đổi hết dù nội dung logic gần như không đổi.",
    },
    {
      id: "content-defined-chunking-mechanism",
      question: "Content-defined chunking (dùng rolling hash kiểu Rabin fingerprint) xác định ranh giới chunk dựa trên điều gì?",
      options: [
        "Dựa trên số byte cố định đã đọc được kể từ ranh giới trước (giống fixed-size)",
        "Dựa trên nội dung: trượt một cửa sổ nhỏ qua dữ liệu, tính rolling hash của cửa sổ, và cắt ranh giới tại các vị trí mà hash khớp một điều kiện (ví dụ vài bit thấp bằng 0) — ranh giới 'bám' theo nội dung xung quanh, không theo offset tuyệt đối",
        "Dựa trên loại file (đuôi mở rộng .txt, .mp4…)",
        "Dựa trên thời điểm file được tạo",
      ],
      answerIndex: 1,
      explanation:
        "Vì boundary được quyết định bởi nội dung cục bộ (giá trị của cửa sổ trượt) chứ không phải vị trí byte, khi dữ liệu bị chèn/xoá, các đoạn nội dung không đổi ở xa điểm sửa vẫn sinh ra đúng những ranh giới cũ — chỉ (các) chunk quanh điểm sửa bị ảnh hưởng.",
    },
    {
      id: "metadata-service-chunk-hash-purpose",
      question:
        "Metadata service của hệ thống sync lưu, với mỗi version của một file, danh sách hash các chunk tạo nên version đó. Lợi ích chính của thiết kế này là gì?",
      options: [
        "Chỉ để hiển thị lịch sử chỉnh sửa cho người dùng xem, không có tác dụng kỹ thuật khác",
        "Cho phép delta sync: khi file thay đổi, so hai danh sách hash để biết chunk nào mới (cần upload) và chunk nào đã có sẵn (dùng lại, kể cả từ file khác của cùng user nếu trùng nội dung — dedup)",
        "Giúp mã hoá file nhanh hơn",
        "Thay thế hoàn toàn cho object storage, không cần lưu chunk thật ở đâu nữa",
      ],
      answerIndex: 1,
      explanation:
        "So sánh tập hash cũ và mới cho biết chính xác chunk nào cần truyền lại (delta sync) và chunk nào tái sử dụng — đồng thời hash trùng giữa các file khác nhau (kể cả của user khác nếu hệ thống dedup toàn cục) cho phép loại bỏ lưu trữ trùng lặp.",
    },
    {
      id: "conflict-detection-condition",
      question:
        "Thiết bị A và B cùng đồng bộ file ở version v1. A offline sửa thành v2A. B (vẫn online) sửa thành v2B và đồng bộ lên server trước — server giờ ở v2B. A kết nối lại và cố đẩy v2A lên. Vì sao server phải coi đây là xung đột thay vì chấp nhận v2A đè lên?",
      options: [
        "Vì A luôn sai khi offline",
        "Vì base version mà A dùng để sửa (v1) không còn là version hiện tại trên server (đã là v2B) — hai bản sửa xuất phát từ cùng gốc nhưng đi hai hướng khác nhau (concurrent edit), nếu chấp nhận đè thì mất silently thay đổi của B",
        "Vì hệ thống luôn từ chối mọi upload từ thiết bị vừa mất kết nối",
        "Vì v2A và v2B chắc chắn có nội dung giống hệt nhau",
      ],
      answerIndex: 1,
      explanation:
        "Điều kiện phát hiện xung đột kinh điển: client gửi kèm version nó dựa vào để sửa (v1); nếu version đó không khớp version hiện tại trên server (đã tiến lên v2B), đây là hai nhánh sửa đồng thời (concurrent) từ cùng gốc — cần một chiến lược giải quyết rõ ràng thay vì ghi đè im lặng.",
    },
    {
      id: "lww-vs-conflicted-copy-tradeoff",
      question:
        "Giữa 'last-writer-wins thuần (ghi đè theo timestamp, không giữ bản thua)' và 'last-writer-wins + conflicted copy (giữ bản canonical theo timestamp, đồng thời lưu bản thua thành file riêng)', vì sao Dropbox-like thường chọn phương án thứ hai?",
      options: [
        "Vì phương án thứ hai không cần đồng hồ đồng bộ giữa các thiết bị",
        "Vì phương án thứ hai không tốn thêm storage",
        "Vì LWW thuần có thể làm MẤT VĨNH VIỄN thay đổi hợp lệ của thiết bị 'thua'; thêm conflicted copy giữ lại nội dung đó cho người dùng tự gộp thủ công — đánh đổi lấy thêm 1 file tạm và một chút phức tạp UX để đổi lấy không bao giờ mất dữ liệu do hệ thống tự quyết định sai",
        "Vì vector clock bắt buộc phải dùng chung với conflicted copy",
      ],
      answerIndex: 2,
      explanation:
        "LWW thuần đơn giản nhưng đánh đổi bằng rủi ro mất dữ liệu âm thầm — không chấp nhận được cho file người dùng. Thêm conflicted copy là một lựa chọn thực dụng: vẫn đơn giản hơn vector clock (không cần theo dõi causality đầy đủ) nhưng không bao giờ xoá mất bản sửa nào, đổi lại người dùng đôi khi phải tự gộp 2 file.",
    },
    {
      id: "notify-other-devices-change",
      question:
        "Sau khi thiết bị A sync xong một thay đổi lên server, cách nào hợp lý để các thiết bị B, C của cùng người dùng biết cần tải bản mới, mà không phải liên tục poll toàn bộ danh sách file mỗi giây?",
      options: [
        "B và C gọi `GET /files` đầy đủ mỗi giây để so sánh",
        "Server dùng long polling hoặc kết nối WebSocket đang mở với B, C để đẩy một sự kiện nhỏ ('file X có version mới') ngay khi có thay đổi; B/C nhận event rồi mới gọi API lấy đúng delta cần tải",
        "Không cần thông báo gì, B và C tự động có bản mới nhờ object storage đồng bộ toàn cục tức thời",
        "Bắt người dùng tự bấm nút 'refresh' trên từng thiết bị",
      ],
      answerIndex: 1,
      explanation:
        "Đây là bài toán push notification nhẹ, không phải truyền dữ liệu: long polling/WebSocket giữ kết nối chờ sẵn để server đẩy một event nhỏ ngay khi có thay đổi, tránh polling liên tục tốn tài nguyên (giống lựa chọn 'polling vs SSE vs WebSocket' đã học ở SD02, áp dụng lại cho bài toán notify sync).",
    },
  ],
};
