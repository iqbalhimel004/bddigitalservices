import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrdersByDayItem } from "@workspace/api-client-react";

interface Props {
  data: OrdersByDayItem[];
}

const DAY_LABELS: Record<number, string> = {
  0: "রবি",
  1: "সোম",
  2: "মঙ্গল",
  3: "বুধ",
  4: "বৃহ",
  5: "শুক্র",
  6: "শনি",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return DAY_LABELS[d.getDay()] ?? dateStr.slice(5);
}

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} টি অর্ডার</p>
    </div>
  );
}

export function OrdersByDayChart({ data }: Props) {
  const chartData = data.map((d) => ({
    day: formatDate(d.date),
    orders: d.count,
  }));

  return (
    <Card className="border-none shadow-sm col-span-2">
      <CardHeader>
        <CardTitle className="text-base">গত ৭ দিনের Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={28}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
            <Bar
              dataKey="orders"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
