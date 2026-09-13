"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toggleProgressItemAction } from "@/app/actions/learning-progress-actions";
import { buttonClassName } from "@/components/ui/button-styles";

interface LessonLink {
  slug: string;
  title: string;
}

interface LessonCompletionFooterProps {
  itemKey: string;
  initiallyCompleted: boolean;
  isSignedIn: boolean;
  moduleSlug: string;
  previousLesson: LessonLink | null;
  nextLesson: LessonLink | null;
}

/** "Mark as done" + previous/next navigation at the bottom of each lesson. */
export function LessonCompletionFooter({ itemKey, initiallyCompleted, isSignedIn, moduleSlug, previousLesson, nextLesson }: LessonCompletionFooterProps) {
  const router = useRouter();
  const [completed, setCompleted] = useOptimistic(initiallyCompleted);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextHref = nextLesson ? `/modules/${moduleSlug}/lessons/${nextLesson.slug}` : `/modules/${moduleSlug}/quiz`;

  const completeAndContinue = () => {
    startTransition(async () => {
      if (!completed) {
        setCompleted(true);
        const result = await toggleProgressItemAction({ itemKey, completed: true });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      router.push(nextHref);
    });
  };

  return (
    <div className="mt-14 space-y-6 border-t border-stone-200 pt-8 dark:border-stone-800">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 p-6 text-center dark:from-indigo-950/40 dark:to-violet-950/40">
        {isSignedIn ? (
          <>
            <p className="font-semibold">{completed ? "🎉 Bạn đã hoàn thành bài này!" : "Hiểu bài rồi chứ?"}</p>
            <button type="button" onClick={completeAndContinue} disabled={isPending} className={buttonClassName("primary", "mt-3")}>
              {completed ? (nextLesson ? "Bài tiếp theo →" : "Làm quiz →") : nextLesson ? "✓ Hoàn thành & học tiếp" : "✓ Hoàn thành & làm quiz"}
            </button>
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          </>
        ) : (
          <p className="text-sm">
            <Link href="/login" className="font-semibold text-indigo-600 underline">
              Đăng nhập
            </Link>{" "}
            để đánh dấu hoàn thành và lưu tiến độ.
          </p>
        )}
      </div>
      <div className="flex justify-between gap-3 text-sm">
        {previousLesson ? (
          <Link href={`/modules/${moduleSlug}/lessons/${previousLesson.slug}`} className={buttonClassName("secondary")}>
            ← {previousLesson.title}
          </Link>
        ) : (
          <span />
        )}
        <Link href={nextHref} className={buttonClassName("secondary")}>
          {nextLesson ? `${nextLesson.title} →` : "Quiz →"}
        </Link>
      </div>
    </div>
  );
}
