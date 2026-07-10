"use client";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { CartLine, EventRow, PaymentMethod, SalesPerson } from "@/lib/types";

export function CheckoutPanel({
  cart,
  events,
  salesPeople,
  paymentMethods,
  eventId,
  setEventId,
  salesPersonId,
  setSalesPersonId,
  paymentMethodId,
  setPaymentMethodId,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  discount,
  setDiscount,
  amountReceived,
  setAmountReceived,
  onCompleteSale,
  onSaveDraft,
  onCancel,
  submitting,
}: {
  cart: CartLine[];
  events: EventRow[];
  salesPeople: SalesPerson[];
  paymentMethods: PaymentMethod[];
  eventId: string;
  setEventId: (v: string) => void;
  salesPersonId: string;
  setSalesPersonId: (v: string) => void;
  paymentMethodId: string;
  setPaymentMethodId: (v: string) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  discount: number;
  setDiscount: (v: number) => void;
  amountReceived: number | "";
  setAmountReceived: (v: number | "") => void;
  onCompleteSale: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const subtotal = cart.reduce((s, l) => s + (l.isGiveaway ? 0 : l.unitPrice * l.qty), 0);
  const total = Math.max(0, subtotal - discount);
  const change = amountReceived === "" ? null : Math.max(0, Number(amountReceived) - total);

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4 flex flex-col gap-3 sticky top-20">
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
      <div className="grid grid-cols-2 gap-2">
        <Field label="Customer name">
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </Field>
      </div>

      <div className="pt-2 border-t border-gray-100 text-sm space-y-1">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center text-gray-500">
          <span>Discount</span>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
            className="w-24 text-right border border-gray-200 rounded px-2 py-1 text-xs"
          />
        </div>
        <div className="flex justify-between font-semibold text-gray-900 text-base pt-1">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <Field label="Amount Received">
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={amountReceived}
          onChange={(e) => setAmountReceived(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </Field>
      {change !== null && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>Change</span>
          <span>{formatCurrency(change)}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button disabled={cart.length === 0 || submitting} onClick={onCompleteSale}>
          Complete Sale
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={cart.length === 0 || submitting} onClick={onSaveDraft}>
            Save Draft
          </Button>
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
