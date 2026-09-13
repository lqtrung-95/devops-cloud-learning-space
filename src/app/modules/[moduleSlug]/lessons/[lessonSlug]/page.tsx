import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressItemCheckbox } from "@/components/progress/progress-item-checkbox";
import { getLessonContext } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { getCompletedItemKeys } from "@/lib/progress/learning-progress-repository";
import { lessonItemKey } from "@/lib/progress/progress-item-keys";
import { LessonCompletionFooter } from "./lesson-completion-footer";

type LessonPageProps = PageProps<"/modules/[moduleSlug]/lessons/[lessonSlug]">;

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { moduleSlug, lessonSlug } = await params;
  return { title: getLessonContext(moduleSlug, lessonSlug)?.lesson.title };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { moduleSlug, lessonSlug } = await params;
  const context = getLessonContext(moduleSlug, lessonSlug);
  if (!context) notFound();
  const { learningModule, lesson, index, previousLesson, nextLesson } = context;

  // Slugs are validated against the registry above, so this import only resolves known lesson files.
  const { default: LessonContent } = await import(`@/content/modules/${learningModule.slug}/lessons/${lesson.slug}.mdx`);

  const session = await getCurrentSession();
  const completedKeys = session ? await getCompletedItemKeys(session.user.id) : new Set<string>();
  const isSignedIn = Boolean(session);
  const currentItemKey = lessonItemKey(learningModule.id, lesson.slug);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-20 space-y-1" aria-label="Bài học trong module">
          <Link href={`/modules/${learningModule.slug}`} className="mb-3 block text-sm font-bold hover:text-indigo-600">
            {learningModule.emoji} {learningModule.title}
          </Link>
          {learningModule.lessons.map((item, itemIndex) => {
            const itemKey = lessonItemKey(learningModule.id, item.slug);
            const isCurrent = item.slug === lesson.slug;
            return (
              <div
                key={item.slug}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${isCurrent ? "bg-indigo-100 font-semibold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100" : ""}`}
              >
                <ProgressItemCheckbox itemKey={itemKey} completed={completedKeys.has(itemKey)} isSignedIn={isSignedIn} label={`Hoàn thành ${item.title}`} />
                <Link href={`/modules/${learningModule.slug}/lessons/${item.slug}`} className="min-w-0 flex-1 truncate hover:text-indigo-600">
                  {itemIndex + 1}. {item.title}
                </Link>
              </div>
            );
          })}
          <Link href={`/modules/${learningModule.slug}/quiz`} className="mt-3 block rounded-lg px-2 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950">
            ❓ Quiz cuối module
          </Link>
        </nav>
      </aside>

      <article className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          {learningModule.id.toUpperCase()} · Bài {index + 1}/{learningModule.lessons.length} · ⏱ {lesson.minutes} phút
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{lesson.title}</h1>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-400">{lesson.summary}</p>

        <div className="prose prose-stone mt-8 max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-headings:font-bold prose-a:text-indigo-600 prose-code:before:content-none prose-code:after:content-none prose-table:text-sm dark:prose-a:text-indigo-400">
          <LessonContent />
        </div>

        <LessonCompletionFooter
          itemKey={currentItemKey}
          initiallyCompleted={completedKeys.has(currentItemKey)}
          isSignedIn={isSignedIn}
          moduleSlug={learningModule.slug}
          previousLesson={previousLesson ? { slug: previousLesson.slug, title: previousLesson.title } : null}
          nextLesson={nextLesson ? { slug: nextLesson.slug, title: nextLesson.title } : null}
        />
      </article>
    </div>
  );
}
