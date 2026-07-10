"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Product, Promotion } from "@/lib/types";

export function PromotionModal({
  open,
  onClose,
  product,
  promotions,
  onAdd,
  onDelete,
  onToggleEnabled,
  onSetActive,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  promotions: Promotion[];
  onAdd: (name: string, price: number) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onSetActive: (promotionId: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);

  if (!product) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Promotions — ${product.name}`} width="max-w-xl">
      <div className="flex items-end gap-2 mb-4">
        <Field label="Promotion name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grand Opening" />
        </Field>
        <Field label="Promo price">
          <Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </Field>
        <Button
          size="sm"
          className="mb-3"
          disabled={!name || price <= 0}
          onClick={() => {
            onAdd(name, price);
            setName("");
            setPrice(0);
          }}
        >
          Add
        </Button>
      </div>

      <div className="border border-gray-100 rounded-md divide-y divide-gray-100">
        {promotions.length === 0 && <p className="text-xs text-gray-400 p-3">No promotions yet.</p>}
        {promotions.map((p) => (
          <div key={p.id} className="px-3 py-2 flex items-center justify-between text-sm">
            <div>
              <span className="font-medium text-gray-800">{p.name}</span>{" "}
              <span className="text-gray-500">{formatCurrency(p.promo_price)}</span>{" "}
              {product.active_promotion_id === p.id && <Badge tone="green">Active in POS</Badge>}
              {!p.enabled && <Badge tone="gray">Disabled</Badge>}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button className="text-gray-500 hover:underline" onClick={() => onToggleEnabled(p.id, !p.enabled)}>
                {p.enabled ? "Disable" : "Enable"}
              </button>
              <button
                className="text-gray-500 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!p.enabled}
                onClick={() => onSetActive(product.active_promotion_id === p.id ? null : p.id)}
              >
                {product.active_promotion_id === p.id ? "Deactivate" : "Set Active"}
              </button>
              <button className="text-red-600 hover:underline" onClick={() => onDelete(p.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
