import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data: Record<string, number>;
}

const PAYMENT_LABELS: Record<string, string> = {
  bkash: "বিকাশ",
  nagad: "নগদ",
  rocket: "রকেট",
  bank: "ব্যাংক",
  cod: "ক্যাশ",
};

const COLORS = [
  "#e91e8c",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#22c55e",
  "#eab308",
];

interface TooltipPayload {
  value: number;
  name: string;
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

export function OrdersByPaymentChart({ data }: Props) {
  const chartData = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .map(([method, count], i) => ({
      name: PAYMENT_LABELS[method.toLowerCase()] ?? method,
      count,
      color: COLORS[i % COLORS.length],
    }));

  const total = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            কোনো order নেই
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              layout="vertical"
              barSize={18}
              margin={{ left: 8, right: 16 }}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={48}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
