import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data: Record<string, number>;
}

const STATUS_CONFIG = [
  { key: "pending",    label: "অপেক্ষারত",   color: "#eab308" },
  { key: "processing", label: "প্রক্রিয়াধীন", color: "#3b82f6" },
  { key: "completed",  label: "সম্পন্ন",      color: "#22c55e" },
  { key: "cancelled",  label: "বাতিল",        color: "#ef4444" },
];

interface TooltipPayload {
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm text-sm">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} টি অর্ডার</p>
    </div>
  );
}

export function OrdersByStatusChart({ data }: Props) {
  const chartData = STATUS_CONFIG
    .map((s) => ({ name: s.label, value: data[s.key] ?? 0, color: s.color }))
    .filter((d) => d.value > 0);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Order অবস্থা</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            কোনো order নেই
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span style={{ color: "hsl(var(--foreground))", fontSize: 12 }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
