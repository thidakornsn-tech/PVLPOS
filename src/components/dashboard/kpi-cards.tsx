import { formatCurrency } from "@/lib/utils";

export function KpiCards({
  revenue,
  orderCount,
  avgOrderValue,
  unitsSold,
}: {
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  unitsSold: number;
}) {
  const cards = [
    { label: "Revenue", value: formatCurrency(revenue) },
    { label: "Orders", value: orderCount.toLocaleString() },
    { label: "Avg. Order Value", value: formatCurrency(avgOrderValue) },
    { label: "Units Sold", value: unitsSold.toLocaleString() },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="border border-gray-200 rounded-lg bg-white p-4">
          <div className="text-xs text-gray-500">{c.label}</div>
          <div className="text-xl font-semibold text-gray-900 mt-1">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
