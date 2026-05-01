import { Router, type IRouter } from "express";
import { eq, ne, and } from "drizzle-orm";
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
import { asc } from "drizzle-orm";

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
  const [cat] = await db.update(categoriesTable).set({
    ...parsed.data,
    sortOrder: parsed.data.sortOrder ?? 0,
    isActive: parsed.data.isActive ?? true,
  }).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!cat) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cat);
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
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
    priceBdt: toAsciiDigits(parsed.data.priceBdt),
    priceUsd: toAsciiDigits(parsed.data.priceUsd),
    badge: parsed.data.badge ?? null,
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
    priceBdt: toAsciiDigits(parsed.data.priceBdt),
    priceUsd: toAsciiDigits(parsed.data.priceUsd),
    badge: parsed.data.badge ?? null,
    isActive: parsed.data.isActive ?? true,
    sortOrder: parsed.data.sortOrder ?? 0,
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
const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: "BD Digital Services",
  whatsapp: "https://wa.me/8801572792499",
  telegram: "https://t.me/+8801572792499",
  facebook: "",
  bkashNumber: "01687476714",
  nagadNumber: "01687476714",
  rocketNumber: "01687476714",
  footerText: "© 2025 BD Digital Services. সকল অধিকার সংরক্ষিত।",
  primaryColor: "#7c3aed",
  secondaryColor: "#06b6d4",
  accentColor: "#f59e0b",
  heroBadge: "Premium Digital Products Marketplace",
  heroTitle: "Your Trusted Source For",
  heroTitleHighlight: "Digital Services",
  heroSubtitle: "বাংলাদেশের সবচেয়ে বিশ্বস্ত ডিজিটাল প্রোডাক্ট, একাউন্ট এবং কার্ড এর মার্কেটপ্লেস। দ্রুত ডেলিভারি এবং ২৪/৭ সাপোর্ট।",
  heroPrimaryBtn: "Browse Products",
  heroWhatsappBtn: "Order via WhatsApp",
  heroStat1Value: "1000+",
  heroStat1Label: "সন্তুষ্ট গ্রাহক",
  heroStat2Value: "15+",
  heroStat2Label: "প্রোডাক্ট",
  heroStat3Value: "24/7",
  heroStat3Label: "সাপোর্ট",
  heroStat4Value: "5-30 Min",
  heroStat4Label: "ডেলিভারি",
  howToOrderStep1Title: "Choose Product",
  howToOrderStep1Desc: "পছন্দের সার্ভিসটি সিলেক্ট করুন এবং প্রাইস চেক করুন।",
  howToOrderStep2Title: "Send Payment",
  howToOrderStep2Desc: "বিকাশ, নগদ বা রকেটে পেমেন্ট করে নিচের ফর্মটি ফিলাপ করুন।",
  howToOrderStep3Title: "Receive Account",
  howToOrderStep3Desc: "৫-৩০ মিনিটের মধ্যে হোয়াটসঅ্যাপে একাউন্ট বুঝে নিন।",
  whatsappGenericMsg: "Hello BD Digital Services, I want to order.",
  whatsappProductMsg: "Hello BD Digital Services, I want to order: {product} (Price: ৳{price}). Please guide me.",
  bkashEnabled: "true",
  nagadEnabled: "true",
  rocketEnabled: "true",
  bkashLabel: "bKash · Personal",
  nagadLabel: "Nagad · Personal",
  rocketLabel: "Rocket · Personal",
};

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(siteSettingsTable).set({ value: value as string }).where(eq(siteSettingsTable.key, key));
    } else {
      await db.insert(siteSettingsTable).values({ key, value: value as string });
    }
  }
  const rows = await db.select().from(siteSettingsTable);
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json({
    siteName: settings.siteName ?? DEFAULT_SETTINGS.siteName,
    whatsapp: settings.whatsapp ?? DEFAULT_SETTINGS.whatsapp,
    telegram: settings.telegram ?? DEFAULT_SETTINGS.telegram,
    facebook: settings.facebook ?? DEFAULT_SETTINGS.facebook,
    bkashNumber: settings.bkashNumber ?? DEFAULT_SETTINGS.bkashNumber,
    nagadNumber: settings.nagadNumber ?? DEFAULT_SETTINGS.nagadNumber,
    rocketNumber: settings.rocketNumber ?? DEFAULT_SETTINGS.rocketNumber,
    footerText: settings.footerText ?? DEFAULT_SETTINGS.footerText,
    primaryColor: settings.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
    secondaryColor: settings.secondaryColor ?? DEFAULT_SETTINGS.secondaryColor,
    accentColor: settings.accentColor ?? DEFAULT_SETTINGS.accentColor,
    heroBadge: settings.heroBadge ?? DEFAULT_SETTINGS.heroBadge,
    heroTitle: settings.heroTitle ?? DEFAULT_SETTINGS.heroTitle,
    heroTitleHighlight: settings.heroTitleHighlight ?? DEFAULT_SETTINGS.heroTitleHighlight,
    heroSubtitle: settings.heroSubtitle ?? DEFAULT_SETTINGS.heroSubtitle,
    heroPrimaryBtn: settings.heroPrimaryBtn ?? DEFAULT_SETTINGS.heroPrimaryBtn,
    heroWhatsappBtn: settings.heroWhatsappBtn ?? DEFAULT_SETTINGS.heroWhatsappBtn,
    heroStat1Value: settings.heroStat1Value ?? DEFAULT_SETTINGS.heroStat1Value,
    heroStat1Label: settings.heroStat1Label ?? DEFAULT_SETTINGS.heroStat1Label,
    heroStat2Value: settings.heroStat2Value ?? DEFAULT_SETTINGS.heroStat2Value,
    heroStat2Label: settings.heroStat2Label ?? DEFAULT_SETTINGS.heroStat2Label,
    heroStat3Value: settings.heroStat3Value ?? DEFAULT_SETTINGS.heroStat3Value,
    heroStat3Label: settings.heroStat3Label ?? DEFAULT_SETTINGS.heroStat3Label,
    heroStat4Value: settings.heroStat4Value ?? DEFAULT_SETTINGS.heroStat4Value,
    heroStat4Label: settings.heroStat4Label ?? DEFAULT_SETTINGS.heroStat4Label,
    howToOrderStep1Title: settings.howToOrderStep1Title ?? DEFAULT_SETTINGS.howToOrderStep1Title,
    howToOrderStep1Desc: settings.howToOrderStep1Desc ?? DEFAULT_SETTINGS.howToOrderStep1Desc,
    howToOrderStep2Title: settings.howToOrderStep2Title ?? DEFAULT_SETTINGS.howToOrderStep2Title,
    howToOrderStep2Desc: settings.howToOrderStep2Desc ?? DEFAULT_SETTINGS.howToOrderStep2Desc,
    howToOrderStep3Title: settings.howToOrderStep3Title ?? DEFAULT_SETTINGS.howToOrderStep3Title,
    howToOrderStep3Desc: settings.howToOrderStep3Desc ?? DEFAULT_SETTINGS.howToOrderStep3Desc,
    whatsappGenericMsg: settings.whatsappGenericMsg ?? DEFAULT_SETTINGS.whatsappGenericMsg,
    whatsappProductMsg: settings.whatsappProductMsg ?? DEFAULT_SETTINGS.whatsappProductMsg,
    bkashEnabled: settings.bkashEnabled ?? DEFAULT_SETTINGS.bkashEnabled,
    nagadEnabled: settings.nagadEnabled ?? DEFAULT_SETTINGS.nagadEnabled,
    rocketEnabled: settings.rocketEnabled ?? DEFAULT_SETTINGS.rocketEnabled,
    bkashLabel: settings.bkashLabel ?? DEFAULT_SETTINGS.bkashLabel,
    nagadLabel: settings.nagadLabel ?? DEFAULT_SETTINGS.nagadLabel,
    rocketLabel: settings.rocketLabel ?? DEFAULT_SETTINGS.rocketLabel,
  });
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
