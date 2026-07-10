"use client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { isCountableOrder } from "@/lib/types";
import type { OrderWithItems } from "@/lib/types";

export function OrderDetailModal({
  order,
  onClose,
  onEdit,
  onDelete,
  onRefund,
  onCancelDraft,
}: {
  order: OrderWithItems | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefund: () => void;
  onCancelDraft: () => void;
}) {
  if (!order) return null;
  const tone = order.status === "completed" ? "green" : order.status === "draft" ? "amber" : order.status === "refunded" ? "blue" : "red";

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={`Order ${order.order_number}`}
      width="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {order.status === "draft" && (
            <Button variant="outline" onClick={onCancelDraft}>
              Cancel Draft
            </Button>
          )}
          {order.status === "completed" && (
            <Button variant="outline" onClick={onRefund}>
              Refund
            </Button>
          )}
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between mb-3">
        <Badge tone={tone as never}>{order.status}</Badge>
        <span className="text-xs text-gray-400">{formatDateTime(order.created_at)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
        <div>Event: {order.event_name ?? "-"}</div>
        <div>Sales Person: {order.sales_person_name ?? "-"}</div>
        <div>Payment: {order.payment_method_name ?? "-"}</div>
        <div>Customer: {order.customer_name ?? "-"}</div>
      </div>
      <div className="border border-gray-100 rounded-md divide-y divide-gray-100 mb-3">
        {order.order_items.map((it) => (
          <div key={it.id} className="px-3 py-2 flex items-center justify-between text-sm">
            <div>
              <span className="font-medium text-gray-800">{it.product_name}</span>{" "}
              <span className="text-gray-400 text-xs">x{it.qty}</span>
              {it.is_giveaway && <span className="text-[10px] text-green-600 ml-1">Giveaway</span>}
            </div>
            <span>{it.is_giveaway ? "Free" : formatCurrency(it.line_total)}</span>
          </div>
        ))}
      </div>
      <div className="text-sm space-y-1">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Discount</span>
          <span>-{formatCurrency(order.discount)}</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>
      {!isCountableOrder(order) && (
        <p className="text-[11px] text-gray-400 mt-3">
          {order.is_draft ? "This is a draft — no stock was deducted." : "This order does not affect stock."}
        </p>
      )}
    </Modal>
  );
}
