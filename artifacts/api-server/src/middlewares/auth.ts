import type { Request, Response, NextFunction } from "express";
import { getSession, safeEqual } from "../lib/sessions";

export const SESSION_COOKIE = "admin_session";
export const CSRF_COOKIE = "csrf_token";
export const CSRF_HEADER = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export interface AuthedRequest extends Request {
  adminSessionId?: string;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const cookieId = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  const session = await getSession(cookieId);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // CSRF: state-changing methods must present a header that matches the cookie token.
  if (!SAFE_METHODS.has(req.method.toUpperCase())) {
    const headerToken = req.header(CSRF_HEADER);
    const cookieToken = (req as { cookies?: Record<string, string> }).cookies?.[CSRF_COOKIE];
    if (!headerToken || !cookieToken ||
        !safeEqual(headerToken, cookieToken) ||
        !safeEqual(headerToken, session.csrfToken)) {
      res.status(403).json({ error: "CSRF token missing or invalid" });
      return;
    }
  }

  (req as AuthedRequest).adminSessionId = session.id;
  next();
}
