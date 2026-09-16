"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import { useProductExtras, useProducts } from "@/lib/queries/products";
import { useEvents, usePaymentMethods, useSalesPeople } from "@/lib/queries/master-data";
import { useCancelDraft, useCreateOrder, useDeleteOrders, useOrders, useRefundOrder, useUpdateOrder } from "@/lib/queries/orders";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { isCountableOrder, type CartLine, type OrderWithItems } from "@/lib/types";
import { ProductGrid } from "@/components/pos/product-grid";
import { CheckoutPanel } from "@/components/pos/checkout-panel";
import { OrderDetailModal } from "@/components/pos/order-detail-modal";
import { EditOrderModal } from "@/components/pos/edit-order-modal";
import { DeleteOrderDialog } from "@/components/pos/delete-order-dialog";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { exportOrdersCsv, exportOrdersXlsx, exportOrdersPdf } from "@/lib/export";

type SubTab = "sale" | "history";

export default function PosPage() {
  const [subTab, setSubTab] = useState<SubTab>("sale");
  const user = useCurrentUser();
  const toast = useToast();

  const { data: products = [] } = useProducts();
  const { data: extras } = useProductExtras();
  const { data: events = [] } = useEvents();
  const { data: salesPeople = [] } = useSalesPeople();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: orders = [] } = useOrders();

  const promotions = extras?.promotions ?? [];
  const allocations = extras?.allocations ?? [];

  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrders = useDeleteOrders();
  const refundOrder = useRefundOrder();
  const cancelDraft = useCancelDraft();

  // -------- New Sale state --------
  const [cart, setCart] = useState<CartLine[]>([]);
  const [eventId, setEventId] = useState("");
  const [salesPersonId, setSalesPersonId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);

  function resetSaleForm() {
    setCart([]);
    setEventId("");
    setSalesPersonId("");
    setPaymentMethodId("");
    setCustomerName("");
    setCustomerPhone("");
    setDiscount(0);
    setAmountReceived("");
  }

  function addToCart(product: (typeof products)[number], priceLabel: string, unitPrice: number, isGiveaway: boolean) {
    setCart((c) => {
      const idx = c.findIndex((l) => l.productId === product.id && l.priceLabel === priceLabel && l.isGiveaway === isGiveaway);
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [
        ...c,
        {
          productId: product.id,
          name: product.name,
          brand: product.brand,
          qty: 1,
          unitPrice,
          priceLabel,
          isGiveaway,
          maxAvailable: product.current_stock,
        },
      ];
    });
  }

  async function submitOrder(isDraft: boolean) {
    if (!user) return;
    try {
      const order = await createOrder.mutateAsync({
        eventId: eventId || null,
        eventName: events.find((e) => e.id === eventId)?.name ?? null,
        salesPersonId: salesPersonId || null,
        salesPersonName: salesPeople.find((s) => s.id === salesPersonId)?.name ?? null,
        paymentMethodId: paymentMethodId || null,
        paymentMethodName: paymentMethods.find((p) => p.id === paymentMethodId)?.name ?? null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        discount,
        amountReceived: amountReceived === "" ? null : Number(amountReceived),
        isDraft,
        items: cart,
        userId: user.id,
        userName: user.name,
      });
      setLastOrderNumber(order.order_number);
      toast.push(isDraft ? "Draft saved" : `Sale completed — ${order.order_number}`);
      resetSaleForm();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : "Failed to save order", "error");
    }
  }

  // -------- Order History state --------
  const [historySearch, setHistorySearch] = useState("");
  const [historyEventFilter, setHistoryEventFilter] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [detailOrder, setDetailOrder] = useState<OrderWithItems | null>(null);
  const [editOrder, setEditOrder] = useState<OrderWithItems | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<OrderWithItems[] | null>(null);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (historyEventFilter) list = list.filter((o) => o.event_id === historyEventFilter);
    if (historySearch) {
      const q = historySearch.toLowerCase();
      list = list.filter((o) => `${o.order_number} ${o.customer_name ?? ""}`.toLowerCase().includes(q));
    }
    return list;
  }, [orders, historySearch, historyEventFilter]);

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  // Export whatever is checked, or fall back to the filtered set (respects
  // both the search box and the event dropdown) when nothing is checked.
  const exportTargetOrders = selectedCount > 0 ? orders.filter((o) => selectedIds[o.id]) : filteredOrders;

  return (
    <div>
      <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1 mb-4 w-fit">
        {(["sale", "history"] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-3.5 py-1.5 rounded text-sm font-medium ${
              subTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "sale" ? "New Sale" : "Order History"}
          </button>
        ))}
      </div>

      {subTab === "sale" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div>
            <ProductGrid products={products} promotions={promotions} allocations={allocations} onAdd={addToCart} />
          </div>
          <CheckoutPanel
            cart={cart}
            products={products}
            promotions={promotions}
            onChangeQty={(idx, qty) => setCart((c) => c.map((l, i) => (i === idx ? { ...l, qty } : l)))}
            onChangePrice={(idx, label, price) =>
              setCart((c) => c.map((l, i) => (i === idx ? { ...l, priceLabel: label, unitPrice: price, isGiveaway: false } : l)))
            }
            onToggleGiveaway={(idx) => setCart((c) => c.map((l, i) => (i === idx ? { ...l, isGiveaway: !l.isGiveaway } : l)))}
            onRemoveFromCart={(idx) => setCart((c) => c.filter((_, i) => i !== idx))}
            events={events}
            salesPeople={salesPeople}
            paymentMethods={paymentMethods}
            eventId={eventId}
            setEventId={setEventId}
            salesPersonId={salesPersonId}
            setSalesPersonId={setSalesPersonId}
            paymentMethodId={paymentMethodId}
            setPaymentMethodId={setPaymentMethodId}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            discount={discount}
            setDiscount={setDiscount}
            amountReceived={amountReceived}
            setAmountReceived={setAmountReceived}
            onCompleteSale={() => submitOrder(false)}
            onSaveDraft={() => submitOrder(true)}
            onCancel={resetSaleForm}
            submitting={createOrder.isPending}
          />
        </div>
      )}

      {subTab === "history" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export {selectedCount > 0 ? `(${selectedCount} selected)` : ""}
              </button>
              {exportMenuOpen && (
                <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1 text-sm">
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => { exportOrdersCsv(exportTargetOrders); setExportMenuOpen(false); }}
                  >
                    CSV
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => { exportOrdersXlsx(exportTargetOrders); setExportMenuOpen(false); }}
                  >
                    Excel
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50"
                    onClick={() => { exportOrdersPdf(exportTargetOrders); setExportMenuOpen(false); }}
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>
            <select
              value={historyEventFilter}
              onChange={(e) => setHistoryEventFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-md px-2.5 py-2"
            >
              <option value="">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search order number or customer…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
            {selectedCount > 0 && (
              <button
                onClick={() => setDeleteTargets(orders.filter((o) => selectedIds[o.id]))}
                className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Delete Selected ({selectedCount})
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds[o.id])}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const next: Record<string, boolean> = {};
                          filteredOrders.forEach((o) => (next[o.id] = true));
                          setSelectedIds(next);
                        } else setSelectedIds({});
                      }}
                    />
                  </th>
                  <th className="text-left px-3 py-2">Order #</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Event</th>
                  <th className="text-left px-3 py-2">Total</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 200).map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!selectedIds[o.id]}
                        onChange={(e) => setSelectedIds((s) => ({ ...s, [o.id]: e.target.checked }))}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 cursor-pointer" onClick={() => setDetailOrder(o)}>
                      {o.order_number}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{formatDateTime(o.created_at)}</td>
                    <td className="px-3 py-2 text-gray-500">{o.event_name ?? "-"}</td>
                    <td className="px-3 py-2">{formatCurrency(o.total)}</td>
                    <td className="px-3 py-2">
                      <Badge
                        tone={
                          o.status === "completed" ? "green" : o.status === "draft" ? "amber" : o.status === "refunded" ? "blue" : "red"
                        }
                      >
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      <button className="text-xs text-gray-600 hover:underline" onClick={() => setEditOrder(o)}>
                        Edit
                      </button>
                      <button className="text-xs text-red-600 hover:underline" onClick={() => setDeleteTargets([o])}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OrderDetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onEdit={() => {
          setEditOrder(detailOrder);
          setDetailOrder(null);
        }}
        onDelete={() => {
          if (detailOrder) setDeleteTargets([detailOrder]);
          setDetailOrder(null);
        }}
        onRefund={() => {
          if (detailOrder) refundOrder.mutate(detailOrder.id, { onSuccess: () => toast.push("Order refunded") });
          setDetailOrder(null);
        }}
        onCancelDraft={() => {
          if (detailOrder) cancelDraft.mutate(detailOrder.id, { onSuccess: () => toast.push("Draft cancelled") });
          setDetailOrder(null);
        }}
      />

      <EditOrderModal
        order={editOrder}
        onClose={() => setEditOrder(null)}
        events={events}
        salesPeople={salesPeople}
        paymentMethods={paymentMethods}
        onSave={(patch, items) => {
          if (!editOrder || !user) return;
          updateOrder.mutate(
            { order: editOrder, patch, newItems: items, userName: user.name },
            {
              onSuccess: () => {
                toast.push("Order updated");
                setEditOrder(null);
              },
              onError: (e) => toast.push(e instanceof Error ? e.message : "Failed to update order", "error"),
            }
          );
        }}
      />

      <DeleteOrderDialog
        orders={deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={(restock) => {
          if (!deleteTargets || !user) return;
          deleteOrders.mutate(
            { orders: deleteTargets, restock, userName: user.name },
            {
              onSuccess: () => {
                toast.push("Order(s) deleted");
                setSelectedIds({});
                setDeleteTargets(null);
              },
            }
          );
        }}
      />
    </div>
  );
}
