# Deploy lên Vercel

Hướng dẫn deploy app này lên Vercel với **Vercel Postgres (Neon)** cho database và **Resend** cho email magic-link. Làm tuần tự từ trên xuống, khoảng 10–15 phút.

## 0. Trước khi bắt đầu

- Repo đã push lên GitHub: `lqtrung-95/devops-cloud-learning-space` ✅ (đã xong)
- Tài khoản [vercel.com](https://vercel.com) (đăng nhập bằng GitHub cho tiện)
- Tài khoản [resend.com](https://resend.com) — free tier 3.000 email/tháng

## 1. Import project vào Vercel

1. Vào [vercel.com/new](https://vercel.com/new), chọn **Import Git Repository**.
2. Chọn repo `devops-cloud-learning-space`. Vercel tự nhận diện đây là app Next.js — không cần chỉnh Build Command / Output Directory.
3. **Chưa bấm Deploy vội** — mở rộng phần **Environment Variables** hoặc để mặc định rồi làm tiếp bước 2–4, quay lại thêm biến môi trường trước khi deploy thật (Vercel cho sửa env vars bất cứ lúc nào và deploy lại).

## 2. Tạo database (Vercel Postgres / Neon)

1. Trong project vừa tạo, vào tab **Storage** → **Create Database** → chọn **Postgres** (chạy trên nền Neon).
2. Đặt tên (vd `devops-learning-db`), chọn region gần bạn, bấm **Create**.
3. Vercel tự nối database này với project và tự thêm sẵn vài biến môi trường (tên có thể là `POSTGRES_URL`, `DATABASE_URL`, hoặc có tiền tố tên database tuỳ giao diện hiện tại — mở tab **.env.local** của database để xem chính xác).
4. Vào **Settings → Environment Variables** của project: nếu chưa có biến tên đúng là `DATABASE_URL`, tạo thêm một biến `DATABASE_URL` và dán giá trị của biến **pooled connection string** (thường có chữ `-pooler` trong hostname, hoặc là biến `POSTGRES_URL` mà Vercel đã tạo). Dùng bản **pooled** vì app chạy trên serverless functions — nhiều lượt gọi hàm cùng lúc sẽ tự dùng chung pool phía Neon thay vì mở quá nhiều kết nối trực tiếp.

## 3. Tạo API key Resend

1. Vào [resend.com/api-keys](https://resend.com/api-keys) → **Create API Key** → copy lại (chỉ hiện một lần).
2. Sender email: dùng tạm `onboarding@resend.dev` (Resend cho gửi thử không cần verify domain — đủ dùng cho project cá nhân). Nếu có domain riêng, verify domain đó trong **Domains** để gửi từ email `@domain-của-bạn.com`.

## 4. Điền Environment Variables trên Vercel

Vào **Settings → Environment Variables**, thêm các biến sau (scope **Production** — có thể để trống ở Preview vì đăng nhập sẽ không hoạt động trên các preview URL, xem mục "Giới hạn" bên dưới):

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | Connection string Neon từ bước 2 (bản pooled, đã có sẵn `?sslmode=require`) |
| `BETTER_AUTH_SECRET` | Chạy `openssl rand -base64 32` ở máy bạn, dán kết quả vào |
| `BETTER_AUTH_URL` | `https://<tên-project>.vercel.app` — Vercel cho bạn biết domain mặc định này ngay khi tạo project (Settings → Domains); nếu dùng custom domain, điền domain đó |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `resend` (chữ y nguyên, không phải email của bạn) |
| `SMTP_PASSWORD` | API key Resend từ bước 3 |
| `EMAIL_FROM` | `DevOps Learning Space <onboarding@resend.dev>` (hoặc email trên domain đã verify) |

**GitHub OAuth (tuỳ chọn):** nếu muốn nút "Tiếp tục với GitHub" hoạt động ở production, tạo OAuth App mới tại [github.com/settings/developers](https://github.com/settings/developers) (không dùng chung app của local vì callback URL khác nhau):
- Homepage URL: `https://<tên-project>.vercel.app`
- Authorization callback URL: `https://<tên-project>.vercel.app/api/auth/callback/github`

Thêm `GITHUB_CLIENT_ID` và `GITHUB_CLIENT_SECRET` vào Environment Variables. Bỏ qua hai biến này nếu chỉ dùng đăng nhập bằng email.

## 5. Tạo bảng trong database production

Trước khi deploy, tạo schema trên database Neon vừa nối:

```bash
# Từ máy bạn, trong thư mục devops-cloud-learning-space
# Tạm thời trỏ DATABASE_URL sang production để đẩy schema — KHÔNG commit file này
DATABASE_URL="<connection-string-neon-từ-bước-2>" pnpm db:push
```

Xác nhận thấy dòng `[✓] Changes applied`. Việc này chỉ cần làm **một lần** (và mỗi khi sau này bạn đổi schema trong `src/db/`).

## 6. Deploy

Quay lại project trên Vercel, bấm **Deploy**. Theo dõi log build — nếu env vars ở bước 4 đủ và đúng, build sẽ pass (app đã tự kiểm tra: thiếu `BETTER_AUTH_URL` hợp lệ hoặc `BETTER_AUTH_SECRET` là placeholder sẽ làm build fail sớm với thông báo rõ ràng, thay vì deploy một bản hỏng).

Từ giờ, mỗi lần bạn `git push` lên `main`, Vercel tự build và deploy lại.

## 7. Kiểm tra

1. Mở `https://<tên-project>.vercel.app`.
2. Đăng nhập bằng email → kiểm tra hộp thư (hoặc **Resend → Logs** để xem email đã gửi chưa nếu không thấy trong hộp thư/spam).
3. Học một bài, đánh dấu hoàn thành, làm quiz → vào `/dashboard` xác nhận tiến độ được lưu.

## Giới hạn cần biết

- **Preview deployments** (mỗi PR có 1 URL riêng dạng `*-git-branch.vercel.app`) sẽ **không đăng nhập được** nếu `BETTER_AUTH_URL` chỉ set cho domain production — vì Better Auth so khớp domain để chống CSRF. Với project cá nhân việc này không quan trọng; nếu cần preview có đăng nhập, phải cấu hình thêm `trustedOrigins` động theo `VERCEL_URL` (chưa làm ở bản này).
- Sender `onboarding@resend.dev` chỉ nên dùng để tự kiểm thử — nếu mời người khác dùng thật, nên verify domain riêng trong Resend để email không rơi vào spam.
- Database free tier của Neon có thể "ngủ" sau một thời gian không dùng — request đầu tiên sau đó sẽ chậm hơn bình thường vài giây, đây là hành vi bình thường của free tier.
