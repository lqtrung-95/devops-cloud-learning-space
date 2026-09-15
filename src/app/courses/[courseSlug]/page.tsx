import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DevopsLoopHeroDiagram } from "@/components/landing/devops-loop-hero-diagram";
import { ModuleProgressCard } from "@/components/progress/module-progress-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getCourseBySlug, getPhasesWithModules } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { getUserProgressSnapshot } from "@/lib/progress/user-progress-snapshot";

type CoursePageProps = PageProps<"/courses/[courseSlug]">;

/** Optional illustration shown under a course's intro. */
const courseHeroDiagrams: Partial<Record<string, () => React.JSX.Element>> = {
  "devops-cloud": DevopsLoopHeroDiagram,
};

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { courseSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  return { title: course ? `Lộ trình ${course.title}` : undefined };
}

export default async function CourseRoadmapPage({ params }: CoursePageProps) {
  const { courseSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  if (!course) notFound();

  const session = await getCurrentSession();
  const snapshot = session ? await getUserProgressSnapshot(session.user.id) : null;
  const courseProgress = snapshot?.courseProgressById.get(course.id);
  const phases = getPhasesWithModules(course.id);
  const HeroDiagram = courseHeroDiagrams[course.id];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/" className="text-sm text-stone-500 hover:text-indigo-600">
        ← Các khoá học
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
        {course.emoji} Lộ trình {course.title}
      </h1>
      <p className="mt-2 max-w-2xl text-stone-600 dark:text-stone-400">
        {course.weeksTotal} tuần, ~{course.hoursPerWeek} giờ mỗi tuần. {course.description} Đi lần lượt từng chặng — mỗi module có bài học giải thích dễ hiểu, lab
        thực hành và quiz.
      </p>
      {courseProgress && (
        <div className="mt-5 flex max-w-md items-center gap-3">
          <ProgressBar percent={courseProgress.percent} label={`Tiến độ ${course.title}`} />
          <span className="text-sm font-semibold">{courseProgress.percent}%</span>
        </div>
      )}
      {HeroDiagram && (
        <div className="mt-6 max-w-3xl rounded-3xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <HeroDiagram />
        </div>
      )}

      <ol className="mt-10 space-y-12">
        {phases.map((phase) => (
          <li key={phase.id} className="relative border-l-2 border-dashed border-stone-300 pl-6 dark:border-stone-700">
            <span className="absolute -left-[17px] top-0 flex size-8 items-center justify-center rounded-full bg-white text-lg ring-2 ring-stone-300 dark:bg-stone-900 dark:ring-stone-700">
              {phase.emoji}
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Phase {phase.order} · {phase.weeks}
            </p>
            <h2 className="text-xl font-bold">{phase.title}</h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{phase.description}</p>
            {phase.modules.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {phase.modules.map((learningModule) => (
                  <ModuleProgressCard key={learningModule.id} module={learningModule} progress={snapshot?.moduleProgressById.get(learningModule.id)} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm italic text-stone-500">Nội dung đang được biên soạn…</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
