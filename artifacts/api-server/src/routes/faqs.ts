import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { faqsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { adminLimiter } from "../middlewares/rateLimits";

const router: IRouter = Router();

function publicCache(maxAge: number, swr: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${swr}`);
    next();
  };
}

interface FaqBodyType {
  questionEn: string;
  questionBn: string;
  answerEn: string;
  answerBn: string;
  sortOrder?: number;
  isActive?: boolean;
}

const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 5000;

function validText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function parseFaqBody(body: unknown): { ok: true; data: FaqBodyType } | { ok: false } {
  if (!body || typeof body !== "object") return { ok: false };
  const b = body as Record<string, unknown>;
  const questionEn = validText(b.questionEn, MAX_QUESTION_LENGTH);
  const questionBn = validText(b.questionBn, MAX_QUESTION_LENGTH);
  const answerEn = validText(b.answerEn, MAX_ANSWER_LENGTH);
  const answerBn = validText(b.answerBn, MAX_ANSWER_LENGTH);
  if (!questionEn || !questionBn || !answerEn || !answerBn) return { ok: false };
  return {
    ok: true,
    data: {
      questionEn,
      questionBn,
      answerEn,
      answerBn,
      sortOrder: typeof b.sortOrder === "number" && Number.isFinite(b.sortOrder) ? b.sortOrder : 0,
      isActive: typeof b.isActive === "boolean" ? b.isActive : true,
    },
  };
}

function parseId(params: Record<string, string>): number | null {
  const n = parseInt(params.id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

router.get("/faqs", publicCache(60, 300), async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(faqsTable)
    .where(eq(faqsTable.isActive, true))
    .orderBy(asc(faqsTable.sortOrder), asc(faqsTable.id));
  res.json(rows);
});

router.get("/faqs/all", adminLimiter, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(faqsTable)
    .orderBy(asc(faqsTable.sortOrder), asc(faqsTable.id));
  res.json(rows);
});

router.post("/faqs", adminLimiter, requireAdmin, async (req, res): Promise<void> => {
  const parsed = parseFaqBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: "অবৈধ ডেটা দেওয়া হয়েছে" });
    return;
  }
  const [created] = await db
    .insert(faqsTable)
    .values({
      questionEn: parsed.data.questionEn,
      questionBn: parsed.data.questionBn,
      answerEn: parsed.data.answerEn,
      answerBn: parsed.data.answerBn,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    })
    .returning();
  res.status(201).json(created);
});

router.put("/faqs/:id", adminLimiter, requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params as Record<string, string>);
  if (!id) {
    res.status(400).json({ error: "অবৈধ ID" });
    return;
  }
  const parsed = parseFaqBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: "অবৈধ ডেটা দেওয়া হয়েছে" });
    return;
  }
  const [updated] = await db
    .update(faqsTable)
    .set({
      questionEn: parsed.data.questionEn,
      questionBn: parsed.data.questionBn,
      answerEn: parsed.data.answerEn,
      answerBn: parsed.data.answerBn,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    })
    .where(eq(faqsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "FAQ পাওয়া যায়নি" });
    return;
  }
  res.json(updated);
});

router.delete("/faqs/:id", adminLimiter, requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params as Record<string, string>);
  if (!id) {
    res.status(400).json({ error: "অবৈধ ID" });
    return;
  }
  const [deleted] = await db.delete(faqsTable).where(eq(faqsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "FAQ পাওয়া যায়নি" });
    return;
  }
  res.json({ success: true });
});

export default router;
