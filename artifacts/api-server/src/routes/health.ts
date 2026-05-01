import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

router.get("/healthz", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

export default router;
