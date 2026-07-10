"use client";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { activePromotion, availableStock } from "@/lib/queries/products";
import type { EventAllocation, Product, Promotion } from "@/lib/types";

export function ProductGrid({
  products,
  promotions,
  allocations,
  onAdd,
}: {
  products: Product[];
  promotions: Promotion[];
  allocations: EventAllocation[];
  onAdd: (product: Product, priceLabel: string, unitPrice: number, isGiveaway: boolean) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.name} ${p.brand ?? ""} ${p.barcode ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[70vh] overflow-y-auto pr-1">
        {filtered.slice(0, 120).map((p) => {
          const promo = activePromotion(p, promotions);
          const avail = availableStock(p, allocations);
          const price = promo ? promo.promo_price : p.rrp_price;
          const label = promo ? promo.name : "RRP";
          return (
            <div key={p.id} className="border border-gray-200 rounded-lg p-3 bg-white flex flex-col">
              <div className="text-xs text-gray-400">{p.brand}</div>
              <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{p.name}</div>
              <div className="text-sm text-gray-700 mb-1">
                {formatCurrency(price)}{" "}
                {promo && <span className="text-[10px] text-green-600 font-medium">{label}</span>}
              </div>
              <div className={`text-[11px] mb-2 ${avail <= 0 ? "text-red-600" : "text-gray-400"}`}>
                {avail <= 0 ? "Out of stock" : `${avail} available`}
              </div>
              <button
                disabled={avail <= 0}
                onClick={() => onAdd(p, label, price, false)}
                className="mt-auto inline-flex items-center justify-center gap-1 text-xs bg-gray-900 text-white py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-10">No products found.</p>}
      </div>
    </div>
  );
}
