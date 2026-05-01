import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const syncEventStatusEnum = pgEnum("sync_event_status", ["success", "failure", "skipped"]);

export const syncEventsTable = pgTable("sync_events", {
  id: serial("id").primaryKey(),
  status: syncEventStatusEnum("status").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SyncEvent = typeof syncEventsTable.$inferSelect;
