import { Router, type IRouter } from "express";
import { db, pageVisitsTable } from "@workspace/db";
import { count, desc, sql, gte } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAdmin);

/**
 * Returns a Date set to midnight N-1 days ago so that "N days" windows
 * include exactly N calendar days: today + the previous (N-1) full days.
 * e.g. windowStart(7) => midnight 6 days ago → today = 7 days total
 */
function windowStart(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

router.get("/analytics/summary", async (_req, res): Promise<void> => {
  const today = startOfToday();
  const week = windowStart(7);
  const month = windowStart(30);

  const [[todayTotal], [weekTotal], [monthTotal], [allTimeTotal]] = await Promise.all([
    db.select({ visits: count(), sessions: sql<number>`count(distinct ${pageVisitsTable.sessionId})` })
      .from(pageVisitsTable).where(gte(pageVisitsTable.createdAt, today)),
    db.select({ visits: count(), sessions: sql<number>`count(distinct ${pageVisitsTable.sessionId})` })
      .from(pageVisitsTable).where(gte(pageVisitsTable.createdAt, week)),
    db.select({ visits: count(), sessions: sql<number>`count(distinct ${pageVisitsTable.sessionId})` })
      .from(pageVisitsTable).where(gte(pageVisitsTable.createdAt, month)),
    db.select({ visits: count(), sessions: sql<number>`count(distinct ${pageVisitsTable.sessionId})` })
      .from(pageVisitsTable),
  ]);

  res.json({
    today: { visits: Number(todayTotal?.visits ?? 0), sessions: Number(todayTotal?.sessions ?? 0) },
    week: { visits: Number(weekTotal?.visits ?? 0), sessions: Number(weekTotal?.sessions ?? 0) },
    month: { visits: Number(monthTotal?.visits ?? 0), sessions: Number(monthTotal?.sessions ?? 0) },
    allTime: { visits: Number(allTimeTotal?.visits ?? 0), sessions: Number(allTimeTotal?.sessions ?? 0) },
  });
});

router.get("/analytics/realtime", async (_req, res): Promise<void> => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [result] = await db
    .select({ active: sql<number>`count(distinct ${pageVisitsTable.sessionId})` })
    .from(pageVisitsTable)
    .where(gte(pageVisitsTable.createdAt, fiveMinutesAgo));

  res.json({ active: Number(result?.active ?? 0) });
});

router.get("/analytics/chart", async (req, res): Promise<void> => {
  const period = req.query["period"] === "30d" ? 30 : 7;
  const since = windowStart(period);

  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', ${pageVisitsTable.createdAt})::date::text`,
      visits: count(),
    })
    .from(pageVisitsTable)
    .where(gte(pageVisitsTable.createdAt, since))
    .groupBy(sql`date_trunc('day', ${pageVisitsTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${pageVisitsTable.createdAt})`);

  const dataMap = new Map(rows.map((r) => [r.date, Number(r.visits)]));
  const result: { date: string; visits: number }[] = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, visits: dataMap.get(key) ?? 0 });
  }

  res.json(result);
});

router.get("/analytics/pages", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query["limit"]) || 10, 50);

  const rows = await db
    .select({ page: pageVisitsTable.pagePath, visits: count() })
    .from(pageVisitsTable)
    .groupBy(pageVisitsTable.pagePath)
    .orderBy(desc(count()))
    .limit(limit);

  res.json(rows.map((r) => ({ page: r.page, visits: Number(r.visits) })));
});

router.get("/analytics/devices", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ device: pageVisitsTable.deviceType, visits: count() })
    .from(pageVisitsTable)
    .groupBy(pageVisitsTable.deviceType)
    .orderBy(desc(count()));

  res.json(rows.map((r) => ({ device: r.device, visits: Number(r.visits) })));
});

router.get("/analytics/referrers", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query["limit"]) || 10, 50);

  // Normalize referrer: strip protocol/path from any full URLs that may have
  // been stored before hostname-only normalization was in place. New rows are
  // already stored as hostname-only (or NULL for direct). Group after normalizing.
  const normalizedReferrer = sql<string>`
    coalesce(
      case
        when ${pageVisitsTable.referrer} like 'http%'
          then regexp_replace(${pageVisitsTable.referrer}, '^https?://([^/]+).*', '\\1')
        else ${pageVisitsTable.referrer}
      end,
      'Direct'
    )
  `;

  const rows = await db
    .select({
      referrer: normalizedReferrer,
      visits: count(),
    })
    .from(pageVisitsTable)
    .groupBy(normalizedReferrer)
    .orderBy(desc(count()))
    .limit(limit);

  res.json(rows.map((r) => ({ referrer: r.referrer, visits: Number(r.visits) })));
});

router.get("/analytics/countries", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query["limit"]) || 10, 100);

  const rows = await db
    .select({ country: pageVisitsTable.country, visits: count() })
    .from(pageVisitsTable)
    .where(sql`${pageVisitsTable.country} is not null`)
    .groupBy(pageVisitsTable.country)
    .orderBy(desc(count()))
    .limit(limit);

  res.json(rows.map((r) => ({ country: r.country as string, visits: Number(r.visits) })));
});

router.get("/analytics/recent", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query["limit"]) || 50, 100);

  const rows = await db
    .select({
      id: pageVisitsTable.id,
      pagePath: pageVisitsTable.pagePath,
      deviceType: pageVisitsTable.deviceType,
      browser: pageVisitsTable.browser,
      createdAt: pageVisitsTable.createdAt,
    })
    .from(pageVisitsTable)
    .orderBy(desc(pageVisitsTable.createdAt))
    .limit(limit);

  res.json(rows);
});

export default router;
