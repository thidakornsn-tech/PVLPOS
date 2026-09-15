"use client";
import { useState } from "react";
import { Trash2, Gift, Pencil, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Select } from "@/components/ui/field";
import type { CartLine, Product, Promotion } from "@/lib/types";

const CUSTOM_LABEL = "__custom__";

export function CartPanel({
  cart,
  products,
  promotions,
  onChangeQty,
  onChangePrice,
  onToggleGiveaway,
  onRemove,
}: {
  cart: CartLine[];
  products: Product[];
  promotions: Promotion[];
  onChangeQty: (idx: number, qty: number) => void;
  onChangePrice: (idx: number, label: string, price: number) => void;
  onToggleGiveaway: (idx: number) => void;
  onRemove: (idx: number) => void;
}) {
  // Which cart row (by index) currently has its custom-price input open.
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState("");

  if (cart.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">Cart is empty — add products from the left.</p>;
  }

  return (
    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
      {cart.map((line, idx) => {
        const product = products.find((p) => p.id === line.productId);
        // All ENABLED promotions for this product, not just the one flagged
        // "active" — several promotions can legitimately run at once, so the
        // cashier picks whichever applies at checkout.
        const enabledPromos = product ? promotions.filter((p) => p.product_id === product.id && p.enabled) : [];
        const options = [
          { label: "RRP", price: product?.rrp_price ?? line.unitPrice },
          ...enabledPromos.map((p) => ({ label: p.name, price: p.promo_price })),
        ];
        const isEditingThis = editingIdx === idx;

        return (
          <div key={idx} className="p-3 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{line.name}</div>
              <div className="text-xs text-gray-400">{line.brand}</div>
            </div>

            {isEditingThis ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  autoFocus
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = Math.max(0, Number(customValue) || 0);
                      onChangePrice(idx, "Custom", n);
                      setEditingIdx(null);
                    }
                  }}
                  className="w-24 text-xs border border-gray-300 rounded px-2 py-1"
                  placeholder="Price"
                />
                <button
                  onClick={() => {
                    const n = Math.max(0, Number(customValue) || 0);
                    onChangePrice(idx, "Custom", n);
                    setEditingIdx(null);
                  }}
                  className="text-green-600 hover:text-green-800"
                  title="Confirm price"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Select
                  className="w-32 text-xs"
                  value={line.isGiveaway ? "giveaway" : line.priceLabel === "Custom" ? CUSTOM_LABEL : line.priceLabel}
                  onChange={(e) => {
                    if (e.target.value === "giveaway") return onToggleGiveaway(idx);
                    if (e.target.value === CUSTOM_LABEL) {
                      setCustomValue(String(line.unitPrice ?? ""));
                      setEditingIdx(idx);
                      return;
                    }
                    const opt = options.find((o) => o.label === e.target.value);
                    if (opt) onChangePrice(idx, opt.label, opt.price);
                  }}
                >
                  {options.map((o) => (
                    <option key={o.label} value={o.label}>
                      {o.label} — {formatCurrency(o.price)}
                    </option>
                  ))}
                  <option value={CUSTOM_LABEL}>Custom price…</option>
                  <option value="giveaway">Giveaway (Free)</option>
                </Select>
                {!line.isGiveaway && (
                  <button
                    onClick={() => {
                      setCustomValue(String(line.unitPrice ?? ""));
                      setEditingIdx(idx);
                    }}
                    className="text-gray-400 hover:text-gray-700"
                    title="Edit price"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <input
              type="number"
              min={1}
              value={line.qty}
              onChange={(e) => onChangeQty(idx, Math.max(1, Number(e.target.value)))}
              className="w-14 text-center text-xs border border-gray-200 rounded py-1"
            />
            <div className="w-20 text-right font-medium">
              {line.isGiveaway ? (
                <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                  <Gift className="w-3 h-3" /> Free
                </span>
              ) : (
                formatCurrency(line.unitPrice * line.qty)
              )}
            </div>
            <button onClick={() => onRemove(idx)} className="text-gray-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
