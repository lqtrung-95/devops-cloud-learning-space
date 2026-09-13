"use client";

import clsx from "clsx";
import { useState } from "react";
import { InlineCodeText } from "@/components/ui/inline-code-text";

interface QuickCheckQuestionProps {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/** Inline self-check inside a lesson. Not graded or stored — it just helps the idea stick. */
export function QuickCheckQuestion({ question, options, answerIndex, explanation }: QuickCheckQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  return (
    <div className="not-prose my-8 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
      <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">🤔 Kiểm tra nhanh</p>
      <p className="mt-1 font-semibold text-stone-900 dark:text-stone-100">
        <InlineCodeText text={question} />
      </p>
      <div className="mt-3 grid gap-2">
        {options.map((option, index) => {
          const isCorrect = index === answerIndex;
          const isSelected = index === selected;
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => setSelected(index)}
              className={clsx(
                "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                !answered && "border-stone-300 bg-white hover:border-indigo-400 dark:border-stone-700 dark:bg-stone-900",
                answered && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
                answered && isSelected && !isCorrect && "border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
                answered && !isCorrect && !isSelected && "border-stone-200 bg-white opacity-60 dark:border-stone-800 dark:bg-stone-900",
              )}
            >
              {answered && isCorrect ? "✅ " : answered && isSelected ? "❌ " : ""}
              <InlineCodeText text={option} />
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-3 flex items-start justify-between gap-3">
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            <strong>{selected === answerIndex ? "Chính xác! " : "Chưa đúng. "}</strong>
            <InlineCodeText text={explanation} />
          </p>
          <button type="button" onClick={() => setSelected(null)} className="shrink-0 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
