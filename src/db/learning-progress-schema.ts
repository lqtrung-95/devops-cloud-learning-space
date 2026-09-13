import { index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

/**
 * One row per completed learning item.
 * itemKey format: `<moduleId>:lesson:<lessonSlug>` or `<moduleId>:lab:<labId>`.
 * Deleting the row = marking the item not done.
 */
export const progressItem = pgTable(
  "progress_item",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.itemKey] })],
);

/** Every quiz submission is kept so learners can see improvement over time. */
export const quizAttempt = pgTable(
  "quiz_attempt",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    answers: jsonb("answers").$type<number[]>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("quiz_attempt_user_module_idx").on(table.userId, table.moduleId)],
);
