import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/database-client";
import { labSubmission } from "@/db/lab-submission-schema";
import { progressItem, quizAttempt } from "@/db/learning-progress-schema";
import type { LabCheckOutcome } from "./lab-submission-grader";

/** Database access for learner progress. All functions are scoped to one user. */

export async function getCompletedItemKeys(userId: string): Promise<Set<string>> {
  const rows = await db.select({ itemKey: progressItem.itemKey }).from(progressItem).where(eq(progressItem.userId, userId));
  return new Set(rows.map((row) => row.itemKey));
}

export async function setProgressItemCompleted(userId: string, itemKey: string, completed: boolean): Promise<void> {
  if (completed) {
    await db.insert(progressItem).values({ userId, itemKey }).onConflictDoNothing();
  } else {
    await db.delete(progressItem).where(and(eq(progressItem.userId, userId), eq(progressItem.itemKey, itemKey)));
  }
}

export async function insertQuizAttempt(input: { userId: string; moduleId: string; score: number; total: number; answers: number[] }) {
  await db.insert(quizAttempt).values(input);
}

/** Best quiz percent per module id, e.g. { m01: 90 }. */
export async function getBestQuizPercentByModule(userId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({
      moduleId: quizAttempt.moduleId,
      bestPercent: sql<number>`max(round(${quizAttempt.score} * 100.0 / nullif(${quizAttempt.total}, 0)))::int`,
    })
    .from(quizAttempt)
    .where(eq(quizAttempt.userId, userId))
    .groupBy(quizAttempt.moduleId);
  return new Map(rows.map((row) => [row.moduleId, row.bestPercent ?? 0]));
}

export async function getRecentQuizAttempts(userId: string, limit = 5) {
  return db
    .select({ id: quizAttempt.id, moduleId: quizAttempt.moduleId, score: quizAttempt.score, total: quizAttempt.total, createdAt: quizAttempt.createdAt })
    .from(quizAttempt)
    .where(eq(quizAttempt.userId, userId))
    .orderBy(desc(quizAttempt.createdAt))
    .limit(limit);
}

/** The most recently completed lesson/lab, or null if the user has completed nothing. */
export async function getLatestCompletedItem(userId: string): Promise<{ itemKey: string; at: Date } | null> {
  const [row] = await db
    .select({ itemKey: progressItem.itemKey, at: progressItem.completedAt })
    .from(progressItem)
    .where(eq(progressItem.userId, userId))
    .orderBy(desc(progressItem.completedAt))
    .limit(1);
  return row ?? null;
}

/** Stores one graded (or evidence-only) lab submission attempt. */
export async function insertLabSubmission(input: {
  userId: string;
  moduleId: string;
  labId: string;
  content: string;
  passed: boolean;
  checkResults: LabCheckOutcome[];
}): Promise<void> {
  await db.insert(labSubmission).values(input);
}

/** Newest-first submission history for one lab, for the panel's history strip. */
export async function getLabSubmissions(userId: string, moduleId: string, labId: string, limit = 5) {
  return db
    .select({
      id: labSubmission.id,
      passed: labSubmission.passed,
      checkResults: labSubmission.checkResults,
      content: labSubmission.content,
      createdAt: labSubmission.createdAt,
    })
    .from(labSubmission)
    .where(and(eq(labSubmission.userId, userId), eq(labSubmission.moduleId, moduleId), eq(labSubmission.labId, labId)))
    .orderBy(desc(labSubmission.createdAt))
    .limit(limit);
}

/** Latest submission row per labId in one module — one query instead of N for SSR of the module page. */
export async function getLatestLabSubmissionsForModule(userId: string, moduleId: string) {
  const rows = await db
    .selectDistinctOn([labSubmission.labId], {
      labId: labSubmission.labId,
      id: labSubmission.id,
      passed: labSubmission.passed,
      checkResults: labSubmission.checkResults,
      content: labSubmission.content,
      createdAt: labSubmission.createdAt,
    })
    .from(labSubmission)
    .where(and(eq(labSubmission.userId, userId), eq(labSubmission.moduleId, moduleId)))
    .orderBy(labSubmission.labId, desc(labSubmission.createdAt));
  return new Map(rows.map(({ labId, ...row }) => [labId, row]));
}

/** Timestamps of all learning activity (completed items + quiz attempts) since `since`. */
export async function getActivityDates(userId: string, since: Date): Promise<Date[]> {
  const [items, attempts] = await Promise.all([
    db
      .select({ at: progressItem.completedAt })
      .from(progressItem)
      .where(and(eq(progressItem.userId, userId), gte(progressItem.completedAt, since))),
    db
      .select({ at: quizAttempt.createdAt })
      .from(quizAttempt)
      .where(and(eq(quizAttempt.userId, userId), gte(quizAttempt.createdAt, since))),
  ]);
  return [...items, ...attempts].map((row) => row.at);
}
