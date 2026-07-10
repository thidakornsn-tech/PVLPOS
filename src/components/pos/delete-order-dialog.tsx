"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { isCountableOrder } from "@/lib/types";
import type { OrderWithItems } from "@/lib/types";

export function DeleteOrderDialog({
  orders,
  onClose,
  onConfirm,
}: {
  orders: OrderWithItems[] | null;
  onClose: () => void;
  onConfirm: (restock: boolean) => void;
}) {
  const [restock, setRestock] = useState(true);
  if (!orders || orders.length === 0) return null;

  const count = orders.length;
  const anyCountable = orders.some(isCountableOrder);

  return (
    <Modal
      open={!!orders}
      onClose={onClose}
      title={count > 1 ? `Delete ${count} Orders` : `Delete Order ${orders[0].order_number}`}
      width="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onConfirm(restock)}>
            Delete {count > 1 ? `${count} Orders` : "Order"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-3">
        This permanently deletes {count > 1 ? `these ${count} orders` : "this order"}. This cannot be undone.
      </p>
      {anyCountable && (
        <label className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="mt-0.5" />
          <span>
            Return sold items to inventory stock (restock). Uncheck if the stock was already adjusted separately.
          </span>
        </label>
      )}
    </Modal>
  );
}
