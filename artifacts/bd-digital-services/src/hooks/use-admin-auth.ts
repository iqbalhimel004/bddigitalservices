import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface AdminMeResponse {
  authenticated: boolean;
  csrfToken: string;
  username?: string;
}

/**
 * Verifies the admin httpOnly session cookie by hitting `/api/admin/me`.
 * Redirects to `/admin` on failure. Returns loading state and the CSRF token
 * (for components that need to issue manual fetches).
 */
export function useAdminAuth(): { ready: boolean; username: string } {
  const [, setLocation] = useLocation();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/me", { credentials: "include" })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          localStorage.removeItem("admin_logged_in");
          setLocation("/admin");
          return;
        }
        return res.json().then((data: AdminMeResponse) => {
          if (cancelled) return;
          if (data.authenticated) {
            localStorage.setItem("admin_logged_in", "1");
            setUsername(data.username ?? "");
            setReady(true);
          } else {
            setLocation("/admin");
          }
        });
      })
      .catch(() => {
        if (!cancelled) setLocation("/admin");
      });
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  return { ready, username };
}
