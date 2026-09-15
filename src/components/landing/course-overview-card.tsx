import Link from "next/link";
import { buttonClassName } from "@/components/ui/button-styles";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { CourseDefinition } from "@/content/content-types";
import type { PhaseWithModules } from "@/content/curriculum-lookup";
import type { CourseProgressSummary } from "@/lib/progress/module-progress-calculator";

interface CourseOverviewCardProps {
  course: CourseDefinition;
  phases: PhaseWithModules[];
  /** Present only for signed-in learners. */
  progress?: CourseProgressSummary;
}

export function CourseOverviewCard({ course, phases, progress }: CourseOverviewCardProps) {
  const modules = phases.flatMap((phase) => phase.modules);
  const lessonCount = modules.reduce((sum, learningModule) => sum + learningModule.lessons.length, 0);

  return (
    <article className="flex flex-col rounded-3xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <span className="text-4xl" aria-hidden>
          {course.emoji}
        </span>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{course.tagline}</span>
      </div>
      <h3 className="mt-3 text-2xl font-extrabold tracking-tight">{course.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{course.description}</p>
      <p className="mt-3 text-xs text-stone-500">
        {modules.length > 0 ? `${modules.length} module · ${lessonCount} bài học` : "Nội dung đang được biên soạn"} · ~{course.hoursPerWeek}h/tuần
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {phases.map((phase) => (
          <li key={phase.id} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {phase.emoji} {phase.title}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        {progress?.hasStarted && (
          <div className="mb-4 flex items-center gap-3">
            <ProgressBar percent={progress.percent} size="sm" label={`Tiến độ ${course.title}`} />
            <span className="text-xs font-semibold">{progress.percent}%</span>
          </div>
        )}
        <Link href={`/courses/${course.slug}`} className={buttonClassName("primary")}>
          {progress?.hasStarted ? "Học tiếp →" : "Xem lộ trình →"}
        </Link>
      </div>
    </article>
  );
}
