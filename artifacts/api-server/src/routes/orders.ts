import { Router, type IRouter, type Request } from "express";
import { db, ordersTable, productsTable, orderStatusEnum } from "@workspace/db";
import { desc, eq, inArray, and } from "drizzle-orm";
import { CreateOrderBody, UpdateOrderStatusBody, BulkUpdateOrderStatusBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { ordersLimiter } from "../middlewares/rateLimits";

const router: IRouter = Router();

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
const VALID_STATUSES: readonly OrderStatus[] = orderStatusEnum.enumValues;

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending:    ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed:  [],
  cancelled:  ["pending"],
};

const VALID_PAYMENT_METHODS = ["bkash", "nagad", "rocket"] as const;

// GET /orders — admin only
router.get("/orders", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
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
    .orderBy(desc(ordersTable.createdAt));
  res.json(rows);
});

// POST /orders — public (anyone can submit an order), rate-limited
router.post("/orders", ordersLimiter, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!(VALID_PAYMENT_METHODS as readonly string[]).includes(parsed.data.paymentMethod)) {
    res.status(400).json({ error: `Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(", ")}` });
    return;
  }

  if (parsed.data.productId != null) {
    const [activeProduct] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(and(eq(productsTable.id, parsed.data.productId), eq(productsTable.isActive, true)))
      .limit(1);
    if (!activeProduct) {
      res.status(400).json({ error: "Selected product is not available" });
      return;
    }
  }

  const data = {
    customerName: parsed.data.customerName,
    phone: parsed.data.phone,
    email: parsed.data.email ?? null,
    productId: parsed.data.productId ?? null,
    paymentMethod: parsed.data.paymentMethod,
    message: parsed.data.message ?? null,
  };
  const [order] = await db.insert(ordersTable).values(data).returning();

  let productName: string | null = null;
  if (order.productId) {
    const [product] = await db
      .select({ nameEn: productsTable.nameEn })
      .from(productsTable)
      .where(eq(productsTable.id, order.productId))
      .limit(1);
    productName = product?.nameEn ?? null;
  }

  res.status(201).json({ ...order, productName });
});

// PATCH /orders/bulk-status — admin only
router.patch("/orders/bulk-status", requireAdmin, async (req, res): Promise<void> => {
  const parsed = BulkUpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: `Invalid input. Provide ids (array of integers) and a valid status.` });
    return;
  }

  const { ids, status } = parsed.data as { ids: number[]; status: OrderStatus };

  if (ids.length === 0) {
    res.status(400).json({ error: "No order IDs provided." });
    return;
  }

  await db
    .update(ordersTable)
    .set({ status })
    .where(inArray(ordersTable.id, ids));

  const rows = await db
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
    .where(inArray(ordersTable.id, ids));

  res.json(rows);
});

// PATCH /orders/:id/status — admin only
router.patch("/orders/:id/status", requireAdmin, async (req: Request<{ id: string }>, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }
  const newStatus: OrderStatus = parsed.data.status as OrderStatus;

  const [current] = await db
    .select({ status: ordersTable.status })
    .from(ordersTable)
    .where(eq(ordersTable.id, id))
    .limit(1);

  if (!current) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const allowed = ALLOWED_TRANSITIONS[current.status];
  if (!allowed.includes(newStatus)) {
    res.status(422).json({
      error: `Cannot transition order from '${current.status}' to '${newStatus}'. Allowed: ${allowed.length ? allowed.join(", ") : "none (final state)"}`,
    });
    return;
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: newStatus })
    .where(eq(ordersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [row] = await db
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
    .where(eq(ordersTable.id, id))
    .limit(1);

  res.json(row);
});

export default router;
