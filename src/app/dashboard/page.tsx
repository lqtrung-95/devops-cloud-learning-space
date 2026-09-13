import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivityHeatmapGrid } from "@/components/progress/activity-heatmap-grid";
import { buttonClassName } from "@/components/ui/button-styles";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getAllModules, getModuleById, getPhasesWithModules } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { buildActivityHeatmap } from "@/lib/progress/activity-heatmap-builder";
import { getActivityDates, getRecentQuizAttempts } from "@/lib/progress/learning-progress-repository";
import { lessonItemKey } from "@/lib/progress/progress-item-keys";
import { QUIZ_PASS_PERCENT, toPercent } from "@/lib/progress/quiz-grader";
import { getUserProgressSnapshot } from "@/lib/progress/user-progress-snapshot";

export const metadata: Metadata = { title: "Tiến độ của tôi" };

const HEATMAP_WEEKS = 12;

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const today = new Date();
  const since = new Date(today.getTime() - HEATMAP_WEEKS * 7 * 24 * 60 * 60 * 1000);
  const [snapshot, recentQuizzes, activityDates] = await Promise.all([
    getUserProgressSnapshot(userId),
    getRecentQuizAttempts(userId),
    getActivityDates(userId, since),
  ]);

  const modules = getAllModules();
  const completedModules = modules.filter((learningModule) => snapshot.moduleProgressById.get(learningModule.id)?.isComplete).length;
  const totalLessons = modules.reduce((sum, learningModule) => sum + learningModule.lessons.length, 0);
  const lessonsDone = modules.reduce((sum, learningModule) => sum + (snapshot.moduleProgressById.get(learningModule.id)?.lessonsDone ?? 0), 0);
  const heatmap = buildActivityHeatmap(activityDates, today, HEATMAP_WEEKS);
  const activeDays = heatmap.flat().filter((day) => day.count > 0).length;

  // Next step: first unfinished lesson in the first incomplete module.
  const nextModule = modules.find((learningModule) => !snapshot.moduleProgressById.get(learningModule.id)?.isComplete);
  const nextLesson = nextModule?.lessons.find((lesson) => !snapshot.completedKeys.has(lessonItemKey(nextModule.id, lesson.slug)));
  const continueHref = nextModule
    ? nextLesson
      ? `/modules/${nextModule.slug}/lessons/${nextLesson.slug}`
      : `/modules/${nextModule.slug}`
    : "/roadmap";

  const stats = [
    { label: "Tổng tiến độ", value: `${snapshot.overallPercent}%`, emoji: "📈" },
    { label: "Module hoàn thành", value: `${completedModules}/${modules.length}`, emoji: "🏅" },
    { label: "Bài học đã xong", value: `${lessonsDone}/${totalLessons}`, emoji: "📖" },
    { label: `Ngày học (${HEATMAP_WEEKS} tuần)`, value: String(activeDays), emoji: "🔥" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Chào {session.user.name || "bạn"} 👋</h1>
      <p className="mt-1 text-stone-600 dark:text-stone-400">Mỗi ngày một chút — kiên trì là chìa khoá.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-2xl" aria-hidden>
              {stat.emoji}
            </p>
            <p className="mt-2 text-2xl font-extrabold">{stat.value}</p>
            <p className="text-sm text-stone-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {nextModule && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <div>
            <p className="text-sm font-medium text-indigo-100">Tiếp tục học</p>
            <p className="text-xl font-bold">
              {nextModule.emoji} {nextModule.title}
              {nextLesson && <span className="font-medium text-indigo-100"> · {nextLesson.title}</span>}
            </p>
          </div>
          <Link href={continueHref} className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
            Học ngay →
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-lg font-bold">Tiến độ theo chặng</h2>
          <div className="mt-4 space-y-5">
            {getPhasesWithModules().map((phase) => (
              <div key={phase.id}>
                <p className="text-sm font-semibold">
                  {phase.emoji} Phase {phase.order}: {phase.title}
                </p>
                <div className="mt-2 space-y-2">
                  {phase.modules.map((learningModule) => {
                    const progress = snapshot.moduleProgressById.get(learningModule.id);
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
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-lg font-bold">🔥 Hoạt động</h2>
            <div className="mt-4">
              <ActivityHeatmapGrid weeks={heatmap} summary={`${activeDays} ngày có hoạt động học trong ${HEATMAP_WEEKS} tuần qua`} />
            </div>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-lg font-bold">❓ Quiz gần đây</h2>
            {recentQuizzes.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">Chưa làm quiz nào.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recentQuizzes.map((attempt) => {
                  const learningModule = getModuleById(attempt.moduleId);
                  const percent = toPercent(attempt.score, attempt.total);
                  return (
                    <li key={attempt.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{learningModule?.title ?? attempt.moduleId}</span>
                      <span className={percent >= QUIZ_PASS_PERCENT ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>{percent}%</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/roadmap" className={buttonClassName("secondary", "mt-4 w-full")}>
              Xem lộ trình
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
