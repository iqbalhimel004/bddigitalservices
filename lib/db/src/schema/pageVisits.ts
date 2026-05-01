import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";

export const pageVisitsTable = pgTable("page_visits", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  pagePath: text("page_path").notNull(),
  referrer: text("referrer"),
  deviceType: text("device_type").notNull(),
  browser: text("browser").notNull(),
  ipHash: text("ip_hash").notNull(),
  country: text("country"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("page_visits_created_at_idx").on(t.createdAt),
  index("page_visits_session_created_idx").on(t.sessionId, t.createdAt),
  index("page_visits_page_path_idx").on(t.pagePath),
  index("page_visits_country_idx").on(t.country),
]);

export type PageVisit = typeof pageVisitsTable.$inferSelect;
export type InsertPageVisit = typeof pageVisitsTable.$inferInsert;
