/**
 * Brand logo resolver.
 *
 * Maps a product name to a real brand logo served from theSVG.org's CDN
 * (https://thesvg.org). Brand marks remain trademarks of their respective
 * owners — review each brand's usage guidelines for commercial use.
 *
 * Matching is keyword-based against the English product name. The FIRST
 * matching rule wins, so more specific keywords must come before generic
 * ones (e.g. "github copilot" before "github").
 */

const CDN_BASE = "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons";

interface BrandRule {
  /** All keywords must appear (case-insensitive) in the product name. */
  keywords: string[];
  slug: string;
  /** Icon variant. Cards have a light background, so brands whose default
      mark is white must use their "dark" variant to stay visible. */
  variant?: string;
}

const BRAND_RULES: BrandRule[] = [
  // AI assistants / LLM products
  { keywords: ["chatgpt"], slug: "openai", variant: "light" },
  { keywords: ["openai"], slug: "openai", variant: "light" },
  { keywords: ["grok"], slug: "grok", variant: "light" },
  { keywords: ["gemini"], slug: "gemini-google" },
  { keywords: ["google ai"], slug: "gemini-google" },
  { keywords: ["veo"], slug: "gemini-google" },
  { keywords: ["antigravity"], slug: "google-antigravity" },
  { keywords: ["perplexity"], slug: "perplexity" },
  { keywords: ["perflexity"], slug: "perplexity" },

  // Dev tools
  { keywords: ["github copilot"], slug: "github-copilot" },
  { keywords: ["copilot"], slug: "github-copilot" },
  { keywords: ["github"], slug: "github" },
  { keywords: ["replit"], slug: "replit" },
  { keywords: ["windsurf"], slug: "windsurf" },
  { keywords: ["lovable"], slug: "lovable" },

  // Cloud / hosting
  { keywords: ["digitalocean"], slug: "digitalocean" },
  { keywords: ["digital ocean"], slug: "digitalocean" },
  { keywords: ["azure"], slug: "azure" },

  // Design / productivity
  { keywords: ["canva"], slug: "canva" },
  { keywords: ["wordpress"], slug: "wordpress" },

  // Finance
  { keywords: ["binance"], slug: "binance" },
];

/**
 * Returns the brand logo URL for a product name, or null when no known
 * brand matches (caller should fall back to the category icon).
 */
export function getBrandLogoUrl(productNameEn: string | null | undefined): string | null {
  if (!productNameEn) return null;
  const name = productNameEn.toLowerCase();
  for (const rule of BRAND_RULES) {
    if (rule.keywords.every((k) => name.includes(k))) {
      return `${CDN_BASE}/${rule.slug}/${rule.variant ?? "default"}.svg`;
    }
  }
  return null;
}
