import type { ModuleDefinition } from "@/content/content-types";

export const b18ApiGatewayBackwardCompatibilityModule: ModuleDefinition = {
  id: "b18",
  slug: "b18-api-gateway-backward-compatibility",
  phaseId: "b-phase-4",
  order: 18,
  weeks: "Tuần 22",
  title: "API Gateway & backward compatibility",
  emoji: "🚪",
  eli5Summary:
    "Từ B03, `taskflow-api` đã luôn trả lời ở cửa `/api/v1` — quyết định đó giờ trả cổ tức: module này mở thêm cửa `/api/v2` bên cạnh, không đóng cửa cũ. Khách quen (client cũ) vẫn đi đúng cửa họ quen mà không nhận ra gì thay đổi; khách mới đi cửa mới thấy dữ liệu trình bày gọn hơn. `nginx` đứng ở sảnh làm bảo vệ: kiểm soát số người vào mỗi giây và chỉ đúng cửa — bảo vệ không tham gia vào việc bên trong văn phòng làm gì.",
  objectives: [
    "Giải thích vì sao URL-path versioning (`/api/v1`, `/api/v2`) được chọn từ B03 thay vì header/query-param versioning, và đánh đổi của từng cách",
    "Phân biệt chính xác breaking change (đổi kiểu field, xoá field) với non-breaking change (thêm field optional, thêm endpoint mới) — và biết khi nào PHẢI bump version, khi nào không cần",
    "Thêm `/api/v2/tasks` với `status` là object `{ value, label }`, giữ nguyên `/api/v1/tasks` với `status` là string — cả hai gọi chung một hàm service, chỉ khác serializer",
    "Thêm header `Deprecation`/`Sunset` cho toàn bộ response `v1` bằng Fastify hook có phạm vi (encapsulation), hiểu đúng ý nghĩa từng header và vì sao cần thời gian đệm giữa hai mốc đó",
    "Giải thích API Gateway chịu trách nhiệm gì ở biên hệ thống (routing, rate limit, một số việc chung như TLS) và vì sao logic nghiệp vụ tuyệt đối không nên rơi vào gateway",
    "Cấu hình `nginx` (đã có service từ B17) thành gateway tối giản: rate limit theo IP và route cả `/api/v1` lẫn `/api/v2` về cùng một upstream `api`",
  ],
  lessons: [
    {
      slug: "url-path-versioning-tu-b03-den-v2",
      title: "Versioning: vì sao chọn URL path từ B03",
      minutes: 35,
      summary:
        "So sánh URL-path, header và query-param versioning; ôn lại quyết định chốt ở B03 và lý do nó vẫn đúng bây giờ; phân biệt breaking vs non-breaking change qua ví dụ `status` đổi từ string sang object.",
    },
    {
      slug: "deprecation-va-sunset-header-cho-v1",
      title: "Deprecation & Sunset header cho v1",
      minutes: 35,
      summary:
        "Thêm header `Deprecation`/`Sunset` cho mọi response `v1` bằng Fastify hook có phạm vi (chỉ áp dụng plugin v1, không lan sang v2); vì sao khoảng cách giữa hai mốc phải đủ dài.",
    },
    {
      slug: "api-gateway-ranh-gioi-voi-business-logic",
      title: "API Gateway làm gì, và KHÔNG làm gì",
      minutes: 40,
      summary:
        "Ranh giới giữa trách nhiệm của gateway (routing, rate limit, auth passthrough) và logic nghiệp vụ phải nằm trong service; cấu hình `nginx` (đã có từ B17) thành gateway tối giản cho `v1`/`v2`.",
    },
  ],
  labs: [
    {
      id: "them-api-v2-tasks-giu-nguyen-v1",
      title: "Thêm `/api/v2/tasks` song song, giữ nguyên `/api/v1/tasks`",
      description:
        "Viết serializer riêng cho từng version, cả hai route gọi chung một hàm đọc dữ liệu từ `tasks` (không đổi tên bảng/cột theo mục 3 curriculum) — chỉ khác cách trình bày `status` ra JSON.",
      steps: [
        "Tạo `src/serializers/task-serializer.ts` export `serializeTaskV1(task)` (giữ nguyên `status` là string như từ B02/B03) và `serializeTaskV2(task)` (đổi `status` thành `{ value: task.status, label: STATUS_LABEL_VI[task.status] }` với `STATUS_LABEL_VI = { todo: \"Cần làm\", in_progress: \"Đang làm\", done: \"Xong\" }`)",
        "Kiểm tra `src/services/tasks-service.ts` (đã có từ B04) export `listTasksByProject(projectId)` trả về hàng thô từ Drizzle (`status` vẫn là string) — KHÔNG sửa hàm này, cả hai version phải gọi chung nó để đảm bảo cùng một nguồn dữ liệu",
        "Tạo `src/routes/v2/tasks.ts`: plugin Fastify đăng ký `GET /tasks` và `GET /tasks/:id`, gọi `listTasksByProject`/`getTaskById` (chung với v1), map kết quả qua `serializeTaskV2` trước khi trả về",
        "Trong `src/app.ts`, đăng ký thêm `fastify.register(tasksV2Routes, { prefix: \"/api/v2\" })` bên cạnh `fastify.register(tasksV1Routes, { prefix: \"/api/v1\" })` đã có — không sửa dòng đăng ký v1",
        "Viết test Vitest `tasks-versioning.test.ts`: tạo 1 task, gọi cả `GET /api/v1/tasks/:id` và `GET /api/v2/tasks/:id`, assert `v1.status` là string (`\"todo\"`) còn `v2.status` là object (`{ value: \"todo\", label: \"Cần làm\" }`) — cùng một `id`, cùng một task thật trong DB",
        "Chạy `pnpm test` xác nhận toàn bộ test B01–B17 vẫn xanh — thêm `/api/v2` không được sửa hành vi `/api/v1` dù chỉ một bit",
      ],
    },
    {
      id: "them-deprecation-sunset-header-cho-v1",
      title: "Thêm `Deprecation`/`Sunset` header cho mọi response v1",
      description:
        "Dùng tính chất encapsulation của Fastify plugin: hook đăng ký bên trong plugin `v1` chỉ áp dụng cho route của chính plugin đó, không rò sang `v2`.",
      steps: [
        "Tạo `src/plugins/v1-deprecation-headers.ts` export một Fastify plugin: `fastify.addHook(\"onSend\", async (request, reply, payload) => { reply.header(\"Deprecation\", \"Tue, 01 Sep 2026 00:00:00 GMT\"); reply.header(\"Sunset\", \"Mon, 01 Mar 2027 00:00:00 GMT\"); reply.header(\"Link\", '<https://docs.taskflow-api.example/migrating-to-v2>; rel=\"deprecation\"'); return payload; })`",
        "Trong `src/routes/v1/tasks.ts` (hoặc file plugin gốc bọc toàn bộ route v1), gọi `fastify.register(v1DeprecationHeaders)` TRƯỚC khi đăng ký các route — vì `onSend` đăng ký ở plugin cha sẽ áp dụng cho mọi route con nhờ encapsulation của Fastify, còn plugin `v2` (đăng ký riêng, không phải con của plugin v1) sẽ không bao giờ thấy hook này",
        "Gọi `curl -i localhost:3000/api/v1/tasks` xác nhận response có cả `Deprecation` và `Sunset` header; gọi `curl -i localhost:3000/api/v2/tasks` xác nhận KHÔNG có hai header đó",
        "Viết test Vitest assert `response.headers[\"deprecation\"]` và `response.headers[\"sunset\"]` tồn tại và đúng định dạng HTTP-date cho mọi route `v1` đã có (dùng `app.inject()` lặp qua danh sách route), và assert route `v2` không có header này",
        "Ghi vào `learnings.md`: mốc `Deprecation` (01/09/2026) cách mốc `Sunset` (01/03/2027) đúng 6 tháng — đây là khoảng đệm chủ đích, không phải ngẫu nhiên, để client cũ có đủ thời gian migrate",
      ],
    },
    {
      id: "cau-hinh-nginx-lam-gateway-toi-gian",
      title: "Cấu hình `nginx` thành gateway: rate limit + routing `v1`/`v2`",
      description:
        "`nginx` đã tồn tại từ B17 như reverse proxy trần (`ports: [\"8081:80\"]` trỏ vào `api:3000`) — lab này chỉ SỬA `nginx.conf` để thêm logic routing/rate-limit thật, không thêm service mới vào `docker-compose.yml`.",
      steps: [
        "Mở `nginx/nginx.conf` (đã có từ B17), thêm trong block `http {}`: `limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;` và `upstream api_upstream { server api:3000; }`",
        "Thay location trần của B17 bằng hai location cụ thể, cả hai cùng trỏ về `api_upstream`: `location /api/v1/ { limit_req zone=api_limit burst=20 nodelay; proxy_pass http://api_upstream; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }` và một khối tương tự cho `/api/v2/`",
        "Chạy `docker compose exec nginx nginx -t` kiểm tra cú pháp hợp lệ, rồi `docker compose exec nginx nginx -s reload` để áp dụng không cần restart container",
        "Gọi `curl -i localhost:8081/api/v1/tasks` và `curl -i localhost:8081/api/v2/tasks` xác nhận cả hai đều trả về đúng dữ liệu từ CÙNG một `api` (chỉ khác shape đã làm ở lab 1), và response `v1` vẫn có header `Deprecation`/`Sunset` đi xuyên qua nginx nguyên vẹn",
        "Kiểm chứng rate limit: chạy `for i in $(seq 1 40); do curl -s -o /dev/null -w \"%{http_code}\\n\" localhost:8081/api/v1/tasks; done` — quan sát các request đầu trả `200`, các request vượt `burst=20` trả `503` (nginx mặc định) — xác nhận `api` phía sau không hề biết gì về việc bị chặn, nó không nhận được các request đó",
        "Ghi vào `learnings.md`: `nginx.conf` không chứa bất kỳ dòng nào biết về `status` là string hay object — gateway không đọc payload nghiệp vụ, chỉ định tuyến theo path và đếm request",
      ],
    },
  ],
  deliverable:
    "`taskflow-api` phục vụ song song `/api/v1/tasks` (shape cũ, có header `Deprecation`/`Sunset`) và `/api/v2/tasks` (`status` dạng `{ value, label }`), cả hai gọi chung `listTasksByProject`; `nginx.conf` có rate limit (`limit_req_zone`) và route cả hai version về cùng upstream `api`.",
  successCriteria:
    "Client gọi `v1` không thấy thay đổi hành vi nào (chỉ thêm 2 header mới, không phá field cũ); client gọi `v2` thấy `status` là object; cả hai chạy đồng thời trên cùng một `api` process; vượt rate limit ở `nginx` trả `503` mà không chạm tới `api`.",
  resources: [
    { title: "RFC 8594 — The Sunset HTTP Header Field", url: "https://www.rfc-editor.org/rfc/rfc8594", kind: "doc" },
    { title: "RFC 9745 — The Deprecation HTTP Header Field", url: "https://www.rfc-editor.org/rfc/rfc9745", kind: "doc" },
    { title: "Stripe API docs — Versioning", url: "https://docs.stripe.com/api/versioning", kind: "doc" },
    { title: "Google AIP-180 — Backwards compatibility", url: "https://google.aip.dev/180", kind: "doc" },
    { title: "Fastify docs — Hooks (onSend, encapsulation)", url: "https://fastify.dev/docs/latest/Reference/Hooks/", kind: "doc" },
    { title: "nginx docs — ngx_http_limit_req_module (rate limiting)", url: "https://nginx.org/en/docs/http/ngx_http_limit_req_module.html", kind: "doc" },
  ],
  quiz: [
    {
      id: "them-field-optional-co-can-bump-version",
      question:
        "Một dev muốn thêm field `assigneeName` (optional, có thể `null`) vào response `GET /api/v1/tasks` mà không đổi field nào khác. Đây có cần bump lên `v2` không?",
      options: [
        "Có — bất kỳ thay đổi nào lên response cũng phải bump version cho an toàn",
        "Không — thêm field mới, optional, không xoá/đổi kiểu field cũ là non-breaking change; client cũ đang đọc field cũ vẫn hoạt động y hệt, chỉ là không dùng field mới",
        "Có, nhưng chỉ cần bump patch version dạng `v1.1` chứ không cần `v2`",
        "Không cần bump, nhưng bắt buộc phải xoá field đó khỏi `v1` sau 1 tuần",
      ],
      answerIndex: 1,
      explanation:
        "Nguyên tắc cốt lõi của module: thêm field optional là non-breaking vì code client cũ (thường bỏ qua field lạ) không bị ảnh hưởng. Chỉ đổi kiểu field đang tồn tại hoặc xoá field mới bắt buộc phải version hoá.",
    },
    {
      id: "doi-kieu-status-co-phai-breaking",
      question:
        "`status` ở `/api/v1/tasks` đang là string (`\"todo\"`). Nếu sửa THẲNG route đó để trả `{ value: \"todo\", label: \"Cần làm\" }` (không tạo `v2`, sửa luôn `v1`), điều gì xảy ra với client cũ đang làm `if (task.status === \"todo\")`?",
      options: [
        "Không sao, JavaScript tự động so sánh object với string đúng nghĩa",
        "So sánh `task.status === \"todo\"` sẽ luôn `false` vì `task.status` giờ là object — client cũ vỡ ngay lập tức dù không đổi dòng code nào của họ; đây chính là lý do đổi kiểu field là breaking change và phải đi qua `v2`",
        "Chỉ vỡ nếu client cũ dùng TypeScript, còn JavaScript thuần thì vẫn chạy đúng",
        "Chỉ vỡ nếu server restart, còn nếu không restart thì field cũ vẫn còn song song",
      ],
      answerIndex: 1,
      explanation:
        "Đổi kiểu dữ liệu của một field đang tồn tại luôn là breaking change bất kể ngôn ngữ — so sánh string với object không bao giờ đúng bằng `===`. Đây là lý do bắt buộc giữ `v1` y nguyên và đưa shape mới sang `v2`.",
    },
    {
      id: "vi-sao-chon-url-path-tu-b03",
      question:
        "Vì sao `taskflow-api` chọn URL-path versioning (`/api/v1`, `/api/v2`) từ B03 thay vì versioning qua header (`Accept: application/vnd.taskflow.v2+json`)?",
      options: [
        "Vì URL-path versioning nhanh hơn về mặt hiệu năng xử lý request",
        "Vì URL-path versioning không thể áp dụng cho REST API",
        "Vì URL-path hiện rõ ràng trên chính đường dẫn — dễ debug bằng `curl`, dễ cấu hình routing ở gateway (nginx định tuyến theo path cực đơn giản), và dễ thấy version nào đang được gọi khi đọc log truy cập — đánh đổi lại là URL không còn 'thuần' chỉ định danh resource",
        "Vì header versioning yêu cầu client phải dùng HTTPS bắt buộc",
      ],
      answerIndex: 2,
      explanation:
        "Không có cách versioning nào tuyệt đối tốt hơn — đây là đánh đổi. URL-path thắng ở tính hiển thị và dễ route ở tầng gateway (đúng thứ B18 tận dụng ở nginx); header versioning 'sạch' hơn về mặt REST thuần tuý nhưng khó debug và khó route bằng công cụ đơn giản như nginx location.",
    },
    {
      id: "sunset-6-thang-sau-co-phai-bug",
      question:
        "Sau khi thêm header ở B18, `v1` vẫn hoạt động bình thường suốt từ giờ tới ngày ghi trong `Sunset` (6 tháng sau). Một dev junior hỏi: \"Sao đã đánh dấu deprecated mà vẫn chạy được, có phải bug không?\"",
      options: [
        "Đúng là bug, phải gỡ `v1` ngay khi thêm header `Deprecation`",
        "Không phải bug — đây chính là mục đích của việc tách `Deprecation` (báo hiệu 'sẽ ngừng') khỏi `Sunset` (ngày THỰC SỰ ngừng): client cần một khoảng thời gian nhìn thấy cảnh báo trước khi bị ảnh hưởng, gỡ ngay lập tức phá vỡ mọi client chưa kịp migrate",
        "Không phải bug, nhưng đáng lẽ phải gỡ `v1` trong vòng 24 giờ sau khi thêm header",
        "Header `Deprecation` chỉ mang tính trang trí, không có tác dụng thực tế nào",
      ],
      answerIndex: 1,
      explanation:
        "Ý nghĩa thật của hai header: `Deprecation` là lời cảnh báo sớm, `Sunset` là cam kết ngày gỡ. Khoảng cách giữa hai mốc PHẢI đủ dài để client thật sự có thời gian migrate — gỡ ngay khi cảnh báo xuất hiện phủ nhận hoàn toàn mục đích của việc cảnh báo trước.",
    },
    {
      id: "deprecation-sunset-cung-ngay-co-on-khong",
      question:
        "Một team khác đề xuất: đặt `Deprecation` và `Sunset` cùng trỏ về MỘT ngày duy nhất (ví dụ cả hai đều là ngày mai) để 'gọn code, khỏi tính hai mốc khác nhau'. Đề xuất này có ổn không?",
      options: [
        "Ổn, vì RFC không quy định khoảng cách tối thiểu giữa hai header",
        "Không ổn — về mặt kỹ thuật hai header vẫn hợp lệ nếu trùng ngày, nhưng về mặt thực tế nó xoá mất toàn bộ 'thời gian đệm' mà cơ chế này sinh ra để tồn tại: client nhận cảnh báo và bị gỡ gần như cùng lúc, không khác gì gỡ đột ngột không báo trước",
        "Không ổn, vì server sẽ trả lỗi 500 nếu hai header trùng giá trị",
        "Ổn, miễn là gửi thêm email thông báo cho khách hàng",
      ],
      answerIndex: 1,
      explanation:
        "Không có ràng buộc kỹ thuật nào cấm hai giá trị trùng nhau, nhưng làm vậy đánh mất ý nghĩa vận hành của cơ chế: mục tiêu là cho khách hàng thời gian phản ứng, không phải chỉ để 'có header cho đúng chuẩn'.",
    },
    {
      id: "authorization-xoa-project-o-dau",
      question:
        "Logic \"chỉ role `owner` mới được xoá `project`\" (đã có từ B06) nên đặt ở đâu trong kiến trúc `nginx` (gateway) + `api` (service) của B18?",
      options: [
        "Ở `nginx`, vì gateway là nơi tập trung mọi loại kiểm soát truy cập",
        "Ở `api` (service) — đây là logic nghiệp vụ gắn chặt với domain (vai trò trong `memberships`, quan hệ với `organization`), nginx chỉ nên chuyển tiếp request kèm token, không có khả năng và không nên biết về khái niệm 'role trong tổ chức'",
        "Chia đôi: `nginx` kiểm tra role, `api` chỉ thực thi xoá",
        "Không cần đặt ở đâu cả vì B06 đã xử lý xong, B18 không liên quan",
      ],
      answerIndex: 1,
      explanation:
        "Đây đúng là ranh giới gateway vs service của module: gateway lo cross-cutting concern (routing, rate limit, đôi khi xác thực token còn hợp lệ hay không), còn quyết định nghiệp vụ cụ thể như 'role nào được làm gì với resource nào' luôn thuộc về service — nơi hiểu domain.",
    },
    {
      id: "503-tu-nginx-co-phai-loi-api",
      question:
        "Khi vượt `limit_req` ở `nginx`, client nhận `503`. Đội vận hành nghi ngờ `api` đang bị lỗi và bắt đầu xem log `api` để tìm nguyên nhân. Nhận định này đúng hay sai?",
      options: [
        "Đúng, vì mọi lỗi 5xx đều bắt nguồn từ `api`",
        "Sai — với `nodelay` trong cấu hình `limit_req`, request vượt hạn mức bị `nginx` từ chối NGAY TẠI GATEWAY, không bao giờ chạm tới `api`; log `api` sẽ hoàn toàn sạch, phải xem log/metric của `nginx` mới thấy nguyên nhân thật",
        "Đúng, vì `nginx` chỉ chuyển tiếp lỗi mà `api` đã trả về",
        "Sai, nhưng chỉ vì `api` đang được deploy lại nên tạm thời không nhận request",
      ],
      answerIndex: 1,
      explanation:
        "Đây là điểm mấu chốt của việc tách trách nhiệm: rate limit ở gateway chặn TRƯỚC KHI request chạm service. Debug đúng chỗ (log nginx thay vì log api) tiết kiệm rất nhiều thời gian so với đi tìm lỗi ở nơi request chưa từng tới.",
    },
    {
      id: "vi-sao-v1-v2-cung-mot-upstream",
      question:
        "Vì sao `nginx.conf` route cả `/api/v1/` lẫn `/api/v2/` về CÙNG một `upstream api_upstream { server api:3000; }` thay vì chạy hai container `api` riêng cho từng version?",
      options: [
        "Vì nginx không hỗ trợ kỹ thuật nhiều upstream trong cùng file cấu hình",
        "Vì hai version cùng chia sẻ MỘT logic nghiệp vụ và MỘT nguồn dữ liệu (`tasks-service`, cùng bảng `tasks`) — chỉ khác nhau ở serializer tại tầng route; chạy hai instance riêng sẽ buộc phải sửa bug hai lần, đồng bộ schema hai lần, và có nguy cơ hai bản dữ liệu lệch nhau",
        "Vì chạy hai container tốn phí license nginx theo số upstream",
        "Vì `/api/v2` chưa sẵn sàng chạy độc lập nên tạm thời phải dùng chung",
      ],
      answerIndex: 1,
      explanation:
        "Lab 1 cố tình thiết kế để `v1`/`v2` gọi chung một hàm service — đúng tinh thần 'một app xuyên suốt' của cả course. Gateway chỉ định tuyến theo path, còn việc hai version chia sẻ cùng process là quyết định ở tầng ứng dụng, không phải giới hạn của nginx.",
    },
    {
      id: "nham-serializer-o-v2",
      question:
        "Do copy-paste, route `GET /api/v2/tasks` lỡ gọi `serializeTaskV1` thay vì `serializeTaskV2`. Hậu quả trực tiếp là gì?",
      options: [
        "Không có hậu quả gì vì cả hai serializer đọc cùng dữ liệu nguồn",
        "`/api/v2/tasks` trả `status` là string y hệt `v1` — client mới (đã code theo tài liệu v2, mong đợi `{ value, label }`) sẽ gặp lỗi khi truy cập `task.status.label`, dù response vẫn `200` và không có log lỗi nào ở service",
        "Server sẽ tự động phát hiện và trả lỗi `500`",
        "`/api/v1/tasks` sẽ bị ảnh hưởng theo vì dùng chung service",
      ],
      answerIndex: 1,
      explanation:
        "Đây là loại lỗi nguy hiểm nhất trong versioning: không crash, không log lỗi, response vẫn `200` hợp lệ về mặt HTTP — nhưng sai hợp đồng (contract) mà client v2 đã được hứa. Test ở lab 1 (assert shape khác nhau cho cùng một task) tồn tại chính để bắt loại lỗi này.",
    },
    {
      id: "business-validation-trong-nginx",
      question:
        "Một dev đề xuất thêm đoạn Lua script vào `nginx.conf` để kiểm tra \"`title` của task không được rỗng\" ngay tại gateway, với lý do \"chặn sớm cho nhẹ tải `api`\". Đề xuất này có phù hợp với ranh giới gateway/service không?",
      options: [
        "Phù hợp, vì gateway càng chặn được nhiều request lỗi càng tốt cho hiệu năng",
        "Không phù hợp — kiểm tra `title` rỗng hay không là business/validation logic (đã thuộc về `api` từ B03 với Zod), không phải cross-cutting concern như routing/rate-limit; đặt nó ở `nginx` làm việc deploy gateway (đổi hạ tầng) bị trói vào việc thay đổi quy tắc nghiệp vụ, và logic đó bị nhân đôi ở hai nơi khó đồng bộ",
        "Phù hợp, miễn là dùng đúng ngôn ngữ Lua thay vì JavaScript",
        "Không liên quan tới B18, vì Zod validation đã đủ nên không cần bàn thêm",
      ],
      answerIndex: 1,
      explanation:
        "Đây đúng là bài học cốt lõi của lesson 3: gateway xử lý routing/rate-limit/một số việc chung ở biên, KHÔNG chứa business logic — vì business logic thay đổi theo domain (thường xuyên hơn hạ tầng), và trộn hai thứ khiến một thay đổi nghiệp vụ nhỏ buộc phải động vào cấu hình gateway.",
    },
  ],
};
