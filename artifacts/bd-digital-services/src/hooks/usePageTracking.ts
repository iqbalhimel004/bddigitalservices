import { useEffect } from "react";
import { useLocation } from "wouter";

function getOrCreateSessionId(): string {
  const key = "analytics_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function usePageTracking() {
  const [location] = useLocation();

  useEffect(() => {
    if (location.startsWith("/admin")) return;

    const sessionId = getOrCreateSessionId();

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: window.location.pathname,
        referrer: document.referrer || "",
        sessionId,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [location]);
}
