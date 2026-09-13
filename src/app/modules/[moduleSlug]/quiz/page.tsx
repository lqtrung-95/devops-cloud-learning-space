import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModuleBySlug, toPublicQuizQuestions } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { QUIZ_PASS_PERCENT } from "@/lib/progress/quiz-grader";
import { ModuleQuizRunner } from "./module-quiz-runner";

export async function generateMetadata({ params }: PageProps<"/modules/[moduleSlug]/quiz">): Promise<Metadata> {
  const { moduleSlug } = await params;
  const learningModule = getModuleBySlug(moduleSlug);
  return { title: learningModule ? `Quiz: ${learningModule.title}` : undefined };
}

export default async function ModuleQuizPage({ params }: PageProps<"/modules/[moduleSlug]/quiz">) {
  const { moduleSlug } = await params;
  const learningModule = getModuleBySlug(moduleSlug);
  if (!learningModule) notFound();
  const session = await getCurrentSession();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/modules/${learningModule.slug}`} className="text-sm text-stone-500 hover:text-indigo-600">
        ← {learningModule.title}
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">❓ Quiz: {learningModule.title}</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        {learningModule.quiz.length} câu · đạt từ {QUIZ_PASS_PERCENT}% trở lên để hoàn thành module. Làm lại bao nhiêu lần cũng được!
      </p>
      {session ? (
        <ModuleQuizRunner moduleSlug={learningModule.slug} questions={toPublicQuizQuestions(learningModule)} passPercent={QUIZ_PASS_PERCENT} />
      ) : (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-center dark:border-stone-800 dark:bg-stone-900">
          <p>
            <Link href="/login" className="font-semibold text-indigo-600 underline">
              Đăng nhập
            </Link>{" "}
            để làm quiz và lưu điểm.
          </p>
        </div>
      )}
    </div>
  );
}
