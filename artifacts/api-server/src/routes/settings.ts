import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";

const router: IRouter = Router();

function publicCache(maxAge: number, swr: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
    next();
  };
}

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

let defaultsInitialized: Promise<void> | null = null;

async function ensureDefaultSettings() {
  const rows = await db.select({ key: siteSettingsTable.key }).from(siteSettingsTable);
  const existingKeys = new Set(rows.map(r => r.key));
  const missing = Object.entries(DEFAULT_SETTINGS).filter(([k]) => !existingKeys.has(k));
  if (missing.length > 0) {
    await db.insert(siteSettingsTable).values(missing.map(([key, value]) => ({ key, value })));
  }
}

router.get("/settings", publicCache(120, 600), async (_req, res): Promise<void> => {
  if (!defaultsInitialized) {
    defaultsInitialized = ensureDefaultSettings().catch(() => { defaultsInitialized = null; });
  }
  await defaultsInitialized;
  const rows = await db.select().from(siteSettingsTable);
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
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

export default router;
