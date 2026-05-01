import { pgTable, text, serial, timestamp, integer, boolean, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  nameBn: text("name_bn").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionBn: text("description_bn"),
  descriptionEn: text("description_en"),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  priceBdt: numeric("price_bdt", { precision: 10, scale: 2 }).notNull().default("0"),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  badge: text("badge"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("products_is_active_sort_idx").on(t.isActive, t.sortOrder),
  index("products_category_id_idx").on(t.categoryId),
]);

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
