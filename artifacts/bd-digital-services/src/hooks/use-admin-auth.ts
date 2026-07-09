import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AdminMeResponse {
  authenticated: boolean;
  csrfToken: string;
  username?: string;
  expiresAt?: number;
}

const WARN_BEFORE_MS = 5 * 60 * 1000;

/**
 * Shared query key for the /api/admin/me auth check.
 * Exported so the logout handler can remove the cached result on sign-out.
 */
export const ADMIN_ME_QUERY_KEY = ["admin-me"] as const;

async function fetchAdminMe(): Promise<AdminMeResponse> {
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${apiBase}/api/admin/me`, { credentials: "include" });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json() as Promise<AdminMeResponse>;
}

/**
 * Verifies the admin httpOnly session cookie by hitting `/api/admin/me`.
 * Uses React Query with a 5-minute staleTime so navigating between admin pages
 * reuses the cached result instead of firing a fresh request every mount.
 * Redirects to `/admin` on failure. Returns ready state and username.
 * Sets timers to warn the admin 5 minutes before session expiry and redirect
 * to login when the session actually expires.
 */
export function useAdminAuth(): { ready: boolean; username: string } {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isError, isSuccess } = useQuery<AdminMeResponse>({
    queryKey: ADMIN_ME_QUERY_KEY,
    queryFn: fetchAdminMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Redirect to login on network error or non-OK HTTP response.
  useEffect(() => {
    if (isError) {
      localStorage.removeItem("admin_logged_in");
      setLocation("/admin");
    }
  }, [isError, setLocation]);

  // Redirect to login if the server explicitly says not authenticated.
  useEffect(() => {
    if (isSuccess && data && !data.authenticated) {
      setLocation("/admin");
    }
  }, [isSuccess, data, setLocation]);

  // Keep the localStorage flag in sync when auth is confirmed.
  useEffect(() => {
    if (isSuccess && data?.authenticated) {
      localStorage.setItem("admin_logged_in", "1");
    }
  }, [isSuccess, data]);

  // Set up session expiry warning toast and auto-logout redirect timers.
  // Runs on every mount; cleanup clears any pending timers on unmount so at
  // most one pair of timers is active at a time across admin page navigations.
  const expiresAt = isSuccess && data?.authenticated ? data.expiresAt : undefined;

  useEffect(() => {
    if (!expiresAt) return;

    const now = Date.now();
    const msUntilExpiry = expiresAt - now;

    if (msUntilExpiry <= 0) return;

    const msUntilWarn = msUntilExpiry - WARN_BEFORE_MS;

    if (msUntilWarn > 0) {
      warnTimerRef.current = setTimeout(() => {
        toastRef.current({
          title: "Session ৫ মিনিটে মেয়াদ শেষ হবে",
          description: "আপনার কাজ সেভ করুন। সময় শেষ হলে স্বয়ংক্রিয়ভাবে লগআউট হবে।",
          variant: "destructive",
        });
      }, msUntilWarn);
    } else {
      toastRef.current({
        title: "Session মেয়াদ শেষ হতে চলেছে",
        description: "আপনার কাজ সেভ করুন। সময় শেষ হলে স্বয়ংক্রিয়ভাবে লগআউট হবে।",
        variant: "destructive",
      });
    }

    expireTimerRef.current = setTimeout(() => {
      localStorage.removeItem("admin_logged_in");
      setLocation("/admin?expired=1");
    }, msUntilExpiry);

    return () => {
      if (warnTimerRef.current !== null) {
        clearTimeout(warnTimerRef.current);
        warnTimerRef.current = null;
      }
      if (expireTimerRef.current !== null) {
        clearTimeout(expireTimerRef.current);
        expireTimerRef.current = null;
      }
    };
  }, [expiresAt, setLocation]);

  const ready = isSuccess && Boolean(data?.authenticated);
  const username = data?.username ?? "";

  return { ready, username };
}
