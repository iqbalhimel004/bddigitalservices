import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, RefreshCw, SkipForward } from "lucide-react";

interface SyncEvent {
  id: number;
  status: "success" | "failure" | "skipped";
  message: string;
  createdAt: string;
}

interface SyncStatusResponse {
  events: SyncEvent[];
  total: number;
}

function formatRelative(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function SyncStatusBanner() {
  const [latest, setLatest] = useState<SyncEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/sync-status", { credentials: "include" });
      if (!res.ok) return;
      const data: SyncStatusResponse = await res.json();
      setLatest(data.events[0] ?? null);
    } catch {
      // silently ignore fetch errors in the banner
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => fetchStatus(), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  if (!latest) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/50 text-muted-foreground text-sm border border-border">
        <Clock className="h-4 w-4 shrink-0" />
        <span>GitHub sync has not run yet. No events recorded.</span>
      </div>
    );
  }

  const config = {
    success: {
      bg: "bg-green-950/40 border-green-800/50",
      text: "text-green-400",
      label: "text-green-300",
      icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />,
      pill: "bg-green-900/60 text-green-300",
      pillLabel: "Sync OK",
    },
    failure: {
      bg: "bg-red-950/40 border-red-800/50",
      text: "text-red-400",
      label: "text-red-300",
      icon: <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />,
      pill: "bg-red-900/60 text-red-300",
      pillLabel: "Sync Failed",
    },
    skipped: {
      bg: "bg-yellow-950/40 border-yellow-800/50",
      text: "text-yellow-400",
      label: "text-yellow-300",
      icon: <SkipForward className="h-4 w-4 shrink-0 text-yellow-400" />,
      pill: "bg-yellow-900/60 text-yellow-300",
      pillLabel: "Sync Skipped",
    },
  }[latest.status];

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${config.bg}`}>
      {config.icon}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${config.pill}`}>
            {config.pillLabel}
          </span>
          <span className="text-muted-foreground text-xs">{formatRelative(latest.createdAt)}</span>
        </div>
        <p className={`${config.label} truncate`}>{latest.message}</p>
      </div>
      <button
        onClick={() => fetchStatus(true)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        title="Refresh sync status"
        disabled={refreshing}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
