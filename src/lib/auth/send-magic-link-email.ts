import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
});

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Sends the sign-in link. Locally the email lands in Mailpit (http://localhost:8025). */
export async function sendMagicLinkEmail({ email, url }: { email: string; url: string }) {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Link đăng nhập DevOps Learning Space",
    text: `Bấm vào link sau để đăng nhập (hết hạn sau 10 phút):\n\n${url}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>🚀 Đăng nhập DevOps Learning Space</h2>
        <p>Bấm nút bên dưới để đăng nhập. Link hết hạn sau 10 phút.</p>
        <p><a href="${escapeHtmlAttribute(url)}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none">Đăng nhập</a></p>
        <p style="color:#666;font-size:13px">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>`,
  });
}
