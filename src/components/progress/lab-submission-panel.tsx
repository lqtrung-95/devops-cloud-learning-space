"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState, useTransition } from "react";
import { submitLabAction } from "@/app/actions/learning-progress-actions";
import { buttonClassName } from "@/components/ui/button-styles";
import type { PublicLabSubmissionSpec } from "@/content/content-types";
import type { LabCheckOutcome } from "@/lib/progress/lab-submission-grader";

export interface RecentLabSubmission {
  id: number;
  passed: boolean;
  createdAt: Date;
  content: string;
  checkResults: LabCheckOutcome[];
}

interface LabSubmissionPanelProps {
  moduleSlug: string;
  labId: string;
  spec: PublicLabSubmissionSpec;
  isSignedIn: boolean;
  completed: boolean;
  recentSubmissions: RecentLabSubmission[];
}

type SubmitResult = { passed: boolean; autoGraded: boolean; outcomes: LabCheckOutcome[] };

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

/** Submission form + grading result + short history for one lab. Rendered only when the lab has a `submission` spec. */
export function LabSubmissionPanel({ moduleSlug, labId, spec, isSignedIn, completed, recentSubmissions }: LabSubmissionPanelProps) {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (content.trim().length === 0) return;
    setError(null);
    startTransition(async () => {
      const response = await submitLabAction({ moduleSlug, labId, content });
      if (response.ok) {
        setResult(response.data);
        setContent("");
      } else {
        setError(response.error);
      }
    });
  };

  const outcomeByCheckId = new Map((result?.outcomes ?? []).map((outcome) => [outcome.checkId, outcome.passed]));

  return (
    <div className="mt-4 space-y-3 border-t border-stone-200 pt-4 dark:border-stone-800">
      <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{spec.prompt}</p>

      {completed && !result && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">✅ Đã hoàn thành</p>}

      {spec.checks.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {spec.checks.map((check) => {
            const passed = outcomeByCheckId.get(check.id);
            return (
              <li key={check.id}>
                <span aria-hidden>{passed === undefined ? "▫️" : passed ? "✅" : "❌"}</span> <span>{check.label}</span>
                {passed === false && check.hint && <span className="mt-0.5 block pl-5 text-xs text-amber-700 dark:text-amber-400">💡 {check.hint}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {isSignedIn ? (
        <div className="space-y-2">
          <label htmlFor={`lab-submission-${labId}`} className="sr-only">
            Kết quả nộp cho lab {labId}
          </label>
          {spec.inputKind === "output" ? (
            <textarea
              id={`lab-submission-${labId}`}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={8}
              disabled={isPending}
              placeholder="Dán output ở đây…"
              className="w-full rounded-xl border border-stone-300 bg-white p-3 font-mono text-xs dark:border-stone-700 dark:bg-stone-950"
            />
          ) : (
            <input
              id={`lab-submission-${labId}`}
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={isPending}
              placeholder={spec.inputKind === "url" ? "Dán link ở đây…" : "Dán giá trị ở đây…"}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm dark:border-stone-700 dark:bg-stone-950"
            />
          )}
          <div className="flex items-center gap-3">
            <button type="button" onClick={submit} disabled={isPending || content.trim().length === 0} className={buttonClassName("primary")}>
              {isPending ? "Đang chấm…" : "Nộp kết quả"}
            </button>
            {error && <span className="text-sm text-rose-600">{error}</span>}
          </div>
        </div>
      ) : (
        <p className="text-sm">
          <Link href="/login" className="font-semibold text-indigo-600 underline">
            Đăng nhập
          </Link>{" "}
          để nộp kết quả lab.
        </p>
      )}

      {result && (
        <div
          role="status"
          aria-live="polite"
          className={clsx(
            "rounded-xl p-4 text-sm font-semibold",
            !result.autoGraded || result.passed
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
          )}
        >
          {result.autoGraded ? (result.passed ? "🎉 Lab đạt!" : "Chưa đạt — xem gợi ý ở trên") : "✅ Đã lưu minh chứng, lab hoàn thành!"}
        </div>
      )}

      {recentSubmissions.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-stone-600 dark:text-stone-400">Lịch sử nộp bài ({recentSubmissions.length})</summary>
          <ul className="mt-2 space-y-2">
            {recentSubmissions.map((submission) => (
              <li key={submission.id} className="rounded-lg border border-stone-200 p-2 dark:border-stone-800">
                <p className="flex items-center gap-2 text-xs text-stone-500">
                  <span aria-hidden>{submission.passed ? "✅" : "❌"}</span>
                  {formatTimestamp(submission.createdAt)}
                </p>
                <pre className="mt-1 max-h-48 overflow-auto rounded bg-stone-50 p-2 text-xs break-all whitespace-pre-wrap dark:bg-stone-950">{submission.content}</pre>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
