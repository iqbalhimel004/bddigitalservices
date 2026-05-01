import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Eye, Users, Calendar, TrendingUp } from "lucide-react";

interface Summary {
  today: { visits: number; sessions: number };
  week: { visits: number; sessions: number };
  month: { visits: number; sessions: number };
  allTime: { visits: number; sessions: number };
}

interface ChartPoint { date: string; visits: number }
interface PageRow { page: string; visits: number }
interface DeviceRow { device: string; visits: number }
interface ReferrerRow { referrer: string; visits: number }
interface CountryRow { country: string; visits: number }
interface RecentRow { id: number; pagePath: string; deviceType: string; browser: string; createdAt: string }

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#6366f1",
  mobile: "#22c55e",
  tablet: "#f59e0b",
};

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

const SUMMARY_META = [
  { key: "today" as const, label: "Today", icon: Eye, accent: "border-t-blue-500", iconBg: "bg-blue-500/10", iconColor: "text-blue-400" },
  { key: "week" as const, label: "This Week", icon: Calendar, accent: "border-t-purple-500", iconBg: "bg-purple-500/10", iconColor: "text-purple-400" },
  { key: "month" as const, label: "This Month", icon: TrendingUp, accent: "border-t-green-500", iconBg: "bg-green-500/10", iconColor: "text-green-400" },
  { key: "allTime" as const, label: "All Time", icon: Users, accent: "border-t-orange-500", iconBg: "bg-orange-500/10", iconColor: "text-orange-400" },
];

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<"7d" | "30d">("7d");

  const { data: realtime } = useQuery({
    queryKey: ["analytics-realtime"],
    queryFn: () => apiFetch<{ active: number }>("/api/analytics/realtime"),
    refetchInterval: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => apiFetch<Summary>("/api/analytics/summary"),
    refetchInterval: 60_000,
  });

  const { data: chart } = useQuery({
    queryKey: ["analytics-chart", period],
    queryFn: () => apiFetch<ChartPoint[]>(`/api/analytics/chart?period=${period}`),
  });

  const { data: pages } = useQuery({
    queryKey: ["analytics-pages"],
    queryFn: () => apiFetch<PageRow[]>("/api/analytics/pages?limit=10"),
    refetchInterval: 60_000,
  });

  const { data: devices } = useQuery({
    queryKey: ["analytics-devices"],
    queryFn: () => apiFetch<DeviceRow[]>("/api/analytics/devices"),
    refetchInterval: 60_000,
  });

  const { data: referrers } = useQuery({
    queryKey: ["analytics-referrers"],
    queryFn: () => apiFetch<ReferrerRow[]>("/api/analytics/referrers?limit=10"),
    refetchInterval: 60_000,
  });

  const { data: countries } = useQuery({
    queryKey: ["analytics-countries"],
    queryFn: () => apiFetch<CountryRow[]>("/api/analytics/countries?limit=10"),
    refetchInterval: 60_000,
  });

  const { data: recent } = useQuery({
    queryKey: ["analytics-recent"],
    queryFn: () => apiFetch<RecentRow[]>("/api/analytics/recent?limit=50"),
    refetchInterval: 60_000,
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <AdminPageHeader
          title="Analytics"
          description="Track visitor traffic, device breakdown, and page performance."
        />

        {/* Active Now */}
        <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-green-500/30 bg-green-500/5">
          <span className="relative flex h-4 w-4 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" />
          </span>
          <div>
            <span className="text-2xl font-bold text-green-400">{realtime?.active ?? "—"}</span>
            <span className="ml-2 text-sm text-muted-foreground">active visitors right now</span>
          </div>
          <p className="text-xs text-muted-foreground ml-auto hidden sm:block">Updates every 30 seconds</p>
        </div>

        {/* Summary Cards */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Traffic Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {SUMMARY_META.map(({ key, label, icon: Icon, accent, iconBg, iconColor }) => {
              const data = summary?.[key];
              return (
                <Card key={key} className={`border border-border/60 bg-card/80 border-t-2 ${accent}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
                    <div className={`p-2 rounded-lg ${iconBg}`}>
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-3xl font-bold tracking-tight">{data?.visits ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data?.sessions ?? "—"} unique sessions
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Traffic Chart */}
        <Card className="border border-border/60 bg-card/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold">Daily Traffic</CardTitle>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPeriod("7d")}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  period === "7d"
                    ? "bg-primary text-primary-foreground border-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setPeriod("30d")}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  period === "30d"
                    ? "bg-primary text-primary-foreground border-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                30 Days
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chart ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const d = parseISO(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [value, "Visits"]}
                  labelFormatter={(label: string) => {
                    const d = parseISO(label);
                    return d.toLocaleDateString();
                  }}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                />
                <Line
                  type="monotone"
                  dataKey="visits"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Pages + Device Breakdown */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Breakdown</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold">Top Pages</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b border-border/60">
                      <th className="pb-2 text-xs font-semibold uppercase tracking-wide w-8">#</th>
                      <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Page</th>
                      <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-right">Visits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pages ?? []).map((row, i) => (
                      <tr key={row.page} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="py-2.5 font-mono text-xs truncate max-w-[200px]">{row.page}</td>
                        <td className="py-2.5 text-right font-semibold">{row.visits}</td>
                      </tr>
                    ))}
                    {!pages?.length && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-muted-foreground text-sm">No data yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold">Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {devices?.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={devices}
                        dataKey="visits"
                        nameKey="device"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {devices.map((entry) => (
                          <Cell
                            key={entry.device}
                            fill={DEVICE_COLORS[entry.device] ?? "#94a3b8"}
                          />
                        ))}
                      </Pie>
                      <Legend
                        formatter={(value: string) =>
                          value.charAt(0).toUpperCase() + value.slice(1)
                        }
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name]}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Referrers + Countries */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Sources</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold">Top Referrers</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {referrers?.length ? (
                  <ul className="space-y-1">
                    {referrers.map((r) => (
                      <li key={r.referrer} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors rounded px-1">
                        <span className="text-sm text-muted-foreground truncate">{r.referrer}</span>
                        <span className="font-semibold text-sm ml-2 shrink-0">{r.visits}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">No data yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold">Top Countries</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {countries?.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-left border-b border-border/60">
                        <th className="pb-2 text-xs font-semibold uppercase tracking-wide w-8">#</th>
                        <th className="pb-2 text-xs font-semibold uppercase tracking-wide">Country</th>
                        <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-right">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countries.map((row, i) => (
                        <tr key={row.country} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="py-2.5">
                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md">{row.country}</span>
                          </td>
                          <td className="py-2.5 text-right font-semibold">{row.visits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Visitors */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Recent Visitors</h2>
          <Card className="border border-border/60 bg-card/80">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Page</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Device</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Browser</th>
                  </tr>
                </thead>
                <tbody>
                  {(recent ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs truncate max-w-[200px]">{row.pagePath}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 capitalize text-xs">{row.deviceType}</td>
                      <td className="px-4 py-3 text-xs">{row.browser}</td>
                    </tr>
                  ))}
                  {!recent?.length && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-muted-foreground text-sm">No visits recorded yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
