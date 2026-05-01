import { Router, type IRouter, type Request, type Response } from "express";
import { createHash } from "crypto";
import { db, pageVisitsTable } from "@workspace/db";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const countryCache = new Map<string, string | null>();
const COUNTRY_CACHE_MAX = 2000;

async function lookupCountry(ip: string): Promise<string | null> {
  if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("::")) return null;
  if (countryCache.has(ip)) return countryCache.get(ip)!;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json() as { success?: boolean; country_code?: string };
    if (!json.success) return null;
    const code = json.country_code && json.country_code !== "" ? json.country_code : null;
    if (countryCache.size >= COUNTRY_CACHE_MAX) {
      const firstKey = countryCache.keys().next().value;
      if (firstKey !== undefined) countryCache.delete(firstKey);
    }
    countryCache.set(ip, code);
    return code;
  } catch {
    return null;
  }
}

const router: IRouter = Router();

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many tracking requests." },
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip ?? "unknown";
    return ipKeyGenerator(ip);
  },
});

function parseDeviceType(ua: string): "mobile" | "tablet" | "desktop" {
  const lower = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(lower)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(lower)) return "mobile";
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome\/\d/i.test(ua) && !/chromium/i.test(ua)) return "Chrome";
  if (/safari\/\d/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/firefox\/\d/i.test(ua)) return "Firefox";
  if (/msie|trident/i.test(ua)) return "IE";
  return "Other";
}

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error("IP_HASH_SALT environment variable is not set");
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 16);
}

router.post("/track", trackLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, referrer, sessionId } = req.body as {
      page?: string;
      referrer?: string;
      sessionId?: string;
    };

    if (!page || typeof page !== "string" || !sessionId || typeof sessionId !== "string") {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const pagePath = page.slice(0, 500);
    if (pagePath.startsWith("/admin") || pagePath.startsWith("/api")) {
      res.status(204).end();
      return;
    }

    const ua = req.headers["user-agent"] ?? "";
    const deviceType = parseDeviceType(ua);
    const browser = parseBrowser(ua);

    const forwarded = req.headers["x-forwarded-for"];
    const rawIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : (req.ip ?? "unknown");
    const ipHash = hashIp(rawIp);

    let referrerDomain: string | null = null;
    if (referrer && typeof referrer === "string" && referrer.length > 0) {
      try {
        referrerDomain = new URL(referrer).hostname.slice(0, 200);
      } catch {
        referrerDomain = null;
      }
    }

    const country = await lookupCountry(rawIp);

    await db.insert(pageVisitsTable).values({
      sessionId: sessionId.slice(0, 100),
      pagePath,
      referrer: referrerDomain,
      deviceType,
      browser,
      ipHash,
      country,
    });

    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
