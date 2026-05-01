import { pgTable, text, bigint } from "drizzle-orm/pg-core";

export const adminSessionsTable = pgTable("admin_sessions", {
  id: text("id").primaryKey(),
  csrfToken: text("csrf_token").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});

export type AdminSession = typeof adminSessionsTable.$inferSelect;
