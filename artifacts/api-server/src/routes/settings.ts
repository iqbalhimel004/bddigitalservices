import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { DEFAULT_SETTINGS, buildSettingsResponse } from "../lib/defaultSettings";

const router: IRouter = Router();

function publicCache(maxAge: number, swr: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
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
