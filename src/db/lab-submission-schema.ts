import { boolean, index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { LabCheckOutcome } from "@/lib/progress/lab-submission-grader";
import { user } from "./auth-schema";

/**
 * One row per lab submission attempt (history, like `quiz_attempt`). A pass on an
 * auto-graded lab also writes a `progress_item` row — that table stays the single
 * source of truth for "is this lab done" so the progress calculator never changes.
 */
export const labSubmission = pgTable(
  "lab_submission",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull(),
    labId: text("lab_id").notNull(),
    /** Raw pasted evidence, capped by the action. Never rendered as HTML. */
    content: text("content").notNull(),
    passed: boolean("passed").notNull(),
    checkResults: jsonb("check_results").$type<LabCheckOutcome[]>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("lab_submission_user_lab_idx").on(table.userId, table.moduleId, table.labId)],
);
