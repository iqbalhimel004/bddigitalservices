import { db, loginAttemptsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MS = 60 * 60 * 1000;
const ATTEMPT_RESET_MS = 60 * 60 * 1000;

function normalize(username: string): string {
  return username.toLowerCase().trim();
}

export async function isLockedOut(username: string): Promise<boolean> {
  const [row] = await db
    .select({ lockedUntil: loginAttemptsTable.lockedUntil })
    .from(loginAttemptsTable)
    .where(eq(loginAttemptsTable.username, normalize(username)))
    .limit(1);
  if (!row) return false;
  return row.lockedUntil > Date.now();
}

export async function lockoutSecondsRemaining(username: string): Promise<number> {
  const [row] = await db
    .select({ lockedUntil: loginAttemptsTable.lockedUntil })
    .from(loginAttemptsTable)
    .where(eq(loginAttemptsTable.username, normalize(username)))
    .limit(1);
  if (!row) return 0;
  const remaining = row.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

export async function recordFailure(username: string): Promise<void> {
  const k = normalize(username);
  const now = Date.now();
  const [existing] = await db
    .select()
    .from(loginAttemptsTable)
    .where(eq(loginAttemptsTable.username, k))
    .limit(1);

  if (!existing || now - existing.firstFailureAt > ATTEMPT_RESET_MS) {
    await db
      .insert(loginAttemptsTable)
      .values({ username: k, failures: 1, firstFailureAt: now, lockedUntil: 0 })
      .onConflictDoUpdate({
        target: loginAttemptsTable.username,
        set: { failures: 1, firstFailureAt: now, lockedUntil: 0 },
      });
    return;
  }

  const newFailures = existing.failures + 1;
  const lockedUntil =
    newFailures >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_WINDOW_MS : existing.lockedUntil;

  await db
    .update(loginAttemptsTable)
    .set({ failures: newFailures, lockedUntil })
    .where(eq(loginAttemptsTable.username, k));
}

export async function clearFailures(username: string): Promise<void> {
  await db
    .delete(loginAttemptsTable)
    .where(eq(loginAttemptsTable.username, normalize(username)));
}
