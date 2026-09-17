"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getModuleById, getModuleBySlug, isKnownProgressItemKey } from "@/content/curriculum-lookup";
import { getCurrentSession } from "@/lib/auth/auth-server";
import { LAB_SUBMISSION_MAX_LENGTH, gradeLabSubmission, type LabCheckOutcome } from "@/lib/progress/lab-submission-grader";
import { insertLabSubmission, insertQuizAttempt, setProgressItemCompleted } from "@/lib/progress/learning-progress-repository";
import { labItemKey, parseItemKey } from "@/lib/progress/progress-item-keys";
import { gradeQuiz, type QuizGradeResult } from "@/lib/progress/quiz-grader";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const toggleSchema = z.object({ itemKey: z.string().max(120), completed: z.boolean() });

/** True when `itemKey` names an auto-graded lab (has a submission spec with ≥1 check) — those can only be completed via `submitLabAction`. */
function isAutoGradedLabKey(itemKey: string): boolean {
  const parsed = parseItemKey(itemKey);
  if (!parsed || parsed.kind !== "lab") return false;
  const lab = getModuleById(parsed.moduleId)?.labs.find((candidate) => candidate.id === parsed.id);
  return Boolean(lab?.submission && lab.submission.checks.length > 0);
}

/** Marks a lesson or lab as done/not done for the signed-in user. */
export async function toggleProgressItemAction(input: { itemKey: string; completed: boolean }): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "Bạn cần đăng nhập để lưu tiến độ." };

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success || !isKnownProgressItemKey(parsed.data.itemKey)) {
    return { ok: false, error: "Mục học không hợp lệ." };
  }

  // Auto-graded labs can only be marked done by passing `submitLabAction`; resetting (completed: false) stays allowed.
  if (parsed.data.completed && isAutoGradedLabKey(parsed.data.itemKey)) {
    return { ok: false, error: "Lab này cần nộp kết quả để hoàn thành." };
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

const submitLabSchema = z.object({
  moduleSlug: z.string().max(80),
  labId: z.string().max(80),
  // trim + min(1): an empty/whitespace-only paste must never satisfy an evidence-only lab
  // (checks: [] grades as autoGraded: false regardless of content, so this is the only guard).
  content: z.string().trim().min(1).max(LAB_SUBMISSION_MAX_LENGTH),
});

export interface SubmitLabResult {
  passed: boolean;
  autoGraded: boolean;
  outcomes: LabCheckOutcome[];
}

/** Grades a lab submission on the server (matchers never leave the server), stores it, and marks the lab done on pass. */
export async function submitLabAction(input: { moduleSlug: string; labId: string; content: string }): Promise<ActionResult<SubmitLabResult>> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "Bạn cần đăng nhập để nộp kết quả lab." };

  const parsed = submitLabSchema.safeParse(input);
  const learningModule = parsed.success ? getModuleBySlug(parsed.data.moduleSlug) : undefined;
  const lab = parsed.success ? learningModule?.labs.find((candidate) => candidate.id === parsed.data.labId) : undefined;
  if (!parsed.success || !learningModule || !lab || !lab.submission) {
    return { ok: false, error: "Lab không hợp lệ." };
  }

  const grade = gradeLabSubmission(lab.submission, parsed.data.content);

  try {
    // Write the evidence row first: if the progress write below fails, the learner still has a
    // stored passing submission and can resubmit to re-trigger it (never the reverse order).
    await insertLabSubmission({
      userId: session.user.id,
      moduleId: learningModule.id,
      labId: lab.id,
      content: parsed.data.content,
      passed: grade.passed,
      checkResults: grade.outcomes,
    });
    if (grade.passed || !grade.autoGraded) {
      await setProgressItemCompleted(session.user.id, labItemKey(learningModule.id, lab.id), true);
    }
  } catch (error) {
    console.error("submitLabAction failed", error);
    return { ok: false, error: "Không lưu được kết quả, thử lại sau." };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { passed: grade.passed, autoGraded: grade.autoGraded, outcomes: grade.outcomes } };
}
