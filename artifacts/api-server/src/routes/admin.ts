import { Router, type IRouter, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import { AdminLoginBody, ChangeAdminCredentialsBody } from "@workspace/api-zod";
import { loginLimiter } from "../middlewares/rateLimits";
import {
  createSession,
  destroySession,
  getSession,
  SESSION_TTL_SECONDS,
} from "../lib/sessions";
import {
  SESSION_COOKIE,
  CSRF_COOKIE,
  requireAdmin,
  type AuthedRequest,
} from "../middlewares/auth";
import {
  isLockedOut,
  lockoutSecondsRemaining,
  recordFailure,
  clearFailures,
} from "../lib/lockout";

const router: IRouter = Router();

const isProduction = process.env.NODE_ENV === "production";

const CRED_USERNAME_KEY = "_adminUsername";
const CRED_HASH_KEY = "_adminPasswordHash";

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`${name} environment variable is required`);
  }
  return v;
}

async function getDbSetting(key: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

async function setDbSetting(key: string, value: string): Promise<void> {
  const existing = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, key))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(siteSettingsTable)
      .set({ value })
      .where(eq(siteSettingsTable.key, key));
  } else {
    await db.insert(siteSettingsTable).values({ key, value });
  }
}

async function getAdminCredentials(): Promise<{ username: string; passwordHash: string }> {
  const [dbUsername, dbHash] = await Promise.all([
    getDbSetting(CRED_USERNAME_KEY),
    getDbSetting(CRED_HASH_KEY),
  ]);
  const username = dbUsername ?? getRequiredEnv("ADMIN_USERNAME");
  const passwordHash = dbHash ?? getRequiredEnv("ADMIN_PASSWORD_HASH");
  return { username, passwordHash };
}

function setAuthCookies(res: Response, sessionId: string, csrfToken: string): void {
  const baseOpts = {
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
  res.cookie(SESSION_COOKIE, sessionId, { ...baseOpts, httpOnly: true });
  res.cookie(CSRF_COOKIE, csrfToken, { ...baseOpts, httpOnly: false });
}

function clearAuthCookies(res: Response): void {
  const baseOpts = { path: "/", sameSite: "strict" as const, secure: isProduction };
  res.clearCookie(SESSION_COOKIE, { ...baseOpts, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...baseOpts, httpOnly: false });
}

router.post("/admin/login", loginLimiter, async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const submittedUsername = parsed.data.username;

  if (await isLockedOut(submittedUsername)) {
    const seconds = await lockoutSecondsRemaining(submittedUsername);
    res.status(429).json({
      error: `Account temporarily locked due to too many failed attempts. Try again in ${Math.ceil(seconds / 60)} minutes.`,
    });
    return;
  }

  let adminUsername: string;
  let adminPasswordHash: string;
  try {
    const creds = await getAdminCredentials();
    adminUsername = creds.username;
    adminPasswordHash = creds.passwordHash;
  } catch (err) {
    req.log.error({ err }, "Admin auth env vars missing");
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  const usernameMatches = submittedUsername === adminUsername;
  // Always run bcrypt.compare to keep timing constant whether username matches or not.
  const passwordMatches = await bcrypt.compare(parsed.data.password, adminPasswordHash);

  if (!usernameMatches || !passwordMatches) {
    await recordFailure(submittedUsername);
    req.log.warn({ username: submittedUsername }, "Failed admin login");
    res.status(401).json({ error: "ভুল username বা password" });
    return;
  }

  await clearFailures(submittedUsername);
  const session = await createSession();
  setAuthCookies(res, session.id, session.csrfToken);

  req.log.info({ username: submittedUsername }, "Admin logged in");
  res.json({ message: "লগইন সফল হয়েছে" });
});

router.post("/admin/logout", async (req, res): Promise<void> => {
  const cookieId = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  await destroySession(cookieId);
  clearAuthCookies(res);
  res.json({ message: "Logged out" });
});

router.get("/admin/me", async (req, res): Promise<void> => {
  const cookieId = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  const session = await getSession(cookieId);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  let username = "";
  try {
    const creds = await getAdminCredentials();
    username = creds.username;
  } catch {
    // Non-fatal — return authenticated without username
  }
  res.json({ authenticated: true, csrfToken: session.csrfToken, username });
});

router.put("/admin/credentials", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ChangeAdminCredentialsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newUsername, newPassword, confirmPassword } = parsed.data;

  if (!newUsername && !newPassword) {
    res.status(400).json({ error: "নতুন username বা password অন্তত একটি দিন" });
    return;
  }

  // Verify current password against stored credentials (DB → env fallback)
  let currentCredentials: { username: string; passwordHash: string };
  try {
    currentCredentials = await getAdminCredentials();
  } catch (err) {
    req.log.error({ err }, "Failed to read admin credentials");
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  const passwordValid = await bcrypt.compare(currentPassword, currentCredentials.passwordHash);
  if (!passwordValid) {
    res.status(401).json({ error: "বর্তমান password ভুল" });
    return;
  }

  // Validate and apply changes
  if (newPassword) {
    if (newPassword.length < 8) {
      res.status(400).json({ error: "নতুন password কমপক্ষে ৮ অক্ষর হতে হবে" });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: "নতুন password এবং confirm password মিলছে না" });
      return;
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await setDbSetting(CRED_HASH_KEY, newHash);
  }

  if (newUsername) {
    const trimmed = newUsername.trim();
    if (trimmed.length < 3) {
      res.status(400).json({ error: "Username কমপক্ষে ৩ অক্ষর হতে হবে" });
      return;
    }
    await setDbSetting(CRED_USERNAME_KEY, trimmed);
  }

  req.log.info("Admin credentials updated");
  res.json({ message: "Login details সফলভাবে পরিবর্তন হয়েছে" });
});

export default router;
