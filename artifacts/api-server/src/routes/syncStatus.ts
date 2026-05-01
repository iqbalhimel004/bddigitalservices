import { Router, type IRouter } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const SYNC_STATUS_FILE =
  process.env.SYNC_STATUS_FILE ??
  path.resolve(process.cwd(), ".sync-status.json");

interface SyncEvent {
  status: "success" | "failure" | "skipped";
  message: string;
  createdAt: string;
}

router.get("/sync-status", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const raw = await readFile(SYNC_STATUS_FILE, "utf8");
    const events: SyncEvent[] = JSON.parse(raw);
    res.json({ events, total: events.length });
  } catch {
    res.json({ events: [], total: 0 });
  }
});

export default router;
