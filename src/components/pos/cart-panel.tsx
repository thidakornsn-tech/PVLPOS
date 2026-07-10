"use client";
import { Trash2, Gift } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Select } from "@/components/ui/field";
import { activePromotion } from "@/lib/queries/products";
import type { CartLine, Product, Promotion } from "@/lib/types";

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
  if (cart.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">Cart is empty — add products from the left.</p>;
  }

  return (
    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
      {cart.map((line, idx) => {
        const product = products.find((p) => p.id === line.productId);
        const promo = product ? activePromotion(product, promotions) : null;
        const options = [
          { label: "RRP", price: product?.rrp_price ?? line.unitPrice },
          ...(promo ? [{ label: promo.name, price: promo.promo_price }] : []),
        ];
        return (
          <div key={idx} className="p-3 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{line.name}</div>
              <div className="text-xs text-gray-400">{line.brand}</div>
            </div>
            <Select
              className="w-32 text-xs"
              value={line.isGiveaway ? "giveaway" : line.priceLabel}
              onChange={(e) => {
                if (e.target.value === "giveaway") return onToggleGiveaway(idx);
                const opt = options.find((o) => o.label === e.target.value);
                if (opt) onChangePrice(idx, opt.label, opt.price);
              }}
            >
              {options.map((o) => (
                <option key={o.label} value={o.label}>
                  {o.label} — {formatCurrency(o.price)}
                </option>
              ))}
              <option value="giveaway">Giveaway (Free)</option>
            </Select>
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
