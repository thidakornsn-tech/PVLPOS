"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/types";

export function ProductFormModal({
  open,
  onClose,
  onSave,
  product,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Product>) => void;
  product: Product | null; // null = create
}) {
  const [form, setForm] = useState<Partial<Product>>({});

  useEffect(() => {
    if (open) {
      setForm(
        product ?? {
          brand: "",
          name: "",
          barcode: "",
          sku: "",
          category: "",
          rrp_price: 0,
          current_stock: 0,
        }
      );
    }
  }, [open, product]);

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? "Edit Product" : "Add Product"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)} disabled={!form.name}>
            {product ? "Save Changes" : "Add Product"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Product Name *">
          <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>
        <Field label="Brand">
          <Input value={form.brand ?? ""} onChange={(e) => set("brand", e.target.value)} />
        </Field>
        <Field label="Barcode">
          <Input value={form.barcode ?? ""} onChange={(e) => set("barcode", e.target.value)} />
        </Field>
        <Field label="Product Code (SKU)">
          <Input value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
        </Field>
        <Field label="Category">
          <Input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} />
        </Field>
        <Field label="RRP Price">
          <Input
            type="number"
            min={0}
            value={form.rrp_price ?? 0}
            onChange={(e) => set("rrp_price", Number(e.target.value))}
          />
        </Field>
        <Field label="Current Stock">
          <Input
            type="number"
            min={0}
            value={form.current_stock ?? 0}
            onChange={(e) => set("current_stock", Number(e.target.value))}
          />
        </Field>
      </div>
    </Modal>
  );
}
