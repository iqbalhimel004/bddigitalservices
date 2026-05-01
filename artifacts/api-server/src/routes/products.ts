import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";
import {
  GetProductParams,
  ListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function publicCache(maxAge: number, swr: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
    next();
  };
}

export async function getProductWithCategory(id: number) {
  const rows = await db
    .select({
      id: productsTable.id,
      nameBn: productsTable.nameBn,
      nameEn: productsTable.nameEn,
      descriptionBn: productsTable.descriptionBn,
      descriptionEn: productsTable.descriptionEn,
      categoryId: productsTable.categoryId,
      priceBdt: productsTable.priceBdt,
      priceUsd: productsTable.priceUsd,
      badge: productsTable.badge,
      isActive: productsTable.isActive,
      sortOrder: productsTable.sortOrder,
      createdAt: productsTable.createdAt,
      categoryNameEn: categoriesTable.nameEn,
      categoryNameBn: categoriesTable.nameBn,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

router.get("/products/featured", publicCache(60, 300), async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: productsTable.id,
      nameBn: productsTable.nameBn,
      nameEn: productsTable.nameEn,
      descriptionBn: productsTable.descriptionBn,
      descriptionEn: productsTable.descriptionEn,
      categoryId: productsTable.categoryId,
      priceBdt: productsTable.priceBdt,
      priceUsd: productsTable.priceUsd,
      badge: productsTable.badge,
      isActive: productsTable.isActive,
      sortOrder: productsTable.sortOrder,
      createdAt: productsTable.createdAt,
      categoryNameEn: categoriesTable.nameEn,
      categoryNameBn: categoriesTable.nameBn,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.isActive, true))
    .orderBy(asc(productsTable.sortOrder))
    .limit(6);
  res.json(rows);
});

router.get("/products", publicCache(60, 300), async (req, res): Promise<void> => {
  const queryParams = ListProductsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const conditions = [];
  if (queryParams.data.activeOnly === true) {
    conditions.push(eq(productsTable.isActive, true));
  }
  if (queryParams.data.categoryId !== null && queryParams.data.categoryId !== undefined) {
    conditions.push(eq(productsTable.categoryId, queryParams.data.categoryId));
  }

  const rows = await db
    .select({
      id: productsTable.id,
      nameBn: productsTable.nameBn,
      nameEn: productsTable.nameEn,
      descriptionBn: productsTable.descriptionBn,
      descriptionEn: productsTable.descriptionEn,
      categoryId: productsTable.categoryId,
      priceBdt: productsTable.priceBdt,
      priceUsd: productsTable.priceUsd,
      badge: productsTable.badge,
      isActive: productsTable.isActive,
      sortOrder: productsTable.sortOrder,
      createdAt: productsTable.createdAt,
      categoryNameEn: categoriesTable.nameEn,
      categoryNameBn: categoriesTable.nameBn,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(productsTable.sortOrder), asc(productsTable.id));
  res.json(rows);
});

router.get("/products/:id", publicCache(120, 600), async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const product = await getProductWithCategory(params.data.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});

export default router;
