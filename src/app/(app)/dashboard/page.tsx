"use client";
import { useMemo, useState } from "react";
import { useProducts } from "@/lib/queries/products";
import { useOrders, useCancelDraft, useDeleteOrders, useRefundOrder, useUpdateOrder } from "@/lib/queries/orders";
import { useEvents, usePaymentMethods, useSalesPeople } from "@/lib/queries/master-data";
import { useCurrentUser } from "@/lib/use-current-user";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { isCountableOrder, type OrderWithItems } from "@/lib/types";
import {
  buildSalesTrend,
  filterOrdersByRange,
  paymentMethodBreakdown,
  salesByEvent,
  salesPersonLeaderboard,
  topProductsByRevenue,
  type DatePreset,
} from "@/lib/dashboard-utils";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { BarList } from "@/components/dashboard/bar-list";
import { OrderDetailModal } from "@/components/pos/order-detail-modal";
import { EditOrderModal } from "@/components/pos/edit-order-modal";
import { DeleteOrderDialog } from "@/components/pos/delete-order-dialog";
import { Badge } from "@/components/ui/badge";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "all", label: "All Time" },
];
const LOW_STOCK_THRESHOLD = 10;

export default function DashboardPage() {
  const { data: products = [] } = useProducts();
  const { data: orders = [] } = useOrders();
  const { data: events = [] } = useEvents();
  const { data: salesPeople = [] } = useSalesPeople();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const user = useCurrentUser();
  const toast = useToast();

  const updateOrder = useUpdateOrder();
  const deleteOrders = useDeleteOrders();
  const refundOrder = useRefundOrder();
  const cancelDraft = useCancelDraft();

  const [preset, setPreset] = useState<DatePreset>("30d");
  const [grouping, setGrouping] = useState<"day" | "week" | "month">("day");
  const [detailOrder, setDetailOrder] = useState<OrderWithItems | null>(null);
  const [editOrder, setEditOrder] = useState<OrderWithItems | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<OrderWithItems[] | null>(null);

  const scoped = useMemo(() => filterOrdersByRange(orders, preset), [orders, preset]);
  const countable = useMemo(() => scoped.filter(isCountableOrder), [scoped]);

  const revenue = countable.reduce((s, o) => s + o.total, 0);
  const unitsSold = countable.reduce((s, o) => s + o.order_items.reduce((u, it) => u + (it.is_giveaway ? 0 : it.qty), 0), 0);
  const avgOrderValue = countable.length ? revenue / countable.length : 0;

  const trend = useMemo(() => buildSalesTrend(scoped, grouping), [scoped, grouping]);
  const topProducts = useMemo(() => topProductsByRevenue(scoped), [scoped]);
  const leaderboard = useMemo(() => salesPersonLeaderboard(scoped), [scoped]);
  const paymentBreakdown = useMemo(() => paymentMethodBreakdown(scoped), [scoped]);
  const eventBreakdown = useMemo(() => salesByEvent(scoped), [scoped]);
  const lowStock = products.filter((p) => p.current_stock > 0 && p.current_stock <= LOW_STOCK_THRESHOLD);
  const outOfStock = products.filter((p) => p.current_stock <= 0);

  const recentOrders = orders.slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`text-xs px-2.5 py-1.5 rounded-md border ${
                preset === p.key ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <KpiCards revenue={revenue} orderCount={countable.length} avgOrderValue={avgOrderValue} unitsSold={unitsSold} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-gray-200 rounded-lg bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Sales Over Time</h3>
            <div className="flex items-center gap-1">
              {(["day", "week", "month"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGrouping(g)}
                  className={`text-[11px] px-2 py-1 rounded border ${
                    grouping === g ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500"
                  }`}
                >
                  {g === "day" ? "Daily" : g === "week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </div>
          <SalesTrendChart data={trend} />
        </div>

        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sales by Event</h3>
          <BarList items={eventBreakdown.map((e) => ({ name: e.name, value: e.revenue, sub: `${e.orders} orders` }))} valueLabel={formatCurrency} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top 5 Products by Revenue</h3>
          <BarList items={topProducts.map((p) => ({ name: p.name, value: p.revenue, sub: `${p.units} units` }))} valueLabel={formatCurrency} />
        </div>
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Sales Person Leaderboard</h3>
          <BarList items={leaderboard.map((s) => ({ name: s.name, value: s.revenue, sub: `${s.orders} orders` }))} valueLabel={formatCurrency} />
        </div>
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Methods</h3>
          <BarList items={paymentBreakdown.map((p) => ({ name: p.name, value: p.total }))} valueLabel={formatCurrency} />
        </div>
      </div>

      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Stock Alerts</h3>
          <p className="text-xs text-amber-700">
            {outOfStock.length} product(s) out of stock, {lowStock.length} product(s) low (≤ {LOW_STOCK_THRESHOLD} units).
          </p>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent Orders</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">Order #</th>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Total</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900 cursor-pointer" onClick={() => setDetailOrder(o)}>
                  {o.order_number}
                </td>
                <td className="px-4 py-2 text-gray-500">{formatDateTime(o.created_at)}</td>
                <td className="px-4 py-2">{formatCurrency(o.total)}</td>
                <td className="px-4 py-2">
                  <Badge tone={o.status === "completed" ? "green" : o.status === "draft" ? "amber" : o.status === "refunded" ? "blue" : "red"}>
                    {o.status}
                  </Badge>
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button className="text-xs text-gray-600 hover:underline" onClick={() => setEditOrder(o)}>
                    Edit
                  </button>
                  <button className="text-xs text-red-600 hover:underline" onClick={() => setDeleteTargets([o])}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <OrderDetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onEdit={() => {
          setEditOrder(detailOrder);
          setDetailOrder(null);
        }}
        onDelete={() => {
          if (detailOrder) setDeleteTargets([detailOrder]);
          setDetailOrder(null);
        }}
        onRefund={() => {
          if (detailOrder) refundOrder.mutate(detailOrder.id, { onSuccess: () => toast.push("Order refunded") });
          setDetailOrder(null);
        }}
        onCancelDraft={() => {
          if (detailOrder) cancelDraft.mutate(detailOrder.id, { onSuccess: () => toast.push("Draft cancelled") });
          setDetailOrder(null);
        }}
      />

      <EditOrderModal
        order={editOrder}
        onClose={() => setEditOrder(null)}
        events={events}
        salesPeople={salesPeople}
        paymentMethods={paymentMethods}
        onSave={(patch, items) => {
          if (!editOrder || !user) return;
          updateOrder.mutate(
            { order: editOrder, patch, newItems: items, userName: user.name },
            { onSuccess: () => { toast.push("Order updated"); setEditOrder(null); } }
          );
        }}
      />

      <DeleteOrderDialog
        orders={deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={(restock) => {
          if (!deleteTargets || !user) return;
          deleteOrders.mutate(
            { orders: deleteTargets, restock, userName: user.name },
            { onSuccess: () => { toast.push("Order(s) deleted"); setDeleteTargets(null); } }
          );
        }}
      />
    </div>
  );
}
