import type { ModuleDefinition } from "@/content/content-types";

export const b12GraphqlApiModule: ModuleDefinition = {
  id: "b12",
  slug: "b12-graphql-api",
  phaseId: "b-phase-2",
  order: 12,
  weeks: "Tuần 15–16",
  title: "GraphQL API",
  emoji: "🕸️",
  eli5Summary:
    "GraphQL giống việc gọi món ở nhà hàng theo yêu cầu thay vì chọn từ set menu cố định (REST): khách nói đúng thứ mình muốn ăn trong một lần gọi, bếp tự gom nguyên liệu và trả về đúng một đĩa. Nhưng nếu đầu bếp chạy ra chợ mua riêng TỪNG nguyên liệu cho TỪNG món thay vì gom đơn rồi mua một lần, quán sẽ chậm hơn hẳn REST — đó là bẫy N+1, và DataLoader chính là việc bếp đợi gom hết đơn trong một khoảnh khắc rồi mới đi chợ một lần.",
  objectives: [
    "Thiết kế GraphQL schema (type, Query, Mutation) mô tả đúng domain đã có của taskflow-api, không đổi tên bảng/cột",
    "Mount GraphQL endpoint bằng mercurius tại /graphql, chạy song song REST /api/v1 trên cùng app Fastify",
    "Viết resolver gọi lại đúng hàm service layer mà REST đang dùng, không viết logic truy vấn riêng cho GraphQL",
    "Tái dùng đúng JWT auth (B05) và org-scoping/RBAC (B06) trong GraphQL context và resolver — không giả định GraphQL tự an toàn hơn REST",
    "Nhận diện vấn đề N+1 khi resolver lồng nhau tự ý query riêng lẻ, đo bằng log SQL thật thay vì đoán",
    "Dùng DataLoader batch key trong cùng tick để giảm số query, hiểu đúng phạm vi per-request của nó (không cache xuyên request)",
  ],
  lessons: [
    {
      slug: "schema-first-graphql-types-queries-mutations",
      title: "Schema-first: type, Query & Mutation",
      minutes: 40,
      summary: "Thiết kế schema GraphQL mô tả Project/Task/Comment/User đã có — vẽ bản thiết kế trước khi viết resolver.",
    },
    {
      slug: "resolvers-service-layer-and-authorization",
      title: "Resolver gọi lại service layer & giữ nguyên org-scoping",
      minutes: 45,
      summary: "Resolver không viết logic riêng — và không được quên kiểm tra quyền chỉ vì 'đây chỉ là một query'.",
    },
    {
      slug: "n-plus-one-and-dataloader-batching",
      title: "N+1 ở resolver lồng nhau & DataLoader",
      minutes: 45,
      summary: "Đếm SQL thật để thấy resolver lồng 3 cấp nổ thành 11 query — rồi gom lại còn 6 bằng DataLoader.",
    },
    {
      slug: "graphql-vs-rest-when-to-use-which",
      title: "Khi nào dùng GraphQL, khi nào REST vẫn thắng",
      minutes: 30,
      summary: "GraphQL không thay thế REST — upload file, cache theo URL, CRUD đơn giản vẫn nên ở lại REST.",
    },
  ],
  labs: [
    {
      id: "graphql-schema-and-mercurius-endpoint",
      title: "Dựng endpoint GraphQL bằng mercurius",
      description: "Thêm mercurius vào taskflow-api, viết schema-first cho Project/Task/Comment/User, resolver gọi lại service layer.",
      steps: [
        "`pnpm add mercurius graphql` — plugin GraphQL chính thức của Fastify, không dùng Apollo Server song song",
        "Viết schema SDL trong `src/graphql/schema.ts`: `type Project { id: ID! name: String! tasks: [Task!]! }`, `type Task { id: ID! title: String! status: String! comments: [Comment!]! }`, `type Comment { id: ID! body: String! author: User! }`, `type User { id: ID! name: String! email: String! }`, `type Query { project(id: ID!): Project }`",
        "Viết `src/graphql/resolvers.ts`: `Query.project` gọi `getProjectById` (hàm Drizzle đã dùng ở route REST tương ứng từ B04), `Project.tasks` gọi `listTasksByProjectId`, `Task.comments` gọi `listCommentsByTaskId`, `Comment.author` gọi `getUserById` — resolver KHÔNG được viết `db.select` trực tiếp",
        "Đăng ký plugin trong `src/app.ts`: `app.register(mercurius, { schema, resolvers, graphiql: true })` — `graphiql: true` chỉ bật ở dev, mount mặc định tại `/graphql`",
        "Test bằng `curl -X POST localhost:3000/graphql` với body `{\"query\":\"{ project(id: \\\"...\\\") { name tasks { title comments { body author { name } } } } }\"}`, xác nhận response lồng đúng 3 cấp",
      ],
    },
    {
      id: "jwt-context-and-org-scoping-in-resolvers",
      title: "JWT context & org-scoping trong resolver",
      description: "Tái dùng đúng JWT + org-scoping của REST cho GraphQL — chứng minh cả lỗ hổng lẫn cách vá.",
      steps: [
        "Tách phần tra `memberships` trong `attachMembershipOrReject` (B06) thành hàm thuần `getMembershipRole(userId, organizationId)` trong `src/services/membership.service.ts`, sửa `attachMembershipOrReject` gọi lại hàm này thay vì tự query — REST và GraphQL dùng chung một nguồn",
        "Viết `context` cho mercurius trong `src/plugins/graphql.ts`: gọi `await request.jwtVerify()` (cùng `@fastify/jwt` từ B05), lấy `userId` từ `request.user.sub`, trả về `{ userId }` làm GraphQL context truyền vào mọi resolver",
        "Trong `Query.project`, sau khi lấy project, gọi `getMembershipRole(context.userId, project.organizationId)` — nếu `null` hoặc role không đủ, `throw new GraphQLError(\"Không tìm thấy project\")` (không tiết lộ project có tồn tại hay không, giống REST)",
        "Test: đăng nhập user thuộc org A, gọi `Query.project(id)` của một project thuộc org B — xác nhận nhận lỗi, KHÔNG lộ dữ liệu",
        "Cố tình thêm `Query.task(id: ID!): Task` gọi thẳng `getTaskById(id)` KHÔNG qua bước kiểm tra org — gọi thử bằng user org A với id task thuộc org B, xác nhận rò rỉ dữ liệu (bug thật)",
        "Sửa lại: `Query.task` phải tự gọi `getMembershipRole` với `organizationId` lấy từ project chứa task đó trước khi trả kết quả — chạy lại bước 5, xác nhận không còn rò rỉ",
      ],
    },
    {
      id: "detect-and-fix-n-plus-one-with-dataloader",
      title: "Đo N+1 và fix bằng DataLoader",
      description: "Đếm SQL log thật cho query lồng 3 cấp, rồi thêm DataLoader cho field author và đo lại.",
      steps: [
        "Bật `logger: true` khi khởi tạo `drizzle(client, { schema, logger: true })` (đã học ở B04) để in mọi câu SQL Postgres ra console",
        "Chạy lại query `project { tasks { comments { author { name } } } }` cho 1 project có 3 task, mỗi task 2 comment — đếm số dòng SQL in ra (kỳ vọng 11: 1 project + 1 tasks + 3 comments + 6 author)",
        "`pnpm add dataloader` rồi viết `src/graphql/loaders/user-loader.ts`: `new DataLoader<string, User>(async (ids) => { const rows = await db.select().from(users).where(inArray(users.id, ids)); return ids.map((id) => rows.find((row) => row.id === id)); })`",
        "Tạo loader MỚI mỗi request ngay trong `context` của mercurius (`{ userId, userLoader: createUserLoader() }`), sửa `Comment.author` gọi `context.userLoader.load(comment.authorId)` thay vì gọi thẳng `getUserById`",
        "Chạy lại đúng query ở bước 2, đếm lại số dòng SQL — xác nhận còn 6 (1 project + 1 tasks + 3 comments + 1 câu `author IN (...)` gộp)",
        "Ghi vào `learnings.md`: vì sao vẫn còn 3 query riêng cho `comments` (chưa có loader cho bảng đó) — DataLoader chỉ fix đúng field đã áp dụng, không tự lan sang field khác",
      ],
    },
  ],
  deliverable:
    "taskflow-api có thêm GraphQL endpoint tại /graphql (mercurius) chạy song song REST /api/v1, dùng chung JWT auth + org-scoping với REST, và DataLoader cho field author giảm N+1 khi query lồng 3 cấp — có log SQL trước/sau chứng minh bằng số liệu thật.",
  successCriteria:
    "Query `project { tasks { comments { author } } }` trả đúng dữ liệu; user org khác không đọc được project/task không thuộc mình kể cả qua field mới thêm; số query SQL đo được giảm rõ rệt (11 → 6) sau khi thêm DataLoader, không phải ước đoán.",
  resources: [
    { title: "GraphQL.org — Learn GraphQL (queries, mutations)", url: "https://graphql.org/learn/", kind: "doc" },
    { title: "GraphQL.org — Schemas and Types", url: "https://graphql.org/learn/schema/", kind: "doc" },
    { title: "Mercurius (GitHub mercurius-js/mercurius) — GraphQL plugin cho Fastify", url: "https://github.com/mercurius-js/mercurius", kind: "tool" },
    { title: "Mercurius — trang tài liệu chính thức", url: "https://mercurius.dev/", kind: "doc" },
    { title: "graphql/dataloader (GitHub README)", url: "https://github.com/graphql/dataloader", kind: "tool" },
  ],
  quiz: [
    {
      id: "graphql-single-request-vs-rest-round-trips",
      question:
        "Client cần lấy project, toàn bộ task của project, và comment + author của từng task để hiển thị 1 màn hình. Với REST hiện tại (mỗi resource 1 endpoint, chưa có endpoint gộp sẵn), client cần tối thiểu bao nhiêu round-trip?",
      options: [
        "1 round-trip vì REST luôn trả kèm dữ liệu liên quan",
        "Không thể lấy được vì REST không hỗ trợ dữ liệu lồng",
        "Ít nhất 3 round-trip riêng cho project/tasks/comments (hoặc phải over-fetch bằng 1 endpoint gộp cứng)",
        "Chỉ cần 2 round-trip vì task và comment luôn nằm cùng response",
      ],
      answerIndex: 2,
      explanation:
        "REST endpoint-per-resource nghĩa là muốn dữ liệu lồng 3 cấp mà chưa có endpoint gộp riêng, client phải gọi tuần tự hoặc song song nhiều endpoint khác nhau, hoặc backend phải tự over-fetch bằng một endpoint 'god object'. GraphQL cho phép gộp thành 1 query duy nhất.",
    },
    {
      id: "schema-first-mutation-not-query",
      question: "Trong schema-first GraphQL, hành động 'tạo comment mới cho một task' (có side effect ghi DB) nên khai báo ở đâu?",
      options: [
        "Trong type Mutation vì đây là thao tác làm thay đổi dữ liệu (side effect)",
        "Trong type Query vì Query xử lý mọi tương tác với data",
        "Trong type Subscription vì cần realtime",
        "Không cần khai báo, GraphQL tự suy ra từ REST route tương ứng",
      ],
      answerIndex: 0,
      explanation: "Query dành cho đọc dữ liệu, không side effect. Mutation dành cho các thao tác thay đổi dữ liệu như tạo/sửa/xoá — createComment thuộc Mutation.",
    },
    {
      id: "resolver-duplicating-logic-mistake",
      question:
        "Một dev viết resolver `Task.comments` bằng cách gọi thẳng `db.select().from(comments).where(eq(comments.taskId, parent.id))` ngay trong file resolver, thay vì gọi hàm `listCommentsByTaskId` mà route REST đang dùng. Vấn đề chính của cách làm này là gì?",
      options: [
        "Không có vấn đề gì, Drizzle luôn tối ưu như nhau dù gọi ở đâu",
        "Resolver không được phép gọi Drizzle trực tiếp theo quy định của GraphQL spec",
        "GraphQL sẽ tự động cache kết quả nên viết lại không ảnh hưởng",
        "Logic truy vấn (và mọi org-scoping đi kèm nếu có) bị nhân đôi ở 2 nơi — sửa 1 chỗ dễ quên sửa chỗ kia, gây lệch hành vi giữa REST và GraphQL",
      ],
      answerIndex: 3,
      explanation:
        "Nguyên tắc 'resolver gọi lại service layer đã có' tồn tại chính để tránh nhân đôi logic — nếu sau này thêm điều kiện lọc hay org-scoping vào hàm service, resolver viết tay riêng sẽ không tự động được cập nhật theo.",
    },
    {
      id: "n-plus-one-count-nested-query",
      question:
        "Query `project { tasks { comments { author { name } } } }` chạy trên 1 project có 3 task, mỗi task có 2 comment (6 comment tổng), MỖI comment có tác giả khác nhau, resolver CHƯA dùng DataLoader — mỗi field tự chạy 1 query riêng cho từng phần tử cha. Tổng số câu SQL sinh ra là bao nhiêu?",
      options: [
        "9 (project + tasks + comments + author trừ đi 2 vì trùng bảng)",
        "11 (1 project + 1 tasks + 3 comments + 6 author)",
        "4 (1 câu duy nhất cho mỗi loại bảng)",
        "6 (chỉ tính riêng bảng bị lặp)",
      ],
      answerIndex: 1,
      explanation:
        "1 câu lấy project, 1 câu lấy tasks theo project, MỖI trong 3 task lại tự chạy 1 câu lấy comments (3 câu), MỖI trong 6 comment lại tự chạy 1 câu lấy author (6 câu) → 1+1+3+6 = 11.",
    },
    {
      id: "dataloader-batches-per-tick",
      question: "DataLoader cho field `author` hoạt động bằng cách nào để giảm số query?",
      options: [
        "Nó cache vĩnh viễn kết quả author trong Redis dùng chung cho mọi request sau",
        "Nó chuyển toàn bộ resolver author sang chạy đồng bộ (synchronous) để tránh race condition",
        "Nó gom TẤT CẢ các key `.load(id)` được gọi trong cùng một tick/microtask, rồi phát đúng MỘT câu SQL `WHERE id IN (...)` cho cả nhóm",
        "Nó tự động thêm index cho cột id trong Postgres",
      ],
      answerIndex: 2,
      explanation:
        "DataLoader không phải cache lâu dài — nó batch theo tick: mọi lệnh `.load()` gọi trong cùng lượt event loop được gom thành 1 câu `IN (...)`, giảm N query riêng lẻ thành 1.",
    },
    {
      id: "dataloader-not-shared-across-requests",
      question:
        "Team dự định tạo MỘT instance DataLoader dùng chung cho toàn bộ app (khởi tạo 1 lần lúc start server, không tạo lại mỗi request) để 'tiết kiệm bộ nhớ'. Rủi ro lớn nhất của cách làm này là gì?",
      options: [
        "DataLoader dùng chung sẽ cache kết quả xuyên suốt nhiều request khác nhau — dữ liệu (và cả ranh giới quyền truy cập) có thể lẫn giữa các user khác nhau",
        "Không có rủi ro, đây là cách làm chuẩn được khuyến nghị",
        "DataLoader chỉ hoạt động đúng khi có đúng 1 instance duy nhất trong toàn app",
        "Mercurius sẽ crash nếu tạo DataLoader mới mỗi request",
      ],
      answerIndex: 0,
      explanation:
        "DataLoader cache trong bộ nhớ theo mặc định trong vòng đời của chính instance đó. Dùng chung 1 instance xuyên suốt nhiều request phá vỡ ranh giới request — dữ liệu có thể lẫn giữa các user. Chuẩn là tạo loader MỚI trong `context` mỗi request.",
    },
    {
      id: "graphql-context-must-reverify-jwt",
      question:
        "REST route dùng `preHandler: [app.authenticate, requireRole(...)]` để bắt buộc xác thực. Khi mount GraphQL qua mercurius tại `/graphql`, những preHandler này có tự động áp dụng cho từng resolver không?",
      options: [
        "Có, vì mercurius tự copy toàn bộ preHandler của mọi route REST khác sang",
        "Có, nhưng chỉ áp dụng cho Query, không áp dụng cho Mutation",
        "Không cần xác thực gì thêm vì GraphQL tự an toàn hơn REST",
        "Không — `/graphql` là 1 route Fastify riêng; phải tự xác thực JWT và tự áp org-scoping trong `context` hoặc resolver, không thừa hưởng preHandler gắn theo từng route REST cụ thể",
      ],
      answerIndex: 3,
      explanation:
        "preHandler được gắn theo TỪNG route REST cụ thể. `/graphql` chỉ là 1 endpoint POST duy nhất nhận query bất kỳ, nên phải tự verify JWT và tự áp org-scoping đúng chỗ (context hoặc resolver), không thừa hưởng miễn phí.",
    },
    {
      id: "graphql-still-needs-authz-common-mistake",
      question:
        "Một dev nghĩ: 'field Project.tasks chỉ đọc dữ liệu lồng từ project cha, không cần tự kiểm tra quyền, chỉ cần Query.project kiểm tra là đủ'. Nhận định này đúng khi nào?",
      options: [
        "Luôn đúng, GraphQL không cần authorization cho các field chỉ đọc",
        "Chỉ đúng NẾU Project.tasks chỉ điều hướng từ 1 project ĐÃ được xác thực quyền ở Query.project — field nào sau này nhận ID trực tiếp từ client (ví dụ Query.task(id)) phải tự kiểm tra lại quyền từ đầu",
        "Sai hoàn toàn, mọi field kể cả kiểu String đều phải tự query DB kiểm tra quyền riêng",
        "Đúng vì Mercurius tự động chặn truy cập xuyên tổ chức bằng cơ chế cache nội bộ",
      ],
      answerIndex: 1,
      explanation:
        "Nested field kế thừa được quyền của field cha CHỈ KHI nó chỉ điều hướng theo quan hệ đã được xác thực (project → tasks của đúng project đó) — bất kỳ field nào nhận ID trực tiếp từ client (bỏ qua đường điều hướng đó) là một entry point mới, phải tự org-scope lại từ đầu.",
    },
    {
      id: "graphql-bad-fit-file-upload",
      question: "Team muốn thêm tính năng upload file đính kèm (attachment) cho task. Lựa chọn kiến trúc hợp lý nhất là gì?",
      options: [
        "Giữ nguyên REST (presigned URL từ B08) cho upload file — GraphQL không có lợi thế cho luồng binary/multipart và chỉ làm phức tạp thêm không cần thiết",
        "Bắt buộc chuyển toàn bộ tính năng này qua GraphQL vì module B12 đã có GraphQL",
        "GraphQL multipart upload luôn đơn giản và nhanh hơn REST nên nên dùng GraphQL",
        "Không thể upload file qua bất kỳ API nào ngoài REST thuần",
      ],
      answerIndex: 0,
      explanation:
        "GraphQL được thiết kế cho truy vấn dữ liệu dạng JSON lồng nhau, không tối ưu cho luồng binary/multipart — REST (đặc biệt cách presigned URL đã học ở B08) vẫn đơn giản và phù hợp hơn cho upload file.",
    },
    {
      id: "graphql-bad-fit-simple-crud-and-caching",
      question: "Endpoint `GET /api/v1/health` (kiểm tra server còn sống, không tham số, response gần như cố định) có nên chuyển sang GraphQL không?",
      options: [
        "Có, vì mọi API mới đều nên ưu tiên GraphQL để đồng bộ kiến trúc",
        "Có, vì GraphQL luôn nhanh hơn REST với mọi loại endpoint",
        "Không — đây là endpoint đơn giản, không cần truy vấn linh hoạt hay dữ liệu lồng; giữ REST tận dụng được HTTP cache theo URL (CDN, browser) mà GraphQL (luôn POST tới 1 URL cố định) không tận dụng được",
        "Không quan trọng, cả hai hoạt động giống hệt nhau về khả năng cache",
      ],
      answerIndex: 2,
      explanation:
        "GraphQL hợp nhất mọi request vào 1 endpoint POST cố định — mất khả năng cache theo URL kiểu HTTP (CDN/browser cache dựa vào GET + URL). Với endpoint đơn giản, không lồng, ít tham số, REST vẫn đơn giản và tận dụng cache tốt hơn.",
    },
  ],
};
