import { useState, useMemo } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  useListOrders,
  getListOrdersQueryKey,
  useUpdateOrderStatus,
  useBulkUpdateOrderStatus,
} from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, parseISO, isValid } from "date-fns";
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | "">("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sort state
  type SortKey = "id" | "createdAt" | "customerName" | "phone" | "productName" | "paymentMethod" | "status" | "message";
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  useAdminAuth();

  const ordersQueryKey = getListOrdersQueryKey();

  const { data: orders, isLoading } = useListOrders({
    query: { queryKey: ordersQueryKey }
  });

  // Derive unique payment methods from loaded data
  const paymentMethods = useMemo(() => {
    if (!orders) return [];
    const methods = Array.from(new Set(orders.map((o) => o.paymentMethod).filter(Boolean)));
    return methods.sort();
  }, [orders]);

  // Apply filters client-side
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const q = search.trim().toLowerCase();
    const parsedFrom = dateFrom ? parseISO(dateFrom) : null;
    const parsedTo = dateTo ? parseISO(dateTo) : null;
    const fromDate = parsedFrom && isValid(parsedFrom) ? startOfDay(parsedFrom) : null;
    const toDate = parsedTo && isValid(parsedTo) ? endOfDay(parsedTo) : null;

    return orders.filter((order) => {
      if (q) {
        const matchesName = order.customerName?.toLowerCase().includes(q);
        const matchesPhone = order.phone?.toLowerCase().includes(q);
        const matchesEmail = order.email?.toLowerCase().includes(q);
        const matchesProduct = order.productName?.toLowerCase().includes(q);
        const matchesId = String(order.id).includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesProduct && !matchesId) {
          return false;
        }
      }
      if (filterStatus !== "all" && order.status !== filterStatus) return false;
      if (filterPayment !== "all" && order.paymentMethod !== filterPayment) return false;
      if (fromDate || toDate) {
        const created = new Date(order.createdAt);
        if (fromDate && created < fromDate) return false;
        if (toDate && created > toDate) return false;
      }
      return true;
    });
  }, [orders, search, filterStatus, filterPayment, dateFrom, dateTo]);

  // Apply sort client-side on top of filtered results
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      if (sortKey === "id") {
        aVal = a.id;
        bVal = b.id;
      } else if (sortKey === "createdAt") {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else {
        aVal = (a[sortKey] ?? "").toString().toLowerCase();
        bVal = (b[sortKey] ?? "").toString().toLowerCase();
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortKey, sortDir]);

  const hasActiveFilters =
    search.trim() !== "" ||
    filterStatus !== "all" ||
    filterPayment !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterPayment("all");
    setDateFrom("");
    setDateTo("");
  };

  const updateStatusMutation = useUpdateOrderStatus({
    mutation: {
      onMutate: async ({ id, data: { status } }) => {
        await queryClient.cancelQueries({ queryKey: ordersQueryKey });
        const previous = queryClient.getQueryData<Order[]>(ordersQueryKey);
        queryClient.setQueryData<Order[]>(ordersQueryKey, (old) =>
          old?.map((o) => (o.id === id ? { ...o, status } : o)) ?? []
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData<Order[]>(ordersQueryKey, context.previous);
        }
        toast({ title: "Failed to update status", variant: "destructive" });
      },
      onSuccess: (_data, { id }) => {
        toast({ title: "Status updated", description: `Order #${id} status saved.` });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      },
    },
  });

  const bulkUpdateMutation = useBulkUpdateOrderStatus({
    mutation: {
      onMutate: async ({ data: { ids, status } }) => {
        await queryClient.cancelQueries({ queryKey: ordersQueryKey });
        const previous = queryClient.getQueryData<Order[]>(ordersQueryKey);
        const idSet = new Set(ids);
        queryClient.setQueryData<Order[]>(ordersQueryKey, (old) =>
          old?.map((o) => (idSet.has(o.id) ? { ...o, status } : o)) ?? []
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData<Order[]>(ordersQueryKey, context.previous);
        }
        toast({ title: "Bulk update failed", variant: "destructive" });
      },
      onSuccess: (_data, { data: { ids } }) => {
        toast({
          title: "Bulk update applied",
          description: `${ids.length} order${ids.length === 1 ? "" : "s"} updated.`,
        });
        setSelectedIds(new Set());
        setBulkStatus("");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      },
    },
  });

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateStatusMutation.mutate({
      id: orderId,
      data: { status: newStatus as OrderStatus },
    });
  };

  // Selection operates on filtered orders only
  const filteredIds = filteredOrders.map((o) => o.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someSelected = filteredIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkApply = () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setConfirmOpen(true);
  };

  const handleConfirmBulk = () => {
    if (!bulkStatus) return;
    bulkUpdateMutation.mutate({
      data: {
        ids: Array.from(selectedIds),
        status: bulkStatus as OrderStatus,
      },
    });
    setConfirmOpen(false);
  };

  const selectedCount = selectedIds.size;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Orders"
          description="View and manage customer orders."
        />

        {/* Filter Bar */}
        <div className="rounded-xl border border-border/60 bg-card/80 p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, phone, email, product, or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Status filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-[150px] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment method filter */}
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="h-9 w-[160px] text-sm">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Date range:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-[160px] text-sm"
              aria-label="From date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-[160px] text-sm"
              aria-label="To date"
            />
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredOrders.length} of {orders?.length ?? 0} order{orders?.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              {selectedCount} order{selectedCount === 1 ? "" : "s"} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <Select
                value={bulkStatus}
                onValueChange={(val) => setBulkStatus(val as OrderStatus)}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Set status…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!bulkStatus || bulkUpdateMutation.isPending}
                onClick={handleBulkApply}
                className="h-8 text-xs"
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => { setSelectedIds(new Set()); setBulkStatus(""); }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/60 bg-card/80 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/60 bg-muted/20">
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={someSelected && !allSelected ? "indeterminate" : allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                      className="translate-y-0.5"
                    />
                  </TableHead>
                  {(
                    [
                      { key: "id", label: "Order ID" },
                      { key: "createdAt", label: "Date" },
                      { key: "customerName", label: "Customer" },
                      { key: "phone", label: "Contact" },
                      { key: "productName", label: "Product" },
                      { key: "paymentMethod", label: "Payment" },
                      { key: "status", label: "Status" },
                      { key: "message", label: "Message" },
                    ] as Array<{ key: SortKey; label: string; noSort?: boolean }>
                  ).map(({ key, label, noSort }) => (
                    <TableHead
                      key={key}
                      className={`text-xs font-semibold uppercase tracking-wide text-muted-foreground ${key === "message" ? "pr-4" : ""} ${!noSort ? "cursor-pointer select-none hover:text-foreground" : ""}`}
                      onClick={noSort ? undefined : () => handleSort(key as SortKey)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {!noSort && (
                          sortKey === key ? (
                            sortDir === "asc"
                              ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
                              : <ChevronDown className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />
                          )
                        )}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                      {hasActiveFilters ? "No orders match the current filters." : "No orders found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className={`border-b border-border/30 hover:bg-muted/30 transition-colors last:border-0 ${selectedIds.has(order.id) ? "bg-primary/5" : ""}`}
                    >
                      <TableCell className="pl-4 py-3.5">
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggleSelectRow(order.id)}
                          aria-label={`Select order #${order.id}`}
                          className="translate-y-0.5"
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-primary whitespace-nowrap py-3.5">#{order.id}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground py-3.5">{format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}</TableCell>
                      <TableCell className="font-medium text-sm py-3.5">{order.customerName}</TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap text-sm">{order.phone}</span>
                          {order.email && <span className="text-xs text-muted-foreground">{order.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm py-3.5">{order.productName || "Unknown Product"}</TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant="secondary" className="capitalize whitespace-nowrap text-xs">{order.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Select
                          value={order.status || "pending"}
                          onValueChange={(val) => handleStatusChange(order.id, val)}
                        >
                          <SelectTrigger className={`h-8 w-[130px] text-xs font-semibold border rounded-full ${STATUS_COLORS[order.status || "pending"] || "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground pr-4 py-3.5" title={order.message || ""}>
                        {order.message || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Update</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to set{" "}
              <span className="font-semibold text-foreground">{selectedCount} order{selectedCount === 1 ? "" : "s"}</span>{" "}
              to{" "}
              <span className="font-semibold text-foreground capitalize">{bulkStatus ? STATUS_LABELS[bulkStatus] : ""}</span>.
              This action cannot be undone automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulk}>
              Update {selectedCount} Order{selectedCount === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
