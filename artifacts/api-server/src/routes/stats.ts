import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, ordersTable } from "@workspace/db";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAdmin);

router.get("/stats", async (_req, res): Promise<void> => {
  const [totalProductsResult] = await db
    .select({ count: count() })
    .from(productsTable);
  const [totalCategoriesResult] = await db
    .select({ count: count() })
    .from(categoriesTable);
  const [totalOrdersResult] = await db
    .select({ count: count() })
    .from(ordersTable);
  const [activeProductsResult] = await db
    .select({ count: count() })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));

  const recentOrders = await db
    .select({
      id: ordersTable.id,
      customerName: ordersTable.customerName,
      phone: ordersTable.phone,
      email: ordersTable.email,
      productId: ordersTable.productId,
      paymentMethod: ordersTable.paymentMethod,
      message: ordersTable.message,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
      productName: productsTable.nameEn,
    })
    .from(ordersTable)
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(5);

  const statusRows = await db
    .select({ status: ordersTable.status, cnt: count() })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  const ordersByStatus: Record<string, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of statusRows) {
    if (row.status) ordersByStatus[row.status] = Number(row.cnt);
  }

  const paymentRows = await db
    .select({ method: ordersTable.paymentMethod, cnt: count() })
    .from(ordersTable)
    .groupBy(ordersTable.paymentMethod);

  const ordersByPayment: Record<string, number> = {};
  for (const row of paymentRows) {
    ordersByPayment[row.method] = Number(row.cnt);
  }

  const now = new Date();
  const sevenDaysAgoUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6),
  );

  const dayRows = await db
    .select({
      date: sql<string>`(${ordersTable.createdAt} AT TIME ZONE 'UTC')::date`.as("date"),
      cnt: count(),
    })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, sevenDaysAgoUtc))
    .groupBy(sql`(${ordersTable.createdAt} AT TIME ZONE 'UTC')::date`)
    .orderBy(sql`(${ordersTable.createdAt} AT TIME ZONE 'UTC')::date ASC`);

  const dayMap = new Map<string, number>();
  for (const row of dayRows) {
    dayMap.set(String(row.date), Number(row.cnt));
  }

  const ordersByDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    )
      .toISOString()
      .slice(0, 10);
    ordersByDay.push({ date: key, count: dayMap.get(key) ?? 0 });
  }

  res.json({
    totalProducts: Number(totalProductsResult?.count ?? 0),
    totalCategories: Number(totalCategoriesResult?.count ?? 0),
    totalOrders: Number(totalOrdersResult?.count ?? 0),
    activeProducts: Number(activeProductsResult?.count ?? 0),
    recentOrders,
    ordersByStatus,
    ordersByPayment,
    ordersByDay,
  });
});

export default router;
