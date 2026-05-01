import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

function publicCache(maxAge: number, swr: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
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
