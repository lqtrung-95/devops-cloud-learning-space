import Link from "next/link";
import { buttonClassName } from "@/components/ui/button-styles";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { CourseDefinition } from "@/content/content-types";
import type { PhaseWithModules } from "@/content/curriculum-lookup";
import type { CourseProgressSummary, ModuleProgress } from "@/lib/progress/module-progress-calculator";

interface CourseProgressSectionProps {
  course: CourseDefinition;
  phases: PhaseWithModules[];
  courseProgress: CourseProgressSummary;
  moduleProgressById: ReadonlyMap<string, ModuleProgress>;
}

/** Dashboard block for one course: full per-phase breakdown once started, a compact invite otherwise. */
export function CourseProgressSection({ course, phases, courseProgress, moduleProgressById }: CourseProgressSectionProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          {course.emoji} {course.title}
        </h2>
        <Link href={`/courses/${course.slug}`} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Lộ trình →
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar percent={courseProgress.percent} label={`Tiến độ ${course.title}`} />
        <span className="text-sm font-semibold">{courseProgress.percent}%</span>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        🏅 {courseProgress.modulesDone}/{courseProgress.modulesTotal} module · 📖 {courseProgress.lessonsDone}/{courseProgress.lessonsTotal} bài · 🧪{" "}
        {courseProgress.labsDone}/{courseProgress.labsTotal} lab
      </p>

      {courseProgress.modulesTotal === 0 ? (
        <p className="mt-4 text-sm italic text-stone-500">Nội dung đang được biên soạn…</p>
      ) : !courseProgress.hasStarted ? (
        <Link href={`/courses/${course.slug}`} className={buttonClassName("secondary", "mt-4")}>
          Bắt đầu khoá này →
        </Link>
      ) : (
        <div className="mt-5 space-y-5">
          {phases
            .filter((phase) => phase.modules.length > 0)
            .map((phase) => (
              <div key={phase.id}>
                <p className="text-sm font-semibold">
                  {phase.emoji} Phase {phase.order}: {phase.title}
                </p>
                <div className="mt-2 space-y-2">
                  {phase.modules.map((learningModule) => {
                    const progress = moduleProgressById.get(learningModule.id);
                    return (
                      <Link key={learningModule.id} href={`/modules/${learningModule.slug}`} className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-stone-50 dark:hover:bg-stone-800">
                        <span className="w-44 shrink-0 truncate text-sm text-stone-700 dark:text-stone-300">
                          {learningModule.emoji} {learningModule.title}
                        </span>
                        <ProgressBar percent={progress?.percent ?? 0} size="sm" label={learningModule.title} />
                        <span className="w-10 text-right text-xs font-semibold">{progress?.isComplete ? "✅" : `${progress?.percent ?? 0}%`}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
