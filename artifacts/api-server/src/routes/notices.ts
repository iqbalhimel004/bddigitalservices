import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, noticesTable } from "@workspace/db";

const router: IRouter = Router();

function publicCache(maxAge: number, swr: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
    next();
  };
}

router.get("/notice", publicCache(60, 300), async (_req, res): Promise<void> => {
  const [notice] = await db
    .select()
    .from(noticesTable)
    .where(eq(noticesTable.isActive, true))
    .orderBy(noticesTable.createdAt)
    .limit(1);
  if (!notice) {
    res.json(null);
    return;
  }
  res.json(notice);
});

export default router;
