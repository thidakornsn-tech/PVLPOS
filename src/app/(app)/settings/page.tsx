"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useOrders } from "@/lib/queries/orders";
import {
  eventsCrud,
  paymentMethodsCrud,
  salesPeopleCrud,
  useEvents,
  usePaymentMethods,
  useSalesPeople,
} from "@/lib/queries/master-data";
import { formatDate } from "@/lib/utils";
import type { EventRow, PaymentMethod, SalesPerson } from "@/lib/types";
import { EventFormModal } from "@/components/settings/event-form-modal";
import { SimpleNameFormModal } from "@/components/settings/simple-name-form-modal";

type SubTab = "events" | "salespeople" | "payments";

export default function SettingsPage() {
  const [subTab, setSubTab] = useState<SubTab>("events");
  const toast = useToast();

  const { data: events = [] } = useEvents();
  const { data: salesPeople = [] } = useSalesPeople();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: orders = [] } = useOrders();

  const createEvent = eventsCrud.useCreate();
  const updateEvent = eventsCrud.useUpdate();
  const deleteEvent = eventsCrud.useDelete();
  const createSP = salesPeopleCrud.useCreate();
  const updateSP = salesPeopleCrud.useUpdate();
  const deleteSP = salesPeopleCrud.useDelete();
  const createPM = paymentMethodsCrud.useCreate();
  const updatePM = paymentMethodsCrud.useUpdate();
  const deletePM = paymentMethodsCrud.useDelete();

  const [editEvent, setEditEvent] = useState<EventRow | null | undefined>(undefined);
  const [editSP, setEditSP] = useState<SalesPerson | null | undefined>(undefined);
  const [editPM, setEditPM] = useState<PaymentMethod | null | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "event" | "sp" | "pm"; id: string; name: string; usage: number } | null>(null);

  function usageCount(type: "event" | "sp" | "pm", id: string) {
    if (type === "event") return orders.filter((o) => o.event_id === id).length;
    if (type === "sp") return orders.filter((o) => o.sales_person_id === id).length;
    return orders.filter((o) => o.payment_method_id === id).length;
  }

  function confirmDeleteAction() {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    const onDone = () => {
      toast.push("Deleted");
      setConfirmDelete(null);
    };
    if (type === "event") deleteEvent.mutate(id, { onSuccess: onDone });
    else if (type === "sp") deleteSP.mutate(id, { onSuccess: onDone });
    else deletePM.mutate(id, { onSuccess: onDone });
  }

  const SUB_TABS: [SubTab, string][] = [
    ["events", "Events"],
    ["salespeople", "Sales People"],
    ["payments", "Payment Methods"],
  ];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1 mb-4 w-fit">
        {SUB_TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSubTab(k)}
            className={`px-3.5 py-1.5 rounded text-sm font-medium ${
              subTab === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "events" && (
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Events</h3>
            <Button size="sm" onClick={() => setEditEvent(null)}>
              <Plus className="w-3.5 h-3.5" /> Add Event
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-gray-400 text-left border-b border-gray-100 text-xs">
              <tr>
                <th className="py-1.5">Name</th>
                <th className="py-1.5">Location</th>
                <th className="py-1.5">Dates</th>
                <th className="py-1.5">Orders</th>
                <th className="py-1.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">{ev.name}</td>
                  <td className="py-2 text-gray-500">{ev.location || "-"}</td>
                  <td className="py-2 text-gray-500">
                    {ev.starts_at ? formatDate(ev.starts_at) : "-"}
                    {ev.ends_at ? ` → ${formatDate(ev.ends_at)}` : ""}
                  </td>
                  <td className="py-2 text-gray-500">{usageCount("event", ev.id)}</td>
                  <td className="py-2 text-right space-x-2">
                    <button className="text-xs text-gray-600 hover:underline" onClick={() => setEditEvent(ev)}>
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setConfirmDelete({ type: "event", id: ev.id, name: ev.name, usage: usageCount("event", ev.id) })}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "salespeople" && (
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Sales People</h3>
            <Button size="sm" onClick={() => setEditSP(null)}>
              <Plus className="w-3.5 h-3.5" /> Add Sales Person
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-gray-400 text-left border-b border-gray-100 text-xs">
              <tr>
                <th className="py-1.5">Name</th>
                <th className="py-1.5">Orders</th>
                <th className="py-1.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesPeople.map((sp) => (
                <tr key={sp.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">
                    {sp.name} {!sp.active && <Badge tone="gray">Inactive</Badge>}
                  </td>
                  <td className="py-2 text-gray-500">{usageCount("sp", sp.id)}</td>
                  <td className="py-2 text-right space-x-2">
                    <button className="text-xs text-gray-600 hover:underline" onClick={() => setEditSP(sp)}>
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setConfirmDelete({ type: "sp", id: sp.id, name: sp.name, usage: usageCount("sp", sp.id) })}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {salesPeople.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400">
                    No sales people yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "payments" && (
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Payment Methods</h3>
            <Button size="sm" onClick={() => setEditPM(null)}>
              <Plus className="w-3.5 h-3.5" /> Add Method
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="text-gray-400 text-left border-b border-gray-100 text-xs">
              <tr>
                <th className="py-1.5">Name</th>
                <th className="py-1.5">Orders</th>
                <th className="py-1.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentMethods.map((pm) => (
                <tr key={pm.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">
                    {pm.name} {!pm.active && <Badge tone="gray">Inactive</Badge>}
                  </td>
                  <td className="py-2 text-gray-500">{usageCount("pm", pm.id)}</td>
                  <td className="py-2 text-right space-x-2">
                    <button className="text-xs text-gray-600 hover:underline" onClick={() => setEditPM(pm)}>
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setConfirmDelete({ type: "pm", id: pm.id, name: pm.name, usage: usageCount("pm", pm.id) })}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {paymentMethods.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400">
                    No payment methods yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <EventFormModal
        open={editEvent !== undefined}
        onClose={() => setEditEvent(undefined)}
        event={editEvent ?? null}
        onSave={(patch) => {
          if (editEvent) {
            updateEvent.mutate({ id: editEvent.id, patch }, { onSuccess: () => { toast.push("Event updated"); setEditEvent(undefined); } });
          } else {
            createEvent.mutate(patch, { onSuccess: () => { toast.push("Event created"); setEditEvent(undefined); } });
          }
        }}
      />

      <SimpleNameFormModal
        open={editSP !== undefined}
        onClose={() => setEditSP(undefined)}
        title={editSP ? "Edit Sales Person" : "Add Sales Person"}
        initialName={editSP?.name ?? null}
        onSave={(name) => {
          if (editSP) {
            updateSP.mutate({ id: editSP.id, patch: { name } }, { onSuccess: () => { toast.push("Sales person updated"); setEditSP(undefined); } });
          } else {
            createSP.mutate({ name, active: true }, { onSuccess: () => { toast.push("Sales person added"); setEditSP(undefined); } });
          }
        }}
      />

      <SimpleNameFormModal
        open={editPM !== undefined}
        onClose={() => setEditPM(undefined)}
        title={editPM ? "Edit Payment Method" : "Add Payment Method"}
        initialName={editPM?.name ?? null}
        onSave={(name) => {
          if (editPM) {
            updatePM.mutate({ id: editPM.id, patch: { name } }, { onSuccess: () => { toast.push("Payment method updated"); setEditPM(undefined); } });
          } else {
            createPM.mutate({ name, active: true }, { onSuccess: () => { toast.push("Payment method added"); setEditPM(undefined); } });
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAction}
        title={`Delete ${confirmDelete?.name ?? ""}`}
        message={`This will permanently remove "${confirmDelete?.name}" from the list.${
          confirmDelete && confirmDelete.usage > 0
            ? ` It is referenced by ${confirmDelete.usage} existing order(s) — those orders keep their historical record and are not affected.`
            : ""
        }`}
      />
    </div>
  );
}
