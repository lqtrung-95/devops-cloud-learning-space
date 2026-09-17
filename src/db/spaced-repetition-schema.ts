import { index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

/**
 * One row per (user, card) SM-2 scheduling state. `card_id` = `<moduleId>:card:<questionId>`
 * (see `src/lib/review/flashcard-card-keys.ts`); it is written only after passing
 * `isKnownFlashcardId` in the server action, never trusted from the client here.
 * Ease factor is stored as an integer ×100 (e.g. 250 = 2.50) — exact and driver-identical,
 * unlike `numeric` (string) or `real` (float4) across the two Postgres drivers this app uses.
 * `module_id` is denormalized (same move as `quiz_attempt`) for cheap per-module counts.
 */
export const cardReviewState = pgTable(
  "card_review_state",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id").notNull(),
    moduleId: text("module_id").notNull(),
    easeFactorBasisPoints: integer("ease_factor_basis_points").notNull().default(250),
    intervalDays: integer("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: timestamp("due_at").notNull(),
    lastReviewedAt: timestamp("last_reviewed_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.cardId] }),
    index("card_review_state_user_due_idx").on(table.userId, table.dueAt),
  ],
);
