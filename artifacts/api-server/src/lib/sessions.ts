import { randomBytes, timingSafeEqual } from "crypto";
import { db, adminSessionsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

import type { AdminSession } from "@workspace/db";

export const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

// Periodically purge expired sessions from DB
setInterval(() => {
  db.delete(adminSessionsTable)
    .where(lt(adminSessionsTable.expiresAt, Date.now()))
    .catch(() => {});
}, 5 * 60 * 1000).unref();

export async function createSession(): Promise<AdminSession> {
  const id = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const now = Date.now();
  const session = {
    id,
    csrfToken,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  await db.insert(adminSessionsTable).values(session);
  return session;
}

export async function getSession(id: string | undefined | null): Promise<AdminSession | null> {
  if (!id) return null;
  const [row] = await db
    .select()
    .from(adminSessionsTable)
    .where(eq(adminSessionsTable.id, id))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt <= Date.now()) {
    await db.delete(adminSessionsTable).where(eq(adminSessionsTable.id, id));
    return null;
  }
  return row;
}

export async function destroySession(id: string | undefined | null): Promise<void> {
  if (!id) return;
  await db.delete(adminSessionsTable).where(eq(adminSessionsTable.id, id));
}

export async function destroyAllSessions(): Promise<void> {
  await db.delete(adminSessionsTable);
}

export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
