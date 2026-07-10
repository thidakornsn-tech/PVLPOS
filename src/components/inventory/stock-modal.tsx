"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { Product, StockHistoryEntry } from "@/lib/types";

export function StockModal({
  open,
  onClose,
  product,
  history,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  history: StockHistoryEntry[];
  onSubmit: (action: "Increase" | "Decrease" | "Adjust", qty: number, remark: string) => void;
}) {
  const [action, setAction] = useState<"Increase" | "Decrease" | "Adjust">("Increase");
  const [qty, setQty] = useState(1);
  const [remark, setRemark] = useState("");

  if (!product) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Adjust Stock — ${product.name}`} width="max-w-xl">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Field label="Action">
          <Select value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
            <option value="Increase">Increase</option>
            <option value="Decrease">Decrease</option>
            <option value="Adjust">Set exact stock</option>
          </Select>
        </Field>
        <Field label={action === "Adjust" ? "New stock level" : "Quantity"}>
          <Input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </Field>
        <Field label="Remark">
          <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Reason / note" />
        </Field>
      </div>
      <Button
        size="sm"
        onClick={() => {
          onSubmit(action, qty, remark);
          setQty(1);
          setRemark("");
        }}
      >
        Apply
      </Button>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2">History</p>
        <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-100">
          {history.length === 0 && <p className="text-xs text-gray-400 p-3">No stock history yet.</p>}
          {history.map((h) => (
            <div key={h.id} className="px-3 py-2 text-xs flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-800">{h.action}</span>{" "}
                <span className="text-gray-500">
                  {h.action === "Decrease" || h.action === "Sale" ? "-" : "+"}
                  {h.qty}
                </span>
                {h.remark && <span className="text-gray-400"> · {h.remark}</span>}
              </div>
              <div className="text-gray-400 text-right">
                <div>{formatDateTime(h.created_at)}</div>
                <div>{h.user_name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
