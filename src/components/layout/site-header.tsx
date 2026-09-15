import Link from "next/link";
import { buttonClassName } from "@/components/ui/button-styles";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { ThemeToggleButton } from "./theme-toggle-button";
import { UserAccountMenu } from "./user-account-menu";

export async function SiteHeader() {
  const session = await getCurrentSession();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/85 backdrop-blur dark:border-stone-800 dark:bg-stone-950/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-2 flex items-center gap-2 font-bold tracking-tight">
          <span className="text-xl" aria-hidden>
            🚀
          </span>
          <span className="hidden sm:inline">Learning Space</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/#courses" className={buttonClassName("ghost", "px-3")}>
            Khoá học
          </Link>
          {session && (
            <Link href="/dashboard" className={buttonClassName("ghost", "px-3")}>
              Tiến độ
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggleButton />
          {session ? (
            <UserAccountMenu name={session.user.name} email={session.user.email} image={session.user.image} />
          ) : (
            <Link href="/login" className={buttonClassName("primary", "py-1.5")}>
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
