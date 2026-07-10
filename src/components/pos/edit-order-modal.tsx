"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import type { CartLine, EventRow, OrderWithItems, PaymentMethod, SalesPerson } from "@/lib/types";

export function EditOrderModal({
  order,
  onClose,
  onSave,
  events,
  salesPeople,
  paymentMethods,
}: {
  order: OrderWithItems | null;
  onClose: () => void;
  onSave: (patch: {
    eventId: string | null;
    eventName: string | null;
    salesPersonId: string | null;
    salesPersonName: string | null;
    paymentMethodId: string | null;
    paymentMethodName: string | null;
    customerName: string | null;
    customerPhone: string | null;
    discount: number;
  }, items: CartLine[]) => void;
  events: EventRow[];
  salesPeople: SalesPerson[];
  paymentMethods: PaymentMethod[];
}) {
  const [eventId, setEventId] = useState("");
  const [salesPersonId, setSalesPersonId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<CartLine[]>([]);

  useEffect(() => {
    if (!order) return;
    setEventId(order.event_id ?? "");
    setSalesPersonId(order.sales_person_id ?? "");
    setPaymentMethodId(order.payment_method_id ?? "");
    setCustomerName(order.customer_name ?? "");
    setCustomerPhone(order.customer_phone ?? "");
    setDiscount(order.discount);
    setItems(
      order.order_items.map((it) => ({
        productId: it.product_id ?? "",
        name: it.product_name,
        brand: it.brand,
        qty: it.qty,
        unitPrice: it.unit_price,
        priceLabel: it.price_label ?? "RRP",
        isGiveaway: it.is_giveaway,
        maxAvailable: 9999,
      }))
    );
  }, [order]);

  if (!order) return null;

  function updateQty(idx: number, qty: number) {
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, qty) } : it)));
  }
  function removeItem(idx: number) {
    setItems((its) => its.filter((_, i) => i !== idx));
  }

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={`Edit Order ${order.order_number}`}
      width="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const ev = events.find((e) => e.id === eventId);
              const sp = salesPeople.find((s) => s.id === salesPersonId);
              const pm = paymentMethods.find((p) => p.id === paymentMethodId);
              onSave(
                {
                  eventId: eventId || null,
                  eventName: ev?.name ?? null,
                  salesPersonId: salesPersonId || null,
                  salesPersonName: sp?.name ?? null,
                  paymentMethodId: paymentMethodId || null,
                  paymentMethodName: pm?.name ?? null,
                  customerName: customerName || null,
                  customerPhone: customerPhone || null,
                  discount,
                },
                items
              );
            }}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Event">
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">— None —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sales Person">
          <Select value={salesPersonId} onChange={(e) => setSalesPersonId(e.target.value)}>
            <option value="">— None —</option>
            {salesPeople.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment Method">
          <Select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
            <option value="">— None —</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Discount">
          <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} />
        </Field>
        <Field label="Customer name">
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </Field>
      </div>

      <p className="text-xs font-medium text-gray-500 mb-1">Items</p>
      <div className="border border-gray-200 rounded-md divide-y divide-gray-100 mb-3 max-h-56 overflow-y-auto">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
            <div className="flex-1 min-w-0 truncate">{it.name}</div>
            <span className="text-xs text-gray-400">{it.isGiveaway ? "Free" : formatCurrency(it.unitPrice)}</span>
            <input
              type="number"
              min={1}
              value={it.qty}
              onChange={(e) => updateQty(i, Number(e.target.value))}
              className="w-16 text-center text-xs border border-gray-200 rounded py-1"
            />
            <button onClick={() => removeItem(i)} className="text-xs text-red-500 hover:underline">
              Remove
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400 p-3">No items left in this order.</p>}
      </div>
    </Modal>
  );
}
