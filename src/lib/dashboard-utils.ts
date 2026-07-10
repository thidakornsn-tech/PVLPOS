import type { OrderWithItems } from "@/lib/types";
import { isCountableOrder } from "@/lib/types";

export type DatePreset = "today" | "7d" | "30d" | "90d" | "all";

export function getDateRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: startOfToday, to: null };
    case "7d":
      return { from: new Date(startOfToday.getTime() - 6 * 86400000), to: null };
    case "30d":
      return { from: new Date(startOfToday.getTime() - 29 * 86400000), to: null };
    case "90d":
      return { from: new Date(startOfToday.getTime() - 89 * 86400000), to: null };
    default:
      return { from: null, to: null };
  }
}

export function filterOrdersByRange(orders: OrderWithItems[], preset: DatePreset) {
  const { from } = getDateRange(preset);
  if (!from) return orders;
  return orders.filter((o) => new Date(o.created_at) >= from);
}

export const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function bucketKey(dateIso: string, grouping: "day" | "week" | "month") {
  const d = new Date(dateIso);
  if (grouping === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (grouping === "week") {
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildSalesTrend(orders: OrderWithItems[], grouping: "day" | "week" | "month") {
  const countable = orders.filter(isCountableOrder);
  const buckets = new Map<string, number>();
  countable.forEach((o) => {
    const key = bucketKey(o.created_at, grouping);
    buckets.set(key, (buckets.get(key) ?? 0) + o.total);
  });
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, total]) => ({ key, total }));
}

export function topProductsByRevenue(orders: OrderWithItems[], limit = 5) {
  const map = new Map<string, { name: string; revenue: number; units: number }>();
  orders.filter(isCountableOrder).forEach((o) => {
    o.order_items.forEach((it) => {
      if (it.is_giveaway) return;
      const key = it.product_id ?? it.product_name;
      const cur = map.get(key) ?? { name: it.product_name, revenue: 0, units: 0 };
      cur.revenue += it.line_total;
      cur.units += it.qty;
      map.set(key, cur);
    });
  });
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function salesPersonLeaderboard(orders: OrderWithItems[]) {
  const map = new Map<string, { name: string; revenue: number; orders: number }>();
  orders.filter(isCountableOrder).forEach((o) => {
    const key = o.sales_person_name ?? "Unassigned";
    const cur = map.get(key) ?? { name: key, revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    map.set(key, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export function paymentMethodBreakdown(orders: OrderWithItems[]) {
  const map = new Map<string, number>();
  orders.filter(isCountableOrder).forEach((o) => {
    const key = o.payment_method_name ?? "Unspecified";
    map.set(key, (map.get(key) ?? 0) + o.total);
  });
  return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
}

export function salesByEvent(orders: OrderWithItems[]) {
  const map = new Map<string, { name: string; revenue: number; orders: number }>();
  orders.filter(isCountableOrder).forEach((o) => {
    const key = o.event_name ?? "No Event";
    const cur = map.get(key) ?? { name: key, revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    map.set(key, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}
