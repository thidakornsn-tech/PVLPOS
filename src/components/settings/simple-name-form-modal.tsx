"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function SimpleNameFormModal({
  open,
  onClose,
  title,
  initialName,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initialName: string | null;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName(initialName ?? "");
  }, [open, initialName]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim()} onClick={() => onSave(name.trim())}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Name *">
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
    </Modal>
  );
}
