import Link from "next/link";
import type { ModuleDefinition } from "@/content/content-types";
import type { ModuleProgress } from "@/lib/progress/module-progress-calculator";
import { ProgressBar } from "@/components/ui/progress-bar";

interface ModuleProgressCardProps {
  module: ModuleDefinition;
  progress?: ModuleProgress;
}

export function ModuleProgressCard({ module: learningModule, progress }: ModuleProgressCardProps) {
  return (
    <Link
      href={`/modules/${learningModule.slug}`}
      className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-indigo-700"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-3xl" aria-hidden>
          {learningModule.emoji}
        </span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
          {learningModule.id.toUpperCase()} · {learningModule.weeks}
        </span>
      </div>
      <h3 className="mt-3 font-bold text-stone-900 group-hover:text-indigo-700 dark:text-stone-100 dark:group-hover:text-indigo-300">
        {learningModule.title}
      </h3>
      <p className="mt-1 line-clamp-3 flex-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{learningModule.eli5Summary}</p>
      <div className="mt-4 flex items-center gap-3 text-xs text-stone-500">
        <span>📖 {learningModule.lessons.length} bài</span>
        <span>🧪 {learningModule.labs.length} lab</span>
        <span>❓ {learningModule.quiz.length} câu</span>
      </div>
      {progress && (
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar percent={progress.percent} size="sm" label={`Tiến độ ${learningModule.title}`} />
          <span className="w-10 text-right text-xs font-semibold text-stone-600 dark:text-stone-400">
            {progress.isComplete ? "✅" : `${progress.percent}%`}
          </span>
        </div>
      )}
    </Link>
  );
}
