"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

export function SalesTrendChart({ data }: { data: { key: string; total: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-16">No sales in this period yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
        <XAxis dataKey="key" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={70} />
        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
        <Line type="monotone" dataKey="total" stroke="#111827" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
