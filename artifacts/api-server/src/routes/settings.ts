import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { DEFAULT_SETTINGS, buildSettingsResponse } from "../lib/defaultSettings";

const router: IRouter = Router();

function publicCache(_maxAge: number, _swr: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    // no-cache: the browser must revalidate on every request so admin edits
    // show up immediately. Express's built-in ETag still allows cheap 304s.
    res.setHeader("Cache-Control", "no-cache");
    next();
  };
}

let defaultsInitialized: Promise<void> | null = null;

export function initDefaultSettings(): void {
  if (!defaultsInitialized) {
    defaultsInitialized = ensureDefaultSettings().catch(() => { defaultsInitialized = null; });
  }
}

async function ensureDefaultSettings() {
  const rows = await db.select({ key: siteSettingsTable.key }).from(siteSettingsTable);
  const existingKeys = new Set(rows.map((r: { key: string }) => r.key));
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
  res.json(buildSettingsResponse(settings));
});

export default router;
