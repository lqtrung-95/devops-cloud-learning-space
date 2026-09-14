# Deploy lên Vercel

Hướng dẫn deploy app này lên Vercel với **Neon** (Postgres, cài qua Vercel Marketplace) cho database và **Resend** cho email magic-link. Làm tuần tự từ trên xuống, khoảng 10–15 phút.

## 0. Trước khi bắt đầu

- Repo đã push lên GitHub: `lqtrung-95/devops-cloud-learning-space` ✅ (đã xong)
- Tài khoản [vercel.com](https://vercel.com) (đăng nhập bằng GitHub cho tiện)
- Tài khoản [resend.com](https://resend.com) — free tier 3.000 email/tháng

## 1. Import project vào Vercel

1. Vào [vercel.com/new](https://vercel.com/new), chọn **Import Git Repository**.
2. Chọn repo `devops-cloud-learning-space`. Vercel tự nhận diện đây là app Next.js — không cần chỉnh Build Command / Output Directory.
3. **Chưa bấm Deploy vội** — mở rộng phần **Environment Variables** hoặc để mặc định rồi làm tiếp bước 2–4, quay lại thêm biến môi trường trước khi deploy thật (Vercel cho sửa env vars bất cứ lúc nào và deploy lại).

## 2. Tạo database (Neon, qua Vercel Marketplace)

Vercel không tự lưu Postgres nữa — mọi database giờ chạy qua **Marketplace**, và nhà cung cấp mặc định để làm việc này là **Neon**. Làm đúng theo thứ tự sau, không cần đổi tên gì cả:

1. Trong project vừa tạo, vào tab **Storage**.
2. Bấm **Create Database** (hoặc **Connect Database**, tuỳ bản UI bạn đang thấy) → chọn **Neon** trong danh sách.
3. Nếu được hỏi tài khoản Neon: chọn **Create New Neon Account** → **Continue**.
4. Chọn region gần bạn (vd Singapore), đặt tên database (vd `devops-learning-db`) → bấm tạo.
5. **Quan trọng — bỏ qua phần "Advanced Options" / đừng tick "Add prefix"**: nếu để mặc định (không thêm tiền tố), Neon sẽ tự thêm thẳng vào project của bạn một biến tên đúng là **`DATABASE_URL`** — đây chính là bản **pooled connection string** (đã tối ưu cho serverless), dùng được ngay, không cần copy-paste gì thêm.

Vậy là xong bước này — bỏ qua bước 4 cũ (tạo biến DATABASE_URL thủ công), vì Neon đã tự tạo sẵn rồi. Bạn có thể xác nhận lại bằng cách vào **Settings → Environment Variables** của project và tìm thấy `DATABASE_URL` đã có giá trị (bắt đầu bằng `postgres://...`).

## 3. Tạo API key Resend

1. Vào [resend.com/api-keys](https://resend.com/api-keys) → **Create API Key** → copy lại (chỉ hiện một lần).
2. Sender email: dùng tạm `onboarding@resend.dev` (Resend cho gửi thử không cần verify domain — đủ dùng cho project cá nhân). Nếu có domain riêng, verify domain đó trong **Domains** để gửi từ email `@domain-của-bạn.com`.

## 4. Điền Environment Variables trên Vercel

Vào **Settings → Environment Variables**, thêm các biến sau (scope **Production** — có thể để trống ở Preview vì đăng nhập sẽ không hoạt động trên các preview URL, xem mục "Giới hạn" bên dưới):

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | Đã có sẵn từ bước 2 (Neon tự tạo) — không cần làm gì thêm |
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

Trước khi deploy, tạo schema trên database Neon vừa nối. Lấy connection string: vào **Settings → Environment Variables** của project trên Vercel, tìm dòng `DATABASE_URL`, bấm vào ô giá trị (icon con mắt 👁 hoặc bấm để lộ) rồi copy.

```bash
# Từ máy bạn, trong thư mục devops-cloud-learning-space
# Tạm thời trỏ DATABASE_URL sang production để đẩy schema — KHÔNG commit dòng này vào .env
DATABASE_URL="<giá-trị-vừa-copy>" pnpm db:push
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
