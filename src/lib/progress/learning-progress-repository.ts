import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/database-client";
import { progressItem, quizAttempt } from "@/db/learning-progress-schema";

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
