"use client";

import { useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import { authClient } from "@/lib/auth/auth-client";

interface MagicLinkLoginFormProps {
  isGithubEnabled: boolean;
  showLocalMailHint: boolean;
}

type FormStatus = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; email: string } | { kind: "error"; message: string };

export function MagicLinkLoginForm({ isGithubEnabled, showLocalMailHint }: MagicLinkLoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });

  const sendMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ kind: "sending" });
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: "/dashboard", errorCallbackURL: "/login" });
    setStatus(error ? { kind: "error", message: error.message ?? "Không gửi được email, thử lại sau." } : { kind: "sent", email });
  };

  const signInWithGithub = async () => {
    const { error } = await authClient.signIn.social({ provider: "github", callbackURL: "/dashboard", errorCallbackURL: "/login" });
    if (error) setStatus({ kind: "error", message: error.message ?? "Đăng nhập GitHub thất bại." });
  };

  if (status.kind === "sent") {
    return (
      <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-sm dark:bg-emerald-950/40">
        <p className="text-2xl" aria-hidden>
          📬
        </p>
        <p className="mt-2 font-semibold text-emerald-900 dark:text-emerald-100">Đã gửi link đăng nhập tới {status.email}</p>
        <p className="mt-1 text-emerald-800 dark:text-emerald-200">Mở email và bấm vào link (hết hạn sau 10 phút).</p>
        {showLocalMailHint && (
          <p className="mt-3 text-emerald-800 dark:text-emerald-200">
            Đang chạy local? Xem email tại{" "}
            <a href="http://localhost:8025" target="_blank" rel="noreferrer" className="font-semibold underline">
              Mailpit (localhost:8025)
            </a>
            .
          </p>
        )}
        <button type="button" onClick={() => setStatus({ kind: "idle" })} className="mt-4 text-xs font-medium underline">
          Dùng email khác
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {isGithubEnabled && (
        <>
          <button type="button" onClick={signInWithGithub} className={buttonClassName("secondary", "w-full py-2.5")}>
            <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Tiếp tục với GitHub
          </button>
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
            hoặc
            <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
          </div>
        </>
      )}
      <form onSubmit={sendMagicLink} className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ban@example.com"
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-stone-700 dark:bg-stone-950"
        />
        <button type="submit" disabled={status.kind === "sending"} className={buttonClassName("primary", "w-full py-2.5")}>
          {status.kind === "sending" ? "Đang gửi…" : "✉️ Gửi link đăng nhập"}
        </button>
        {status.kind === "error" && <p className="text-sm text-rose-600">{status.message}</p>}
        <p className="text-xs text-stone-500">Không cần mật khẩu — chúng tôi gửi cho bạn một link đăng nhập dùng một lần.</p>
      </form>
    </div>
  );
}
