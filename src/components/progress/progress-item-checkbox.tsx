"use client";

import clsx from "clsx";
import { useOptimistic, useState, useTransition } from "react";
import { toggleProgressItemAction } from "@/app/actions/learning-progress-actions";

interface ProgressItemCheckboxProps {
  itemKey: string;
  completed: boolean;
  isSignedIn: boolean;
  label: string;
}

/** Round checkbox that saves a lesson/lab completion to the server with an optimistic update. */
export function ProgressItemCheckbox({ itemKey, completed, isSignedIn, label }: ProgressItemCheckboxProps) {
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(completed);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    if (!isSignedIn) {
      setError("Đăng nhập để lưu tiến độ");
      return;
    }
    const nextCompleted = !optimisticCompleted;
    startTransition(async () => {
      setOptimisticCompleted(nextCompleted);
      const result = await toggleProgressItemAction({ itemKey, completed: nextCompleted });
      setError(result.ok ? null : result.error);
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={optimisticCompleted}
        aria-label={label}
        onClick={toggle}
        disabled={isPending}
        className={clsx(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
          optimisticCompleted
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-stone-300 bg-white hover:border-emerald-400 dark:border-stone-600 dark:bg-stone-900",
        )}
      >
        {optimisticCompleted && "✓"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </span>
  );
}
