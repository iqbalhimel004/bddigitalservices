import { Router, type IRouter } from "express";
import { eq, ne, and, count, sql } from "drizzle-orm";
import { db, categoriesTable, productsTable, siteSettingsTable, noticesTable } from "@workspace/db";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  UpdateCategoryParams,
  DeleteCategoryParams,
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
  UpdateSettingsBody,
  CreateNoticeBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { buildSettingsResponse } from "../lib/defaultSettings";

const router: IRouter = Router();

router.use(requireAdmin);

/**
 * Convert Bengali (০-৯) and Arabic-Indic (٠-٩) digits to ASCII digits
 * so that numeric strings typed in Bangla can be stored in PostgreSQL.
 */
function toAsciiDigits(value: string): string {
  return value
    .replace(/[০-৯]/g, (d) => String(d.codePointAt(0)! - 0x09e6))
    .replace(/[٠-٩]/g, (d) => String(d.codePointAt(0)! - 0x0660))
    .trim();
}

// ---- Category mutations ----
router.post("/categories", async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, parsed.data.slug))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: `Slug "${parsed.data.slug}" is already in use by another category.` });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values({
    ...parsed.data,
    sortOrder: parsed.data.sortOrder ?? 0,
    isActive: parsed.data.isActive ?? true,
  }).returning();
  res.status(201).json(cat);
});

router.put("/categories/:id", async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (parsed.data.slug !== undefined) {
    const existing = await db.select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.slug, parsed.data.slug), ne(categoriesTable.id, params.data.id)))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: `Slug "${parsed.data.slug}" is already in use by another category.` });
      return;
    }
  }
  // Only update fields that were explicitly provided; omitting sortOrder/isActive
  // must NOT reset them to defaults (bug #3: values were being reset to 0/true).
  const [cat] = await db.update(categoriesTable).set({
    nameBn: parsed.data.nameBn,
    nameEn: parsed.data.nameEn,
    slug: parsed.data.slug,
    icon: parsed.data.icon,
    ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
  }).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cat);
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await db
    .select({ linkedCount: count() })
    .from(productsTable)
    .where(eq(productsTable.categoryId, params.data.id));
  const linked = Number(row?.linkedCount ?? 0);
  if (linked > 0) {
    res.status(409).json({
      error: `This category has ${linked} linked product${linked === 1 ? "" : "s"}. Reassign or remove them before deleting.`,
    });
    return;
  }
  const [deleted] = await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

// ---- Product helpers ----
async function getProductFull(id: number) {
  const rows = await db.select({
    id: productsTable.id,
    nameBn: productsTable.nameBn,
    nameEn: productsTable.nameEn,
    descriptionBn: productsTable.descriptionBn,
    descriptionEn: productsTable.descriptionEn,
    categoryId: productsTable.categoryId,
    priceBdt: productsTable.priceBdt,
    priceUsd: productsTable.priceUsd,
    badge: productsTable.badge,
    logo: productsTable.logo,
    isActive: productsTable.isActive,
    sortOrder: productsTable.sortOrder,
    createdAt: productsTable.createdAt,
    categoryNameEn: categoriesTable.nameEn,
    categoryNameBn: categoriesTable.nameBn,
  }).from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ---- Product mutations ----
router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [product] = await db.insert(productsTable).values({
    nameBn: parsed.data.nameBn,
    nameEn: parsed.data.nameEn,
    descriptionBn: parsed.data.descriptionBn ?? null,
    descriptionEn: parsed.data.descriptionEn ?? null,
    categoryId: parsed.data.categoryId ?? null,
    priceBdt: toAsciiDigits(parsed.data.priceBdt) || "0",
    priceUsd: toAsciiDigits(parsed.data.priceUsd) || "0",
    badge: parsed.data.badge ?? null,
    logo: parsed.data.logo ?? null,
    isActive: parsed.data.isActive ?? true,
    sortOrder: parsed.data.sortOrder ?? 0,
  }).returning();
  res.status(201).json(await getProductFull(product.id));
});

router.put("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [product] = await db.update(productsTable).set({
    nameBn: parsed.data.nameBn,
    nameEn: parsed.data.nameEn,
    descriptionBn: parsed.data.descriptionBn ?? null,
    descriptionEn: parsed.data.descriptionEn ?? null,
    categoryId: parsed.data.categoryId ?? null,
    priceBdt: toAsciiDigits(parsed.data.priceBdt) || "0",
    priceUsd: toAsciiDigits(parsed.data.priceUsd) || "0",
    badge: parsed.data.badge ?? null,
    logo: parsed.data.logo ?? null,
    // Same fix as categories: don't reset isActive/sortOrder when omitted.
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
  }).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await getProductFull(product.id));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

// ---- Settings mutations ----
// Defaults live in ../lib/defaultSettings (bug #8 fix: the map was
// previously duplicated here and in routes/settings.ts).

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const upsertEntries = (Object.entries(parsed.data) as [string, string | undefined][])
    .filter((e): e is [string, string] => e[1] !== undefined);
  if (upsertEntries.length > 0) {
    await db
      .insert(siteSettingsTable)
      .values(upsertEntries.map(([key, value]) => ({ key, value })))
      .onConflictDoUpdate({
        target: siteSettingsTable.key,
        set: { value: sql`excluded.value`, updatedAt: new Date() },
      });
  }
  const rows = await db.select().from(siteSettingsTable);
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(buildSettingsResponse(settings));
});

// ---- Notice mutations (POST + PUT both work) ----
async function createActiveNotice(messageBn: string, messageEn: string, isActive: boolean) {
  await db.update(noticesTable).set({ isActive: false }).where(eq(noticesTable.isActive, true));
  const [notice] = await db.insert(noticesTable).values({ messageBn, messageEn, isActive }).returning();
  return notice;
}

router.post("/notice", async (req, res): Promise<void> => {
  const parsed = CreateNoticeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  res.json(await createActiveNotice(parsed.data.messageBn, parsed.data.messageEn, parsed.data.isActive ?? true));
});

router.put("/notice", async (req, res): Promise<void> => {
  const parsed = CreateNoticeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  res.json(await createActiveNotice(parsed.data.messageBn, parsed.data.messageEn, parsed.data.isActive ?? true));
});

export default router;
