import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { isGithubAuthEnabled } from "@/lib/env";
import { MagicLinkLoginForm } from "./magic-link-login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <p className="text-4xl" aria-hidden>
          👋
        </p>
        <h1 className="mt-3 text-2xl font-bold">Chào mừng bạn!</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Đăng nhập để lưu tiến độ học, làm quiz và theo dõi chuỗi ngày học của bạn.
        </p>
        <MagicLinkLoginForm isGithubEnabled={isGithubAuthEnabled} showLocalMailHint={process.env.NODE_ENV !== "production"} />
      </div>
    </div>
  );
}
