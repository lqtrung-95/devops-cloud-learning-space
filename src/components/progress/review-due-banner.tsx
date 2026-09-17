import Link from "next/link";

interface ReviewDueBannerProps {
  dueCount: number;
  newCount: number;
}

/** Compact CTA bar shown above the "continue learning" banner when the learner has cards due. Presentational only. */
export function ReviewDueBanner({ dueCount, newCount }: ReviewDueBannerProps) {
  if (dueCount <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
      <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
        🔁 Bạn có <span className="font-bold">{dueCount}</span> thẻ đến hạn ôn tập
        {newCount > 0 && <span className="text-indigo-600 dark:text-indigo-400"> (+{newCount} thẻ mới)</span>}
      </p>
      <Link href="/review" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">
        Ôn ngay →
      </Link>
    </div>
  );
}
