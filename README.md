# Learning Space

Nền tảng web học công nghệ theo kiểu **ELI5 + sơ đồ tương tác + lab**, hiện có 3 khoá:

- ☁️ **DevOps & Cloud (AWS-first)** — Linux, Docker, CI/CD, AWS, Terraform, Kubernetes, Observability, SRE, DevSecOps.
- 🏗️ **System Design** — building blocks, distributed systems và case study phỏng vấn.
- 🧩 **Backend Development** — REST/GraphQL/gRPC, database, auth, testing, security, observability — xây dần 1 app `taskflow-api` xuyên suốt.

- 🧸 **ELI5 trước, kỹ thuật sau** — mỗi khái niệm mở đầu bằng ví dụ đời thường
- 🖼️ **Sơ đồ SVG tương tác** — bấm từng bước, bật/tắt kịch bản, xem gói tin chạy
- 🧪 **Lab checklist + quiz** chấm điểm phía server
- 🔁 **Ôn tập giãn cách (SM-2)** — flashcard rút ra từ quiz, pilot 3 module đầu (m01–m03)
- 👤 **Tài khoản** (GitHub OAuth / email magic link) và **lưu tiến độ** vào Postgres
- 📈 **Dashboard**: tiến độ theo chặng, heatmap hoạt động, lịch sử quiz, thẻ đến hạn ôn tập

Chương trình học:

- DevOps & Cloud: [docs/curriculum.md](docs/curriculum.md) · 28 tuần × ~10h/tuần · 17 module · 6 phase
- System Design: [docs/system-design-curriculum.md](docs/system-design-curriculum.md) · 24 tuần × ~10h/tuần · 19 module · 5 phase
- Backend Development: [docs/backend-curriculum.md](docs/backend-curriculum.md) · 24 tuần × ~10h/tuần · 19 module · 5 phase

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · MDX · Better Auth · Drizzle ORM · PostgreSQL 17 · Mailpit · Vitest

## Chạy local

Yêu cầu: Node ≥ 20.9, pnpm, Docker (Docker Desktop / Colima / OrbStack).

```bash
pnpm install
cp .env.example .env                 # rồi đặt BETTER_AUTH_SECRET=$(openssl rand -base64 32)
pnpm services:up                     # Postgres :5433 + Mailpit :1025/:8025
pnpm db:push                         # tạo bảng
pnpm dev                             # http://localhost:3000
```

Đăng nhập bằng email → mở **Mailpit** tại http://localhost:8025 để bấm link.

**GitHub OAuth (tuỳ chọn):** tạo OAuth App tại https://github.com/settings/developers với callback `http://localhost:3000/api/auth/callback/github`, điền `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` vào `.env`. Nút GitHub chỉ hiện khi đã cấu hình.

## Deploy lên Vercel

Xem hướng dẫn từng bước tại [docs/deployment-guide.md](docs/deployment-guide.md) — dùng Vercel Postgres (Neon) cho database và Resend cho email magic-link.

## Scripts

| Lệnh | Việc |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Chạy dev / build / chạy bản build |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | ESLint · TypeScript · Vitest |
| `pnpm validate:module <slug>` | Kiểm tra cấu trúc + MDX của một module nội dung |
| `pnpm services:up` | Bật Postgres + Mailpit bằng Docker Compose |
| `pnpm db:push` · `pnpm db:studio` | Đồng bộ schema · mở Drizzle Studio |

## Cấu trúc

```
src/
├── app/                       # Routes: / (chọn khoá), /courses/[slug], /login, /dashboard, /review, /modules/[slug]/(lessons|quiz)
│   └── actions/               # Server actions: lưu tiến độ, chấm quiz
├── components/
│   ├── diagrams/              # Bộ vẽ SVG: node, arrow, packet, step-diagram
│   ├── lesson/                # Component MDX: Eli5, Technical, Callout, Terminal, KeyTerms, QuickCheck
│   ├── progress/              # Checkbox tiến độ, lab checklist, heatmap
│   └── layout/ ui/ landing/
├── content/
│   ├── course-registry.ts     # Danh sách khoá học + phase của từng khoá
│   ├── curriculum-registry.ts # Danh sách module (mọi khoá)
│   └── modules/<id>-<slug>/   # module-meta.ts · lessons/*.mdx · diagrams/*.tsx (m01…, sd01…)
├── db/                        # Drizzle schema (auth + progress + review)
└── lib/                       # auth, env, progress, review (pure logic + repository)
docs/                          # curriculums, authoring guide, architecture, deployment
```

## Tài liệu

- [Chương trình học DevOps & Cloud](docs/curriculum.md)
- [Chương trình học System Design](docs/system-design-curriculum.md)
- [Chương trình học Backend Development](docs/backend-curriculum.md)
- [Hướng dẫn viết nội dung module](docs/content-authoring-guide.md)
- [Kiến trúc hệ thống](docs/system-architecture.md)
- [Hướng dẫn deploy lên Vercel](docs/deployment-guide.md)
