import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LabChecklistCard } from "@/components/progress/lab-checklist-card";
import { ProgressItemCheckbox } from "@/components/progress/progress-item-checkbox";
import { buttonClassName } from "@/components/ui/button-styles";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getCourseForModule, getModuleBySlug } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { labItemKey, lessonItemKey } from "@/lib/progress/progress-item-keys";
import { QUIZ_PASS_PERCENT } from "@/lib/progress/quiz-grader";
import { getUserProgressSnapshot } from "@/lib/progress/user-progress-snapshot";

const resourceKindEmoji = { doc: "📄", book: "📚", course: "🎓", tool: "🛠️", video: "🎬", practice: "🏋️" } as const;

export async function generateMetadata({ params }: PageProps<"/modules/[moduleSlug]">): Promise<Metadata> {
  const { moduleSlug } = await params;
  return { title: getModuleBySlug(moduleSlug)?.title };
}

export default async function ModuleOverviewPage({ params }: PageProps<"/modules/[moduleSlug]">) {
  const { moduleSlug } = await params;
  const learningModule = getModuleBySlug(moduleSlug);
  if (!learningModule) notFound();
  const course = getCourseForModule(learningModule);

  const session = await getCurrentSession();
  const snapshot = await getUserProgressSnapshot(session?.user.id ?? null);
  const progress = snapshot.moduleProgressById.get(learningModule.id)!;
  const isSignedIn = Boolean(session);
  const firstUnfinishedLesson = learningModule.lessons.find(
    (lesson) => !snapshot.completedKeys.has(lessonItemKey(learningModule.id, lesson.slug)),
  );
  const firstUnfinishedLab = learningModule.labs.find((lab) => !snapshot.completedKeys.has(labItemKey(learningModule.id, lab.id)));

  // "Học tiếp" moves to whatever's next: a lesson, then a lab (same page, so just
  // scroll to it), then the quiz — not back to lesson 1 once lessons are all done.
  const primaryCta = firstUnfinishedLesson
    ? { href: `/modules/${learningModule.slug}/lessons/${firstUnfinishedLesson.slug}`, label: progress.lessonsDone > 0 ? "Học tiếp →" : "Bắt đầu học →" }
    : firstUnfinishedLab
      ? { href: "#labs", label: "Làm lab →" }
      : !progress.quizPassed
        ? { href: `/modules/${learningModule.slug}/quiz`, label: "Làm quiz →" }
        : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href={`/courses/${course.slug}`} className="text-sm text-stone-500 hover:text-indigo-600">
        ← Lộ trình {course.title}
      </Link>

      <header className="mt-4 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-5xl" aria-hidden>
            {learningModule.emoji}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {learningModule.id.toUpperCase()} · {learningModule.weeks}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight">{learningModule.title}</h1>
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 leading-relaxed text-stone-800 dark:bg-amber-950/30 dark:text-stone-200">
          <span className="font-semibold">🧸 Hiểu nhanh: </span>
          {learningModule.eli5Summary}
        </p>
        {isSignedIn && (
          <div className="mt-5 flex items-center gap-3">
            <ProgressBar percent={progress.percent} />
            <span className="text-sm font-semibold">{progress.percent}%</span>
          </div>
        )}
        {primaryCta ? (
          <Link href={primaryCta.href} className={buttonClassName("primary", "mt-5")}>
            {primaryCta.label}
          </Link>
        ) : (
          isSignedIn && <p className="mt-5 font-semibold text-emerald-600 dark:text-emerald-400">🎉 Module đã hoàn thành!</p>
        )}
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-bold">🎯 Sau module này bạn sẽ</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {learningModule.objectives.map((objective) => (
            <li key={objective} className="flex gap-2 rounded-xl bg-white p-3 text-sm dark:bg-stone-900">
              <span aria-hidden>✔️</span>
              {objective}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">
          📖 Bài học <span className="text-base font-medium text-stone-500">({progress.lessonsDone}/{progress.lessonsTotal})</span>
        </h2>
        <ol className="mt-3 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
          {learningModule.lessons.map((lesson, index) => {
            const itemKey = lessonItemKey(learningModule.id, lesson.slug);
            return (
              <li key={lesson.slug} className="flex items-center gap-3 p-4">
                <ProgressItemCheckbox itemKey={itemKey} completed={snapshot.completedKeys.has(itemKey)} isSignedIn={isSignedIn} label={`Hoàn thành ${lesson.title}`} />
                <Link href={`/modules/${learningModule.slug}/lessons/${lesson.slug}`} className="group min-w-0 flex-1">
                  <p className="font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {index + 1}. {lesson.title}
                  </p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">{lesson.summary}</p>
                </Link>
                <span className="shrink-0 text-xs text-stone-500">⏱ {lesson.minutes}′</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section id="labs" className="mt-10 scroll-mt-20">
        <h2 className="text-xl font-bold">
          🧪 Lab thực hành <span className="text-base font-medium text-stone-500">({progress.labsDone}/{progress.labsTotal})</span>
        </h2>
        <div className="mt-3 space-y-3">
          {learningModule.labs.map((lab, index) => {
            const itemKey = labItemKey(learningModule.id, lab.id);
            return (
              <LabChecklistCard key={lab.id} lab={lab} index={index} itemKey={itemKey} completed={snapshot.completedKeys.has(itemKey)} isSignedIn={isSignedIn} />
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-bold">📦 Sản phẩm cần có</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{learningModule.deliverable}</p>
          <h3 className="mt-4 font-bold">✅ Tiêu chí đạt</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">{learningModule.successCriteria}</p>
        </div>
        <div className="flex flex-col rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
          <h2 className="font-bold">❓ Quiz cuối module</h2>
          <p className="mt-2 flex-1 text-sm text-stone-700 dark:text-stone-300">
            {learningModule.quiz.length} câu hỏi · cần đạt ≥ {QUIZ_PASS_PERCENT}% để hoàn thành module.
            {progress.bestQuizPercent !== null && (
              <span className="mt-1 block font-semibold">
                Điểm cao nhất: {progress.bestQuizPercent}% {progress.quizPassed ? "🎉" : ""}
              </span>
            )}
          </p>
          <Link href={`/modules/${learningModule.slug}/quiz`} className={buttonClassName("primary", "mt-4 self-start")}>
            Làm quiz
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">📚 Tài liệu tham khảo</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {learningModule.resources.map((resource) => (
            <li key={resource.url}>
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-3 text-sm hover:border-indigo-300 dark:border-stone-800 dark:bg-stone-900"
              >
                <span aria-hidden>{resourceKindEmoji[resource.kind]}</span>
                <span className="flex-1">{resource.title}</span>
                <span className="text-stone-400" aria-hidden>
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
