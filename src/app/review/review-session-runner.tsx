"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { submitCardReviewAction } from "@/app/actions/card-review-actions";
import { buttonClassName } from "@/components/ui/button-styles";
import { InlineCodeText } from "@/components/ui/inline-code-text";
import type { FlashCard, ReviewGrade } from "@/lib/review/review-types";

interface ReviewSessionRunnerProps {
  cards: FlashCard[];
}

interface GradeButton {
  grade: ReviewGrade;
  label: string;
  key: string;
  className: string;
}

const GRADE_BUTTONS: GradeButton[] = [
  { grade: 0, label: "Lại (1)", key: "1", className: "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300" },
  { grade: 3, label: "Khó (2)", key: "2", className: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
  { grade: 4, label: "Tốt (3)", key: "3", className: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { grade: 5, label: "Dễ (4)", key: "4", className: "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300" },
];

export function ReviewSessionRunner({ cards }: ReviewSessionRunnerProps) {
  const [index, setIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [ratedCount, setRatedCount] = useState(0);
  const [againCount, setAgainCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentCard = cards[index];

  const rate = (grade: ReviewGrade) => {
    if (!currentCard || isPending) return;
    startTransition(async () => {
      const result = await submitCardReviewAction({ cardId: currentCard.id, grade });
      if (result.ok) {
        setError(null);
        setRatedCount((count) => count + 1);
        if (grade === 0) setAgainCount((count) => count + 1);
        setIsRevealed(false);
        setIndex((current) => current + 1);
      } else {
        setError(result.error);
      }
    });
  };

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (isPending || !currentCard) return;
      if (!isRevealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setIsRevealed(true);
        return;
      }
      if (isRevealed) {
        const gradeButton = GRADE_BUTTONS.find((button) => button.key === event.key);
        if (gradeButton) rate(gradeButton.grade);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `rate` closes over stable setters + startTransition; re-binding per-keystroke would be wasteful.
  }, [isRevealed, isPending, currentCard]);

  if (!currentCard) {
    return (
      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="text-5xl" aria-hidden>
          🏁
        </p>
        <p className="mt-3 text-lg font-semibold">Đã ôn xong {ratedCount} thẻ!</p>
        <p className="mt-1 text-sm text-stone-500">{againCount > 0 ? `${againCount} thẻ cần ôn lại sớm.` : "Không có thẻ nào bị đánh giá 'Lại' — tuyệt vời!"}</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500">
          Về Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <p className="text-sm text-stone-500">
        Thẻ {index + 1}/{cards.length}
      </p>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <p className="text-lg font-semibold">
          <InlineCodeText text={currentCard.front} />
        </p>

        {isRevealed && (
          <div className="mt-5 space-y-3 border-t border-stone-200 pt-5 dark:border-stone-800">
            <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              ✅ <InlineCodeText text={currentCard.back.answer} />
            </p>
            <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              💬 <InlineCodeText text={currentCard.back.explanation} />
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!isRevealed ? (
        <button type="button" onClick={() => setIsRevealed(true)} className={buttonClassName("primary", "w-full py-3")} aria-label="Hiện đáp án">
          Hiện đáp án <span className="text-xs font-normal opacity-75">(Space)</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {GRADE_BUTTONS.map((button) => (
            <button
              key={button.grade}
              type="button"
              disabled={isPending}
              onClick={() => rate(button.grade)}
              aria-label={button.label}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${button.className}`}
            >
              {isPending ? "Đang lưu…" : button.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
