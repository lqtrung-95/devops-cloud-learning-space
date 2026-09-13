"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getModuleBySlug, isKnownProgressItemKey } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { insertQuizAttempt, setProgressItemCompleted } from "@/lib/progress/learning-progress-repository";
import { gradeQuiz, type QuizGradeResult } from "@/lib/progress/quiz-grader";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const toggleSchema = z.object({ itemKey: z.string().max(120), completed: z.boolean() });

/** Marks a lesson or lab as done/not done for the signed-in user. */
export async function toggleProgressItemAction(input: { itemKey: string; completed: boolean }): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "Bạn cần đăng nhập để lưu tiến độ." };

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success || !isKnownProgressItemKey(parsed.data.itemKey)) {
    return { ok: false, error: "Mục học không hợp lệ." };
  }

  try {
    await setProgressItemCompleted(session.user.id, parsed.data.itemKey, parsed.data.completed);
  } catch (error) {
    console.error("toggleProgressItemAction failed", error);
    return { ok: false, error: "Không lưu được tiến độ, thử lại sau." };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const quizSchema = z.object({ moduleSlug: z.string().max(80), answers: z.array(z.number().int().min(0).max(20)).max(50) });

/** Grades a quiz on the server (answer key never leaves the server) and stores the attempt. */
export async function submitQuizAction(input: { moduleSlug: string; answers: number[] }): Promise<ActionResult<QuizGradeResult>> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "Bạn cần đăng nhập để nộp bài quiz." };

  const parsed = quizSchema.safeParse(input);
  const learningModule = parsed.success ? getModuleBySlug(parsed.data.moduleSlug) : undefined;
  if (!parsed.success || !learningModule || parsed.data.answers.length !== learningModule.quiz.length) {
    return { ok: false, error: "Bài quiz không hợp lệ." };
  }

  const grade = gradeQuiz(learningModule.quiz, parsed.data.answers);
  try {
    await insertQuizAttempt({
      userId: session.user.id,
      moduleId: learningModule.id,
      score: grade.score,
      total: grade.total,
      answers: parsed.data.answers,
    });
  } catch (error) {
    console.error("submitQuizAction failed", error);
    return { ok: false, error: "Không lưu được kết quả, thử lại sau." };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: grade };
}
