"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { EventRow } from "@/lib/types";

export function EventFormModal({
  open,
  onClose,
  event,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  event: EventRow | null;
  onSave: (patch: Partial<EventRow>) => void;
}) {
  const [form, setForm] = useState<Partial<EventRow>>({});
  useEffect(() => {
    if (open) setForm(event ?? { name: "", location: "", starts_at: "", ends_at: "" });
  }, [open, event]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? "Edit Event" : "Add Event"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!form.name} onClick={() => onSave(form)}>
            {event ? "Save Changes" : "Add Event"}
          </Button>
        </>
      }
    >
      <Field label="Event Name *">
        <Input autoFocus value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </Field>
      <Field label="Location">
        <Input value={form.location ?? ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date">
          <Input type="date" value={form.starts_at ?? ""} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
        </Field>
        <Field label="End Date">
          <Input type="date" value={form.ends_at ?? ""} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
}
