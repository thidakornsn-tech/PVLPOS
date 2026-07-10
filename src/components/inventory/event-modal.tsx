"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { EventAllocation, EventRow, Product } from "@/lib/types";

export function EventAllocationModal({
  open,
  onClose,
  product,
  events,
  allocations,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  events: EventRow[];
  allocations: EventAllocation[];
  onSave: (eventId: string, allocated: number, returned: number) => void;
}) {
  const [eventId, setEventId] = useState("");
  const [allocated, setAllocated] = useState(0);
  const [returned, setReturned] = useState(0);

  if (!product) return null;
  const productAllocs = allocations.filter((a) => a.product_id === product.id);

  return (
    <Modal open={open} onClose={onClose} title={`Event Allocation — ${product.name}`} width="max-w-xl">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Field label="Event">
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Select event…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Allocated">
          <Input type="number" min={0} value={allocated} onChange={(e) => setAllocated(Number(e.target.value))} />
        </Field>
        <Field label="Returned">
          <Input type="number" min={0} value={returned} onChange={(e) => setReturned(Number(e.target.value))} />
        </Field>
      </div>
      <Button
        size="sm"
        disabled={!eventId}
        onClick={() => {
          onSave(eventId, allocated, returned);
          setEventId("");
          setAllocated(0);
          setReturned(0);
        }}
      >
        Save Allocation
      </Button>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2">Per-event breakdown</p>
        <div className="border border-gray-100 rounded-md divide-y divide-gray-100">
          {productAllocs.length === 0 && <p className="text-xs text-gray-400 p-3">No allocations yet.</p>}
          {productAllocs.map((a) => {
            const ev = events.find((e) => e.id === a.event_id);
            return (
              <div key={a.id} className="px-3 py-2 text-xs flex items-center justify-between">
                <span className="font-medium text-gray-800">{ev?.name ?? "Unknown event"}</span>
                <span className="text-gray-500">
                  Allocated {a.allocated} · Returned {a.returned} · Remaining {Math.max(0, a.allocated - a.returned)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
