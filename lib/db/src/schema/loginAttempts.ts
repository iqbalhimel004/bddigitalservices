import { pgTable, text, integer, bigint } from "drizzle-orm/pg-core";

export const loginAttemptsTable = pgTable("login_attempts", {
  username: text("username").primaryKey(),
  failures: integer("failures").notNull().default(0),
  firstFailureAt: bigint("first_failure_at", { mode: "number" }).notNull(),
  lockedUntil: bigint("locked_until", { mode: "number" }).notNull().default(0),
});
