/**
 * Single source of truth for site settings defaults (bug #8 fix).
 * Previously this map was duplicated in routes/settings.ts and
 * routes/admin-writes.ts, which risked silent drift between the two.
 */
export const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: "BD Digital Services",
  whatsapp: "https://wa.me/8801572792499",
  telegram: "https://t.me/+8801572792499",
  facebook: "",
  messenger: "",
  twitter: "",
  instagram: "",
  tiktok: "",
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

/**
 * Merge stored settings rows over the defaults into the public settings
 * response shape. Every key in DEFAULT_SETTINGS is always present.
 */
export function buildSettingsResponse(stored: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    out[key] = stored[key] ?? DEFAULT_SETTINGS[key];
  }
  return out;
}
