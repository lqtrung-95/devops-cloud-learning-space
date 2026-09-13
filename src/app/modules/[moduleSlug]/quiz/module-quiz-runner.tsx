"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState, useTransition } from "react";
import { submitQuizAction } from "@/app/actions/learning-progress-actions";
import { buttonClassName } from "@/components/ui/button-styles";
import { InlineCodeText } from "@/components/ui/inline-code-text";
import type { PublicQuizQuestion } from "@/content/content-types";
import type { QuizGradeResult } from "@/lib/progress/quiz-grader";

interface ModuleQuizRunnerProps {
  moduleSlug: string;
  questions: PublicQuizQuestion[];
  passPercent: number;
}

export function ModuleQuizRunner({ moduleSlug, questions, passPercent }: ModuleQuizRunnerProps) {
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [grade, setGrade] = useState<QuizGradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const answeredCount = answers.filter((answer) => answer >= 0).length;

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    if (grade) return;
    setAnswers((current) => current.map((answer, index) => (index === questionIndex ? optionIndex : answer)));
  };

  const submit = () => {
    startTransition(async () => {
      const result = await submitQuizAction({ moduleSlug, answers });
      if (result.ok) {
        setGrade(result.data);
        setError(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(result.error);
      }
    });
  };

  const retry = () => {
    setAnswers(questions.map(() => -1));
    setGrade(null);
    setError(null);
  };

  return (
    <div className="mt-8 space-y-6">
      {grade && (
        <div
          role="status"
          className={clsx(
            "rounded-2xl p-6 text-center",
            grade.passed ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-amber-50 dark:bg-amber-950/40",
          )}
        >
          <p className="text-5xl" aria-hidden>
            {grade.passed ? "🏆" : "💪"}
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {grade.score}/{grade.total} câu đúng · {grade.percent}%
          </p>
          <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
            {grade.passed ? "Tuyệt vời! Bạn đã vượt qua quiz." : `Cần ${passPercent}% để qua. Xem giải thích bên dưới rồi thử lại nhé!`}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={retry} className={buttonClassName("secondary")}>
              Làm lại
            </button>
            <Link href={`/modules/${moduleSlug}`} className={buttonClassName("primary")}>
              Về module
            </Link>
          </div>
        </div>
      )}

      {questions.map((question, questionIndex) => {
        const result = grade?.results[questionIndex];
        return (
          <fieldset key={question.id} className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <legend className="font-semibold">
              <span className="mr-2 text-indigo-600 dark:text-indigo-400">Câu {questionIndex + 1}.</span>
              <InlineCodeText text={question.question} />
            </legend>
            <div role="radiogroup" className="mt-3 grid gap-2">
              {question.options.map((option, optionIndex) => {
                const isSelected = answers[questionIndex] === optionIndex;
                const isCorrectOption = result?.correctIndex === optionIndex;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={Boolean(grade)}
                    onClick={() => selectAnswer(questionIndex, optionIndex)}
                    role="radio"
                    aria-checked={isSelected}
                    className={clsx(
                      "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                      !result && isSelected && "border-indigo-500 bg-indigo-50 dark:bg-indigo-950",
                      !result && !isSelected && "border-stone-200 hover:border-indigo-300 dark:border-stone-700",
                      result && isCorrectOption && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950",
                      result && isSelected && !isCorrectOption && "border-rose-500 bg-rose-50 dark:bg-rose-950",
                      result && !isSelected && !isCorrectOption && "border-stone-200 opacity-60 dark:border-stone-800",
                    )}
                  >
                    {result && isCorrectOption ? "✅ " : result && isSelected ? "❌ " : ""}
                    <InlineCodeText text={option} />
                  </button>
                );
              })}
            </div>
            {result && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm leading-relaxed text-stone-700 dark:bg-stone-800 dark:text-stone-300">💬 <InlineCodeText text={result.explanation} /></p>}
          </fieldset>
        );
      })}

      {!grade && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
          <span className="text-sm text-stone-600 dark:text-stone-400">
            Đã trả lời {answeredCount}/{questions.length}
          </span>
          {error && <span className="text-sm text-rose-600">{error}</span>}
          <button type="button" onClick={submit} disabled={isPending || answeredCount < questions.length} className={buttonClassName("primary")}>
            {isPending ? "Đang chấm…" : "Nộp bài"}
          </button>
        </div>
      )}
    </div>
  );
}
