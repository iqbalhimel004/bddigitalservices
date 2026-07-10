import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

function publicCache(_maxAge: number, _swr: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    // no-cache: the browser must revalidate on every request so admin edits
    // show up immediately. Express's built-in ETag still allows cheap 304s.
    res.setHeader("Cache-Control", "no-cache");
    next();
  };
}

router.get("/categories", publicCache(60, 300), async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.sortOrder, categoriesTable.id);
  res.json(categories);
});

export default router;
