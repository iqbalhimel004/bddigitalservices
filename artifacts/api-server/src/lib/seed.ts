import { db, categoriesTable, productsTable } from "@workspace/db";
import { count } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_CATEGORIES = [
  { nameBn: "এআই একাউন্ট", nameEn: "AI Accounts", slug: "ai-accounts", icon: "🤖", sortOrder: 1, isActive: true },
  { nameBn: "ডেভেলপার টুলস", nameEn: "Developer Tools", slug: "developer-tools", icon: "💻", sortOrder: 2, isActive: true },
  { nameBn: "ক্লাউড ও হোস্টিং", nameEn: "Cloud & Hosting", slug: "cloud-hosting", icon: "☁️", sortOrder: 3, isActive: true },
  { nameBn: "ভার্চুয়াল কার্ড ও পেমেন্ট", nameEn: "Virtual Cards & Payments", slug: "virtual-cards", icon: "💳", sortOrder: 4, isActive: true },
  { nameBn: "ডোমেইন নাম", nameEn: "Domain Names", slug: "domain-names", icon: "🌐", sortOrder: 5, isActive: true },
  { nameBn: "ক্রিপ্টো ও ফাইন্যান্স", nameEn: "Crypto & Finance", slug: "crypto-finance", icon: "₿", sortOrder: 6, isActive: true },
];

const DEFAULT_PRODUCTS = [
  // AI Accounts (categorySlug: ai-accounts)
  { nameBn: "চ্যাটজিপিটি গো", nameEn: "ChatGPT Go", descriptionBn: "OpenAI ChatGPT Go একাউন্ট - প্রিমিয়াম AI চ্যাটবট সেবা", descriptionEn: "OpenAI ChatGPT Go account - Premium AI chatbot service", categorySlug: "ai-accounts", priceBdt: "800", priceUsd: "7.00", badge: "Popular", isActive: true, sortOrder: 1 },
  { nameBn: "চ্যাটজিপিটি প্লাস", nameEn: "ChatGPT Plus", descriptionBn: "OpenAI ChatGPT Plus একাউন্ট - GPT-4 সহ সম্পূর্ণ সুবিধা", descriptionEn: "OpenAI ChatGPT Plus - Full access with GPT-4", categorySlug: "ai-accounts", priceBdt: "1500", priceUsd: "13.99", badge: "Hot", isActive: true, sortOrder: 2 },
  { nameBn: "সুপার গ্রোক", nameEn: "Super Grok", descriptionBn: "xAI Grok সুপার একাউন্ট - Elon Musk-এর AI সহকারী", descriptionEn: "xAI Super Grok account - Elon Musk AI assistant", categorySlug: "ai-accounts", priceBdt: "1200", priceUsd: "10.99", badge: "New", isActive: true, sortOrder: 3 },
  { nameBn: "গুগল এআই প্রো", nameEn: "Google AI Pro", descriptionBn: "Google One AI Premium - Gemini Ultra সহ সকল সুবিধা", descriptionEn: "Google One AI Premium - Full Gemini Ultra access", categorySlug: "ai-accounts", priceBdt: "1200", priceUsd: "10.99", badge: null, isActive: true, sortOrder: 4 },
  { nameBn: "ভিও ৩ একাউন্ট", nameEn: "Veo 3 Account", descriptionBn: "Google Veo 3 AI ভিডিও জেনারেটর একাউন্ট", descriptionEn: "Google Veo 3 AI video generator account", categorySlug: "ai-accounts", priceBdt: "2000", priceUsd: "18.99", badge: "New", isActive: true, sortOrder: 5 },
  { nameBn: "লাভেবল প্রো", nameEn: "Lovable Pro", descriptionBn: "Lovable.dev প্রো একাউন্ট - AI দিয়ে অ্যাপ তৈরি করুন", descriptionEn: "Lovable.dev Pro account - Build apps with AI", categorySlug: "ai-accounts", priceBdt: "900", priceUsd: "8.99", badge: null, isActive: true, sortOrder: 6 },
  { nameBn: "অ্যান্টিগ্র্যাভিটি প্রো", nameEn: "Antigravity Pro", descriptionBn: "Antigravity Pro একাউন্ট - AI পাওয়ার্ড টুল", descriptionEn: "Antigravity Pro account - AI powered tool", categorySlug: "ai-accounts", priceBdt: "700", priceUsd: "6.99", badge: null, isActive: true, sortOrder: 7 },
  // Developer Tools
  { nameBn: "রেপলিট কোর প্রো", nameEn: "Replit Core Pro", descriptionBn: "Replit Core Pro একাউন্ট - AI কোডিং সহকারী ও ক্লাউড IDE", descriptionEn: "Replit Core Pro - AI coding assistant and cloud IDE", categorySlug: "developer-tools", priceBdt: "1800", priceUsd: "16.99", badge: "Popular", isActive: true, sortOrder: 8 },
  { nameBn: "গিটহাব কোপাইলট প্রো", nameEn: "GitHub Copilot Pro", descriptionBn: "GitHub Copilot Pro - AI কোড কমপ্লিশন ও সাজেশন", descriptionEn: "GitHub Copilot Pro - AI code completion and suggestions", categorySlug: "developer-tools", priceBdt: "1100", priceUsd: "10.00", badge: null, isActive: true, sortOrder: 9 },
  // Cloud & Hosting
  { nameBn: "ডিজিটালওশেন ২০০ ডলার", nameEn: "DigitalOcean $200 Account", descriptionBn: "DigitalOcean $200 ক্রেডিট একাউন্ট - ক্লাউড সার্ভার হোস্টিং", descriptionEn: "DigitalOcean $200 credit account - Cloud server hosting", categorySlug: "cloud-hosting", priceBdt: "500", priceUsd: "4.99", badge: "Hot", isActive: true, sortOrder: 10 },
  // Domain Names
  { nameBn: "ডোমেইন নাম", nameEn: "Domain Name", descriptionBn: "সকল এক্সটেনশনে কম দামে ডোমেইন নাম - .com, .net, .org, .xyz, .bd", descriptionEn: "Cheap domain names - .com, .net, .org, .xyz, .bd extensions", categorySlug: "domain-names", priceBdt: "700", priceUsd: "6.99", badge: null, isActive: true, sortOrder: 11 },
  // Virtual Cards & Payments
  { nameBn: "ভার্চুয়াল ক্রেডিট কার্ড", nameEn: "Virtual Credit Card (VCC)", descriptionBn: "যেকোনো কাজে ব্যবহারযোগ্য ভার্চুয়াল ক্রেডিট কার্ড", descriptionEn: "Virtual credit card usable for any online payment", categorySlug: "virtual-cards", priceBdt: "300", priceUsd: "2.99", badge: "Popular", isActive: true, sortOrder: 12 },
  { nameBn: "ভিসিসি ডলার লোড", nameEn: "VCC Dollar Load", descriptionBn: "ভার্চুয়াল কার্ডে যেকোনো পরিমাণ ডলার লোড করুন", descriptionEn: "Load any amount of dollars into your virtual card", categorySlug: "virtual-cards", priceBdt: "0", priceUsd: "0.00", badge: null, isActive: true, sortOrder: 13 },
  { nameBn: "অনলাইন পেমেন্ট সার্ভিস", nameEn: "Online Payment Service", descriptionBn: "যেকোনো ধরনের অনলাইন পেমেন্ট - PayPal, Stripe, ইত্যাদি", descriptionEn: "Any type of online payment - PayPal, Stripe, and more", categorySlug: "virtual-cards", priceBdt: "0", priceUsd: "0.00", badge: null, isActive: true, sortOrder: 14 },
  // Crypto & Finance
  { nameBn: "বাইন্যান্স ডলার বিক্রি", nameEn: "Binance Dollar Sale", descriptionBn: "Binance USDT/BUSD বাংলাদেশি টাকায় বিক্রি - সর্বনিম্ন রেটে", descriptionEn: "Sell Binance USDT/BUSD in Bangladeshi Taka - Best rates", categorySlug: "crypto-finance", priceBdt: "0", priceUsd: "0.00", badge: "Popular", isActive: true, sortOrder: 15 },
];

export async function seedDefaultData(): Promise<void> {
  try {
    // Check if data already exists
    const [catCount] = await db.select({ count: count() }).from(categoriesTable);
    const [prodCount] = await db.select({ count: count() }).from(productsTable);

    if (Number(catCount?.count) === 0) {
      logger.info("Seeding default categories...");
      await db.insert(categoriesTable).values(DEFAULT_CATEGORIES);
      logger.info({ count: DEFAULT_CATEGORIES.length }, "Categories seeded");
    }

    if (Number(prodCount?.count) === 0) {
      logger.info("Seeding default products...");
      // Fetch all categories to map slug → id
      const allCats = await db.select().from(categoriesTable);
      const catBySlug: Record<string, number> = {};
      for (const c of allCats) catBySlug[c.slug] = c.id;

      const productsToInsert = DEFAULT_PRODUCTS.map(({ categorySlug, ...rest }) => ({
        ...rest,
        categoryId: catBySlug[categorySlug] ?? null,
      }));
      await db.insert(productsTable).values(productsToInsert);
      logger.info({ count: productsToInsert.length }, "Products seeded");
    }
  } catch (err) {
    logger.warn({ err }, "Seed failed (non-fatal)");
  }
}
