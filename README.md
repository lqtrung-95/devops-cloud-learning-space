# DevOps & Cloud Learning Space

Nền tảng web học **DevOps & Cloud (AWS-first)** — từ Linux, Docker, CI/CD, AWS, Terraform, Kubernetes đến Observability, SRE và DevSecOps.

- 🧸 **ELI5 trước, kỹ thuật sau** — mỗi khái niệm mở đầu bằng ví dụ đời thường
- 🖼️ **Sơ đồ SVG tương tác** — bấm từng bước, bật/tắt kịch bản, xem gói tin chạy
- 🧪 **Lab checklist + quiz** chấm điểm phía server
- 👤 **Tài khoản** (GitHub OAuth / email magic link) và **lưu tiến độ** vào Postgres
- 📈 **Dashboard**: tiến độ theo chặng, heatmap hoạt động, lịch sử quiz

Chương trình học: [docs/curriculum.md](docs/curriculum.md) · 28 tuần × ~10h/tuần · 17 module · 6 phase.

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
├── app/                       # Routes: /, /login, /roadmap, /dashboard, /modules/[slug]/(lessons|quiz)
│   └── actions/               # Server actions: lưu tiến độ, chấm quiz
├── components/
│   ├── diagrams/              # Bộ vẽ SVG: node, arrow, packet, step-diagram
│   ├── lesson/                # Component MDX: Eli5, Technical, Callout, Terminal, KeyTerms, QuickCheck
│   ├── progress/              # Checkbox tiến độ, lab checklist, heatmap
│   └── layout/ ui/ landing/
├── content/
│   ├── curriculum-registry.ts # Danh sách module
│   └── modules/mXX-<slug>/    # module-meta.ts · lessons/*.mdx · diagrams/*.tsx
├── db/                        # Drizzle schema (auth + progress)
└── lib/                       # auth, env, progress (pure logic + repository)
docs/                          # curriculum, authoring guide, architecture
```

## Tài liệu

- [Chương trình học](docs/curriculum.md)
- [Hướng dẫn viết nội dung module](docs/content-authoring-guide.md)
- [Kiến trúc hệ thống](docs/system-architecture.md)
