import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useGetStats, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Tags, ShoppingCart, CheckCircle } from "lucide-react";
import { SyncStatusBanner } from "@/components/admin/sync-status-banner";
import { OrdersByDayChart } from "@/components/admin/orders-by-day-chart";
import { OrdersByStatusChart } from "@/components/admin/orders-by-status-chart";
import { OrdersByPaymentChart } from "@/components/admin/orders-by-payment-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={`border border-border/60 bg-card/80 ${className}`}>
      <CardHeader>
        <div className="h-4 w-36 rounded bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-[220px] rounded bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

const STAT_ACCENT: Record<number, string> = {
  0: "border-t-blue-500",
  1: "border-t-purple-500",
  2: "border-t-green-500",
  3: "border-t-orange-500",
};

export default function AdminDashboard() {
  useAdminAuth();

  const { data: stats, isLoading } = useGetStats({
    query: { queryKey: getGetStatsQueryKey() },
  });

  const statCards = [
    { title: "Total Orders", value: stats?.totalOrders || 0, icon: ShoppingCart, color: "text-blue-400", bg: "bg-blue-500/10" },
    { title: "Total Products", value: stats?.totalProducts || 0, icon: Package, color: "text-purple-400", bg: "bg-purple-500/10" },
    { title: "Active Products", value: stats?.activeProducts || 0, icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" },
    { title: "Categories", value: stats?.totalCategories || 0, icon: Tags, color: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Dashboard"
          description="Overview of your store performance."
        />

        <SyncStatusBanner />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <Card key={i} className={`border border-border/60 bg-card/80 border-t-2 ${STAT_ACCENT[i]}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-bold tracking-tight">
                  {isLoading ? <div className="h-8 w-16 rounded bg-muted animate-pulse" /> : stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ChartSkeleton className="col-span-2" />
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <OrdersByDayChart data={stats?.ordersByDay ?? []} />
            <OrdersByStatusChart data={stats?.ordersByStatus ?? {}} />
            <OrdersByPaymentChart data={stats?.ordersByPayment ?? {}} />
          </div>
        )}

        <Card className="border border-border/60 bg-card/80">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pl-4">Order ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pr-4">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : stats?.recentOrders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No recent orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats?.recentOrders?.map((order) => (
                    <TableRow key={order.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-primary pl-4 py-3">#{order.id}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{order.customerName}</span>
                          <span className="text-xs text-muted-foreground">{order.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm py-3">{order.productName || "Unknown"}</TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className="capitalize text-xs">{order.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[order.status || "pending"] || "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}>
                          {order.status || "pending"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground pr-4 py-3">{format(new Date(order.createdAt), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
