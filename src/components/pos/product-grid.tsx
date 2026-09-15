"use client";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { availableStock } from "@/lib/queries/products";
import type { EventAllocation, Product, Promotion } from "@/lib/types";

type PriceOption = { label: string; price: number };

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
  // Per-product selected price option (RRP or one of its enabled promotions).
  // Keyed by product id so each card remembers its own choice independently.
  const [selectedLabel, setSelectedLabel] = useState<Record<string, string>>({});

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.name} ${p.brand ?? ""} ${p.barcode ?? ""} ${p.sku ?? ""}`.toLowerCase().includes(q);
  });

  function priceOptionsFor(p: Product): PriceOption[] {
    const enabledPromos = promotions.filter((pr) => pr.product_id === p.id && pr.enabled);
    return [{ label: "RRP", price: p.rrp_price }, ...enabledPromos.map((pr) => ({ label: pr.name, price: pr.promo_price }))];
  }

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
          const avail = availableStock(p, allocations);
          const options = priceOptionsFor(p);
          const currentLabel = selectedLabel[p.id] ?? options[0].label;
          const current = options.find((o) => o.label === currentLabel) ?? options[0];
          return (
            <div key={p.id} className="border border-gray-200 rounded-lg p-3 bg-white flex flex-col">
              <div className="text-xs text-gray-400">{p.brand}</div>
              <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{p.name}</div>

              {options.length > 1 ? (
                <select
                  value={currentLabel}
                  onChange={(e) => setSelectedLabel((s) => ({ ...s, [p.id]: e.target.value }))}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 mb-1"
                >
                  {options.map((o) => (
                    <option key={o.label} value={o.label}>
                      {o.label} — {formatCurrency(o.price)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-gray-700 mb-1">{formatCurrency(current.price)}</div>
              )}

              <div className={`text-[11px] mb-2 ${avail <= 0 ? "text-red-600" : "text-gray-400"}`}>
                {avail <= 0 ? "Out of stock" : `${avail} available`}
              </div>
              <button
                disabled={avail <= 0}
                onClick={() => onAdd(p, current.label, current.price, false)}
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
