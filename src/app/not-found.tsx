import Link from "next/link";
import { buttonClassName } from "@/components/ui/button-styles";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl" aria-hidden>
        🛰️
      </p>
      <h1 className="mt-4 text-2xl font-bold">404 — Không tìm thấy trang</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">Trang này đã lạc đường rồi. Quay về danh sách khoá học nhé!</p>
      <Link href="/" className={buttonClassName("primary", "mt-6")}>
        Về các khoá học
      </Link>
    </div>
  );
}
