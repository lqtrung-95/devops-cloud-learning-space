import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { getReviewQueueSnapshot } from "@/lib/review/review-queue-snapshot";
import { ReviewSessionRunner } from "./review-session-runner";

export const metadata: Metadata = { title: "Ôn tập" };

export default async function ReviewPage() {
  const session = await getCurrentSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">🔁 Ôn tập giãn cách</h1>
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-center dark:border-stone-800 dark:bg-stone-900">
          <p>
            <Link href="/login" className="font-semibold text-indigo-600 underline">
              Đăng nhập
            </Link>{" "}
            để ôn tập các thẻ đến hạn.
          </p>
        </div>
      </div>
    );
  }

  const queue = await getReviewQueueSnapshot(session.user.id);

  if (queue.cards.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">🔁 Ôn tập giãn cách</h1>
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
          <p className="text-5xl" aria-hidden>
            🎉
          </p>
          <p className="mt-3 text-lg font-semibold">Hôm nay không có thẻ nào đến hạn ôn tập</p>
          <p className="mt-1 text-sm text-stone-500">Làm quiz ở các module đã học để có thêm thẻ ôn tập nhé.</p>
          <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500">
            Về Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">🔁 Ôn tập giãn cách</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        {queue.cards.length} thẻ trong phiên này · {queue.dueCount} đến hạn · {queue.newCount} thẻ mới.
      </p>
      <ReviewSessionRunner cards={queue.cards} />
    </div>
  );
}
