import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, noticesTable } from "@workspace/db";

const router: IRouter = Router();

function publicCache(_maxAge: number, _swr: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    // no-cache: the browser must revalidate on every request so admin edits
    // show up immediately. Express's built-in ETag still allows cheap 304s.
    res.setHeader("Cache-Control", "no-cache");
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
