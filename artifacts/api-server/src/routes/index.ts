import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import settingsRouter from "./settings";
import noticesRouter from "./notices";
import faqsRouter from "./faqs";
import adminRouter from "./admin";
import statsRouter from "./stats";
import adminWritesRouter from "./admin-writes";
import syncStatusRouter from "./syncStatus";
import trackRouter from "./track";
import analyticsRouter from "./analytics";
import { requireAdmin } from "../middlewares/auth";
import { adminLimiter } from "../middlewares/rateLimits";

const router: IRouter = Router();

// Health check — no auth, no rate limit (for uptime monitors)
router.use(healthRouter);

// Public read-only routes
router.use(categoriesRouter);
router.use(productsRouter);
router.use(settingsRouter);
router.use(noticesRouter);
router.use(faqsRouter);

// Admin authentication endpoint — loginLimiter applied inside admin.ts
router.use(adminRouter);

// Orders router — ordersLimiter is applied inside orders.ts to POST only
router.use(ordersRouter);

// Public tracking endpoint — has its own conservative rate limiter
router.use(trackRouter);

// Admin-only read routes
router.use(adminLimiter, requireAdmin, statsRouter);
router.use(adminLimiter, requireAdmin, analyticsRouter);

// Sync status: admin-only GET reads .sync-status.json written by the sync script
router.use(adminLimiter, syncStatusRouter);

// Admin-only mutations (auth enforced inside the router)
router.use(adminLimiter, adminWritesRouter);

export default router;
