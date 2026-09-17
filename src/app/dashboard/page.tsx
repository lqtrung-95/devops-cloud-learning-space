import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivityHeatmapGrid } from "@/components/progress/activity-heatmap-grid";
import { CourseProgressSection } from "@/components/progress/course-progress-section";
import { ReviewDueBanner } from "@/components/progress/review-due-banner";
import { buttonClassName } from "@/components/ui/button-styles";
import { getAllCourses, getCourseForModule, getModuleById, getModulesForCourse, getPhasesWithModules } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { buildActivityHeatmap } from "@/lib/progress/activity-heatmap-builder";
import { pickContinueCourseId } from "@/lib/progress/continue-course-picker";
import { getActivityDates, getLatestCompletedItem, getRecentQuizAttempts } from "@/lib/progress/learning-progress-repository";
import { lessonItemKey, parseItemKey } from "@/lib/progress/progress-item-keys";
import { QUIZ_PASS_PERCENT, toPercent } from "@/lib/progress/quiz-grader";
import { getUserProgressSnapshot } from "@/lib/progress/user-progress-snapshot";
import { getReviewQueueSnapshot } from "@/lib/review/review-queue-snapshot";

export const metadata: Metadata = { title: "Tiến độ của tôi" };

const HEATMAP_WEEKS = 12;

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const today = new Date();
  const since = new Date(today.getTime() - HEATMAP_WEEKS * 7 * 24 * 60 * 60 * 1000);
  const [snapshot, recentQuizzes, activityDates, latestItem] = await Promise.all([
    getUserProgressSnapshot(userId),
    getRecentQuizAttempts(userId),
    getActivityDates(userId, since),
    getLatestCompletedItem(userId),
  ]);

  // Derived from the already-loaded snapshot (bestQuizPercent !== null exactly when a quiz was
  // attempted — module-progress-calculator.ts) so this never re-runs `getBestQuizPercentByModule`.
  const eligibleModuleIds = new Set(
    [...snapshot.moduleProgressById].filter(([, progress]) => progress.bestQuizPercent !== null).map(([moduleId]) => moduleId),
  );
  const reviewQueue = await getReviewQueueSnapshot(userId, { eligibleModuleIds });

  const courses = getAllCourses();
  const courseSummaries = [...snapshot.courseProgressById.values()];
  const total = (pick: (summary: (typeof courseSummaries)[number]) => number) => courseSummaries.reduce((sum, summary) => sum + pick(summary), 0);
  const heatmap = buildActivityHeatmap(activityDates, today, HEATMAP_WEEKS);
  const activeDays = heatmap.flat().filter((day) => day.count > 0).length;

  // Last touched module = newer of the latest completed item and the latest quiz attempt.
  const latestQuiz = recentQuizzes[0];
  const lastActiveModuleId =
    latestQuiz && (!latestItem || latestQuiz.createdAt > latestItem.at) ? latestQuiz.moduleId : latestItem ? parseItemKey(latestItem.itemKey)?.moduleId : undefined;
  const lastActiveModule = lastActiveModuleId ? getModuleById(lastActiveModuleId) : undefined;
  const activeCourseId = pickContinueCourseId(
    courses.map((course) => course.id),
    snapshot.courseProgressById,
    lastActiveModule ? getCourseForModule(lastActiveModule).id : null,
  );
  const activeCourse = courses.find((course) => course.id === activeCourseId);
  const nextModule = activeCourse && getModulesForCourse(activeCourse.id).find((learningModule) => !snapshot.moduleProgressById.get(learningModule.id)?.isComplete);
  const nextLesson = nextModule?.lessons.find((lesson) => !snapshot.completedKeys.has(lessonItemKey(nextModule.id, lesson.slug)));
  const continueHref = nextModule && (nextLesson ? `/modules/${nextModule.slug}/lessons/${nextLesson.slug}` : `/modules/${nextModule.slug}`);

  const stats = [
    { label: "Module hoàn thành", value: `${total((summary) => summary.modulesDone)}/${total((summary) => summary.modulesTotal)}`, emoji: "🏅" },
    { label: "Bài học đã xong", value: `${total((summary) => summary.lessonsDone)}/${total((summary) => summary.lessonsTotal)}`, emoji: "📖" },
    { label: "Lab đã xong", value: `${total((summary) => summary.labsDone)}/${total((summary) => summary.labsTotal)}`, emoji: "🧪" },
    { label: `Ngày học (${HEATMAP_WEEKS} tuần)`, value: String(activeDays), emoji: "🔥" },
    {
      label: reviewQueue.newCount > 0 ? `Thẻ đến hạn (+${reviewQueue.newCount} mới)` : "Thẻ đến hạn",
      value: String(reviewQueue.dueCount),
      emoji: "🔁",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Chào {session.user.name || "bạn"} 👋</h1>
      <p className="mt-1 text-stone-600 dark:text-stone-400">Mỗi ngày một chút — kiên trì là chìa khoá.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

      {reviewQueue.dueCount > 0 && (
        <div className="mt-6">
          <ReviewDueBanner dueCount={reviewQueue.dueCount} newCount={reviewQueue.newCount} />
        </div>
      )}

      {nextModule && continueHref && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <div>
            <p className="text-sm font-medium text-indigo-100">
              {snapshot.courseProgressById.get(activeCourse.id)?.hasStarted ? "Tiếp tục học" : "Bắt đầu học"} · {activeCourse.title}
            </p>
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
        <div className="space-y-6">
          {courses.map((course) => (
            <CourseProgressSection
              key={course.id}
              course={course}
              phases={getPhasesWithModules(course.id)}
              courseProgress={snapshot.courseProgressById.get(course.id)!}
              moduleProgressById={snapshot.moduleProgressById}
            />
          ))}
        </div>

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
            <Link href="/#courses" className={buttonClassName("secondary", "mt-4 w-full")}>
              Các khoá học
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
