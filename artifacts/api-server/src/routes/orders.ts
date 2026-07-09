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

/** Convert Bengali (০-৯) and Arabic-Indic (٠-٩) digits to ASCII digits. */
function toAsciiDigits(value: string): string {
  return value
    .replace(/[০-৯]/g, (d) => String(d.codePointAt(0)! - 0x09e6))
    .replace(/[٠-٩]/g, (d) => String(d.codePointAt(0)! - 0x0660));
}

/**
 * Normalize and validate a Bangladeshi mobile number.
 * Accepts formats like 01712345678, +8801712345678, 8801712345678,
 * with optional spaces/dashes and Bengali digits.
 * Returns the normalized local form (01XXXXXXXXX) or null if invalid.
 */
function normalizeBdPhone(raw: string): string | null {
  const digits = toAsciiDigits(raw).replace(/[\s\-()]/g, "");
  const m = digits.match(/^(?:\+?880|880)?(01[3-9]\d{8})$/);
  return m ? m[1] : null;
}

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

  // Bug #4 fix: reject empty/junk customer names and invalid phone numbers.
  const customerName = parsed.data.customerName.trim();
  if (customerName.length < 2 || customerName.length > 100) {
    res.status(400).json({ error: "Customer name must be between 2 and 100 characters." });
    return;
  }

  const normalizedPhone = normalizeBdPhone(parsed.data.phone);
  if (!normalizedPhone) {
    res.status(400).json({ error: "Invalid phone number. Please provide a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX)." });
    return;
  }

  const email = parsed.data.email?.trim() || null;
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }

  const message = parsed.data.message?.trim() || null;
  if (message && message.length > 2000) {
    res.status(400).json({ error: "Message is too long (max 2000 characters)." });
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
    customerName,
    phone: normalizedPhone,
    email,
    productId: parsed.data.productId ?? null,
    paymentMethod: parsed.data.paymentMethod,
    message,
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

  // Enforce per-order transition rules, same as the single-order endpoint.
  const currentOrders = await db
    .select({ id: ordersTable.id, status: ordersTable.status })
    .from(ordersTable)
    .where(inArray(ordersTable.id, ids));

  // Same defense as the single-order endpoint (bug #5): treat null/unknown
  // stored statuses as repairable to any valid status instead of crashing.
  const validIds = currentOrders
    .filter((o: { id: number; status: string | null }) => {
      const allowed = (o.status && ALLOWED_TRANSITIONS[o.status as OrderStatus]) || VALID_STATUSES;
      return allowed.includes(status);
    })
    .map((o: { id: number; status: string | null }) => o.id);

  const skippedCount = ids.length - validIds.length;

  if (validIds.length === 0) {
    const allowedList = [...new Set(
      currentOrders.map((o: { id: number; status: string | null }) => {
        const allowed = (o.status && ALLOWED_TRANSITIONS[o.status as OrderStatus]) || VALID_STATUSES;
        return allowed.length ? allowed.join(", ") : "none (final state)";
      })
    )].join("; ");
    res.status(422).json({
      error: `No orders can transition to '${status}'. Allowed transitions: ${allowedList}`,
      skippedCount: ids.length,
      updatedCount: 0,
    });
    return;
  }

  await db
    .update(ordersTable)
    .set({ status })
    .where(inArray(ordersTable.id, validIds));

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
    .where(inArray(ordersTable.id, validIds));

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

  // Bug #5 fix: defend against null/unknown status in the DB. If the stored
  // status is not a known state, allow transitioning to any valid status
  // so the order can be repaired instead of crashing the server.
  const allowed: readonly OrderStatus[] =
    (current.status && ALLOWED_TRANSITIONS[current.status as OrderStatus]) || VALID_STATUSES;
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

// DELETE /orders/:id — admin only (bug #6 fix: admins previously had no way to delete orders)
router.delete("/orders/:id", requireAdmin, async (req: Request<{ id: string }>, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }
  const [deleted] = await db.delete(ordersTable).where(eq(ordersTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
