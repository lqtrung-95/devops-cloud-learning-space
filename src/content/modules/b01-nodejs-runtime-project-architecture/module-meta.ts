import type { ModuleDefinition } from "@/content/content-types";

export const b01NodejsRuntimeProjectArchitectureModule: ModuleDefinition = {
  id: "b01",
  slug: "b01-nodejs-runtime-project-architecture",
  phaseId: "b-phase-0",
  order: 1,
  weeks: "Tuần 1",
  title: "Node.js runtime & kiến trúc project",
  emoji: "🌀",
  eli5Summary:
    "Node.js là một pha chế cực nhanh nhưng chỉ có một tay: thay vì đứng chờ máy pha espresso (việc I/O chậm), pha chế đó bấm nút rồi quay lại nhận order tiếp theo ngay — đó chính là event loop. Module này dựng bộ khung TypeScript chuẩn cho `taskflow-api`, app xuyên suốt cả course, và làm cho nó chạy được chỉ bằng một lệnh `docker compose up`.",
  objectives: [
    "Giải thích đúng call stack, microtask queue và macrotask queue để dự đoán thứ tự console.log trong Node.js",
    "Phân biệt CommonJS và ESM, cấu hình `\"type\": \"module\"` và `moduleResolution: NodeNext` đúng cách",
    "Dựng cấu trúc thư mục backend theo layer (routes/services/db) cho `taskflow-api`",
    "Cấu hình `tsconfig.json` strict cho dự án Node 22 và validate biến môi trường bằng Zod thay vì tin `.env` một cách mù quáng",
    "Dựng `docker-compose.yml` với 3 service đầu tiên (`api`, `postgres`, `redis`) đúng spec dùng chung cho cả 19 module",
    "Viết Dockerfile multi-stage tối giản cho service `api`",
  ],
  lessons: [
    {
      slug: "event-loop-non-blocking-io",
      title: "Event loop & non-blocking I/O",
      minutes: 45,
      summary: "Vì sao Node.js xử lý hàng ngàn request bằng một luồng duy nhất — và thứ tự thực thi thật của setTimeout, Promise, process.nextTick.",
    },
    {
      slug: "typescript-project-structure",
      title: "Cấu trúc project TypeScript theo layer",
      minutes: 40,
      summary: "tsconfig strict + NodeNext, ESM vs CommonJS, và vì sao routes/services/db phải tách riêng ngay từ đầu.",
    },
    {
      slug: "docker-compose-setup",
      title: "Dựng taskflow-api bằng Docker Compose",
      minutes: 40,
      summary: "Dockerfile multi-stage tối giản và 3 service đầu tiên (api, postgres, redis) chạy cùng nhau bằng một lệnh.",
    },
  ],
  labs: [
    {
      id: "init-taskflow-api-repo",
      title: "Khởi tạo repo taskflow-api",
      description: "Dựng khung project TypeScript chuẩn cho app xuyên suốt cả course, theo cấu trúc thư mục layer.",
      steps: [
        "`mkdir taskflow-api && cd taskflow-api && npm init -y`, sau đó sửa `package.json` thêm `\"type\": \"module\"`",
        "`npm install fastify zod drizzle-orm postgres pino dotenv` và `npm install -D typescript tsx vitest @types/node`",
        "Tạo `tsconfig.json` với `strict: true`, `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022`",
        "Tạo cấu trúc thư mục: `src/app.ts`, `src/routes/`, `src/services/`, `src/db/`, `src/plugins/`, `src/config/`",
        "Viết `src/config/env.ts` validate biến môi trường bằng Zod (`PORT`, `DATABASE_URL`, `REDIS_URL`)",
        "Viết `src/app.ts` khởi tạo Fastify instance với route `GET /api/v1/health` trả `{ status: \"ok\" }`, rồi chạy thử bằng `npx tsx src/app.ts` và `curl localhost:3000/api/v1/health`",
      ],
    },
    {
      id: "dockerize-taskflow-api-compose",
      title: "Viết Dockerfile và dựng Docker Compose",
      description: "Container hoá taskflow-api và đưa 3 service nền tảng (api, postgres, redis) chạy cùng nhau.",
      steps: [
        "Viết `Dockerfile` multi-stage: stage `builder` (`FROM node:22-slim AS builder`) cài dependency bằng `npm ci` và chạy `npm run build` ra `dist/`",
        "Thêm stage runtime (`FROM node:22-slim`) chỉ copy `dist/`, `package*.json`, cài `npm ci --omit=dev`, rồi `EXPOSE 3000` và `CMD [\"node\", \"dist/app.js\"]`",
        "Viết `docker-compose.yml` với đúng 3 service theo spec: `api` (build từ Dockerfile, `ports: [\"3000:3000\"]`), `postgres` (`postgres:17`, env `POSTGRES_USER/PASSWORD/DB=taskflow`, `ports: [\"5434:5432\"]`, healthcheck `pg_isready -U taskflow`), `redis` (`redis:7`, `ports: [\"6380:6379\"]`)",
        "Thêm biến môi trường cho service `api`: `DATABASE_URL=postgres://taskflow:taskflow@postgres:5432/taskflow` và `REDIS_URL=redis://redis:6379`",
        "`docker compose up -d --build` rồi kiểm tra `docker compose ps` — cả 3 service phải ở trạng thái running/healthy",
        "`curl http://localhost:3000/api/v1/health` xác nhận API trả `{ \"status\": \"ok\" }` khi chạy trong container",
      ],
    },
    {
      id: "event-loop-ordering-script",
      title: "Script minh hoạ thứ tự event loop",
      description: "Viết một script Node nhỏ, tự dự đoán rồi kiểm chứng thứ tự thực thi setTimeout/Promise/process.nextTick.",
      steps: [
        "Tạo file `scripts/event-loop-order.ts` với `console.log`, `setTimeout(fn, 0)`, `Promise.resolve().then(fn)` và `process.nextTick(fn)` xen kẽ nhau",
        "Viết dự đoán thứ tự output ra giấy (hoặc comment trong file) trước khi chạy",
        "Chạy bằng `npx tsx scripts/event-loop-order.ts` và so sánh kết quả thật với dự đoán",
        "Thêm một vòng `for` đồng bộ chạy vài giây ngay trước dòng `console.log` cuối, chạy lại script và giải thích vì sao nó làm trễ cả `setTimeout` lẫn `Promise`",
        "Ghi lại giải thích ngắn gọn vào `learnings.md` ở gốc repo (thói quen 'học công khai' dùng xuyên suốt course)",
      ],
    },
  ],
  deliverable:
    "Repo Git `taskflow-api` với cấu trúc thư mục theo layer, route health-check, Dockerfile multi-stage và `docker-compose.yml` chạy được đúng 3 service (`api`, `postgres`, `redis`) bằng `docker compose up`.",
  successCriteria:
    "`docker compose up -d` chạy sạch cả 3 service, không container nào restart loop; giải thích đúng — không cần tra cứu lại — thứ tự log in ra từ script event loop (`setTimeout` vs `Promise` vs `process.nextTick`).",
  resources: [
    {
      title: "Node.js docs — The Event Loop, Timers, and process.nextTick()",
      url: "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick",
      kind: "doc",
    },
    {
      title: "Node.js API docs — process.nextTick(callback)",
      url: "https://nodejs.org/api/process.html#processnexttickcallback-args",
      kind: "doc",
    },
    { title: "TypeScript Handbook — tsconfig Reference", url: "https://www.typescriptlang.org/tsconfig", kind: "doc" },
    { title: "TypeScript Handbook — Modules", url: "https://www.typescriptlang.org/docs/handbook/2/modules.html", kind: "doc" },
    { title: "Fastify docs — Getting Started", url: "https://fastify.dev/docs/latest/Guides/Getting-Started/", kind: "doc" },
    { title: "Docker docs — Multi-stage builds", url: "https://docs.docker.com/build/building/multi-stage/", kind: "doc" },
    { title: "Docker Compose docs — Compose file reference", url: "https://docs.docker.com/reference/compose-file/", kind: "doc" },
    { title: "Zod docs", url: "https://zod.dev/", kind: "tool" },
  ],
  quiz: [
    {
      id: "event-loop-console-order",
      question:
        "Cho đoạn code sau chạy trong Node.js:\n\nconsole.log(\"1: start\");\nsetTimeout(() => console.log(\"2: setTimeout\"), 0);\nPromise.resolve().then(() => console.log(\"3: promise\"));\nprocess.nextTick(() => console.log(\"4: nextTick\"));\nconsole.log(\"5: end\");\n\nThứ tự console.log in ra là gì?",
      options: ["1, 2, 3, 4, 5", "1, 5, 3, 4, 2", "1, 5, 4, 3, 2", "1, 4, 5, 3, 2"],
      answerIndex: 2,
      explanation:
        "Code đồng bộ chạy hết trước (1, 5). Sau đó Node xả hàng đợi process.nextTick trước microtask queue (4), rồi tới Promise microtask (3), cuối cùng mới sang phase Timers cho setTimeout (2).",
    },
    {
      id: "nexttick-priority",
      question: "Giữa hàng đợi `process.nextTick` và microtask queue của Promise, Node.js xử lý hàng nào trước khi cả hai đều đang chờ?",
      options: [
        "process.nextTick luôn chạy trước",
        "Microtask Promise luôn chạy trước",
        "Cái nào được đăng ký trước thì chạy trước, không phân biệt loại",
        "Cả hai chạy song song",
      ],
      answerIndex: 0,
      explanation:
        "Node.js xử lý toàn bộ hàng đợi process.nextTick trước, rồi mới tới microtask queue (Promise) — đây là đặc thù của Node, khác với trình duyệt vốn không có process.nextTick.",
    },
    {
      id: "blocking-sync-loop",
      question: "Bạn thêm một vòng `for` chạy đồng bộ 5 giây ngay sau `setTimeout(fn, 0)`. Điều gì xảy ra với callback của setTimeout đó?",
      options: [
        "Chạy ngay trong 0ms như đã hẹn vì setTimeout có độ ưu tiên cao",
        "Chạy trên một luồng khác song song với vòng lặp",
        "Bị huỷ vì Node phát hiện vòng lặp chặn luồng",
        "Bị trễ ít nhất 5 giây vì call stack bận, event loop không thể sang phase Timers",
      ],
      answerIndex: 3,
      explanation:
        "Node.js chỉ có một luồng chính. Vòng lặp đồng bộ giữ call stack bận suốt 5 giây, event loop không thể tiếp tục cho tới khi call stack rỗng — kể cả timer đã 'hết hạn' vẫn phải chờ.",
    },
    {
      id: "type-module-meaning",
      question: "Thêm `\"type\": \"module\"` vào `package.json` của taskflow-api có tác dụng gì?",
      options: [
        "Bật chế độ strict cho TypeScript",
        "Tăng tốc độ khởi động server",
        "Node hiểu các file .js là ES Module (dùng import/export) thay vì CommonJS (require)",
        "Bắt buộc dùng Docker để chạy project",
      ],
      answerIndex: 2,
      explanation:
        "\"type\": \"module\" đổi cách Node.js diễn giải file .js — dùng cú pháp import/export (ESM) thay vì require/module.exports (CommonJS). TypeScript strict là cấu hình riêng trong tsconfig.json.",
    },
    {
      id: "nodenext-resolution",
      question: "Vì sao taskflow-api dùng `\"moduleResolution\": \"NodeNext\"` trong tsconfig.json thay vì `\"node\"` cũ?",
      options: [
        "NodeNext mô phỏng đúng cách Node.js runtime thật sự resolve module ESM/CommonJS (bao gồm yêu cầu phần mở rộng file), phù hợp với \"type\": \"module\"",
        "NodeNext bắt buộc dùng CommonJS",
        "NodeNext biên dịch nhanh hơn node cũ",
        "NodeNext tự động cài package còn thiếu",
      ],
      answerIndex: 0,
      explanation:
        "NodeNext theo sát hành vi resolve module thật của Node.js hiện đại (bao gồm quy tắc export map, cần đuôi .js khi import file tương đối) — cần thiết khi project chạy ESM thật trên Node 22.",
    },
    {
      id: "layered-folder-purpose",
      question: "taskflow-api tách `routes/`, `services/`, `db/` thành 3 thư mục riêng. Lợi ích chính là gì?",
      options: [
        "Giúp file nhỏ gọn hơn cho dễ đọc, không có lý do kỹ thuật nào khác",
        "Mỗi lớp chỉ lo một việc (route nhận HTTP, service chứa logic nghiệp vụ, db lo truy vấn) nên dễ test, dễ thay đổi mà không ảnh hưởng lớp khác",
        "Bắt buộc phải làm vậy vì Fastify yêu cầu cấu trúc này",
        "Giúp Docker build nhanh hơn",
      ],
      answerIndex: 1,
      explanation:
        "Tách theo layer (separation of concerns) giúp đổi DB, viết unit test cho service mà không cần khởi động HTTP server, hay đổi route mà không đụng logic nghiệp vụ.",
    },
    {
      id: "compose-port-mapping",
      question:
        "File `.env` của service `api` có `DATABASE_URL=postgres://taskflow:taskflow@postgres:5432/taskflow`. Vì sao cổng là 5432 chứ không phải 5434 (cổng bạn dùng khi `psql` từ máy host)?",
      options: [
        "5432 và 5434 thực ra là cùng một cổng, ghi khác nhau không quan trọng",
        "Đó là lỗi cấu hình cần sửa lại",
        "5432 là cổng dự phòng khi 5434 bị lỗi",
        "Bên trong network nội bộ của Docker Compose, service gọi nhau qua cổng container gốc (5432); 5434 chỉ là cổng map ra host để bạn truy cập từ bên ngoài",
      ],
      answerIndex: 3,
      explanation:
        "`ports: [\"5434:5432\"]` chỉ đổi cổng bạn thấy từ host. Bên trong mạng Docker Compose, các container luôn gọi nhau qua cổng container gốc — Postgres luôn lắng nghe 5432.",
    },
    {
      id: "healthcheck-purpose",
      question: "Service `postgres` trong compose có healthcheck `pg_isready -U taskflow`. Mục đích chính của dòng này là gì?",
      options: [
        "Tự động sao lưu database mỗi khi container khởi động",
        "Kiểm tra mật khẩu Postgres có đúng không",
        "Cho Docker biết Postgres đã sẵn sàng nhận kết nối thật sự, không chỉ là container đã 'chạy' (running)",
        "Tăng tốc độ khởi động Postgres",
      ],
      answerIndex: 2,
      explanation:
        "Container 'running' không có nghĩa là Postgres bên trong đã sẵn sàng nhận kết nối. Healthcheck cho compose (và service api phụ thuộc) biết chính xác khi nào Postgres thật sự sẵn sàng.",
    },
    {
      id: "settimeout-zero-wait",
      question: "Vì sao `setTimeout(fn, 0)` không chạy fn ngay lập tức mà vẫn phải đợi?",
      options: [
        "Vì 0ms trong Node.js thực ra được làm tròn thành 1000ms",
        "Vì fn phải đợi call stack rỗng, tất cả process.nextTick và microtask (Promise) hiện có chạy xong, rồi event loop mới tới phase Timers để lấy fn ra chạy",
        "Vì setTimeout luôn chạy sau khi cả chương trình kết thúc",
        "Vì Node.js chặn mọi timer cho tới khi có request HTTP đầu tiên",
      ],
      answerIndex: 1,
      explanation:
        "setTimeout đặt fn vào hàng đợi macrotask (phase Timers). Event loop chỉ xử lý phase này sau khi call stack rỗng và đã xả hết nextTick + microtask — nên 0ms chỉ là 'sớm nhất có thể', không phải ngay lập tức.",
    },
    {
      id: "non-blocking-io-concurrent-request",
      question:
        "Trong lúc taskflow-api đang đọc một file cấu hình lớn bằng API bất đồng bộ (non-blocking), một request GET /api/v1/health khác tới. Điều gì xảy ra?",
      options: [
        "Việc đọc file được giao cho lớp I/O bên dưới (libuv/thread pool) xử lý riêng, main thread vẫn rảnh nên request health được xử lý ngay",
        "Request health bị chặn, phải đợi đọc file xong mới được xử lý",
        "Node.js tạo thêm một luồng chính mới để xử lý song song",
        "Request health bị từ chối với lỗi 503",
      ],
      answerIndex: 0,
      explanation:
        "Đây chính là giá trị của non-blocking I/O: các thao tác I/O chậm (đọc file, gọi DB) được giao cho libuv xử lý nền, main thread của Node.js không bị chặn và vẫn phục vụ được request khác.",
    },
  ],
};
