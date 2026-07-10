"use client";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn("relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col", width)}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  danger = true,
  confirmLabel = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
}) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-sm"
      footer={
        <>
          <button onClick={onClose} className="text-sm px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "text-sm px-3 py-2 rounded-md text-white",
              danger ? "bg-red-600 hover:bg-red-700" : "bg-gray-900 hover:bg-gray-800"
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}
