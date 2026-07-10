"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { orderDatePrefix, pad } from "@/lib/utils";
import { isCountableOrder, type CartLine, type Order, type OrderWithItems } from "@/lib/types";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as OrderWithItems[];
    },
  });
}

async function nextOrderNumber(): Promise<string> {
  const supabase = createClient();
  const prefix = orderDatePrefix();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .like("order_number", `${prefix}-%`);
  if (error) throw error;
  return `${prefix}-${pad((count ?? 0) + 1)}`;
}

interface CreateOrderInput {
  eventId: string | null;
  eventName: string | null;
  salesPersonId: string | null;
  salesPersonName: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  customerName: string | null;
  customerPhone: string | null;
  discount: number;
  amountReceived: number | null;
  isDraft: boolean;
  items: CartLine[];
  userId: string;
  userName: string;
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const supabase = createClient();
      const subtotal = input.items.reduce((s, it) => s + (it.isGiveaway ? 0 : it.unitPrice * it.qty), 0);
      const total = Math.max(0, subtotal - input.discount);
      const change = input.amountReceived != null ? Math.max(0, input.amountReceived - total) : null;

      let orderNumber = await nextOrderNumber();

      let order: Order | null = null;
      for (let attempt = 0; attempt < 3 && !order; attempt++) {
        const { data, error } = await supabase
          .from("orders")
          .insert({
            order_number: orderNumber,
            event_id: input.eventId,
            event_name: input.eventName,
            sales_person_id: input.salesPersonId,
            sales_person_name: input.salesPersonName,
            payment_method_id: input.paymentMethodId,
            payment_method_name: input.paymentMethodName,
            customer_name: input.customerName,
            customer_phone: input.customerPhone,
            subtotal,
            discount: input.discount,
            total,
            amount_received: input.amountReceived,
            change_amount: change,
            status: input.isDraft ? "draft" : "completed",
            is_draft: input.isDraft,
            created_by: input.userId,
          })
          .select()
          .single();
        if (error && (error as { code?: string }).code === "23505") {
          orderNumber = await nextOrderNumber();
          continue;
        }
        if (error) throw error;
        order = data as Order;
      }
      if (!order) throw new Error("Could not allocate an order number, please retry.");

      const itemRows = input.items.map((it) => ({
        order_id: order!.id,
        product_id: it.productId || null,
        product_name: it.name,
        brand: it.brand,
        qty: it.qty,
        unit_price: it.isGiveaway ? 0 : it.unitPrice,
        price_label: it.priceLabel,
        is_giveaway: it.isGiveaway,
        line_total: it.isGiveaway ? 0 : it.unitPrice * it.qty,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
      if (itemsErr) throw itemsErr;

      if (!input.isDraft) {
        for (const it of input.items) {
          if (!it.productId) continue;
          const { data: prod } = await supabase.from("products").select("current_stock").eq("id", it.productId).single();
          if (!prod) continue;
          const newStock = Math.max(0, prod.current_stock - it.qty);
          await supabase.from("products").update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq("id", it.productId);
          await supabase.from("product_stock_history").insert({
            product_id: it.productId,
            action: "Sale",
            qty: it.qty,
            remark: `Order ${order.order_number}`,
            resulting_stock: newStock,
            user_name: input.userName,
          });
        }
      }

      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product-extras"] });
    },
  });
}

interface EditOrderInput {
  order: OrderWithItems;
  patch: {
    eventId: string | null;
    eventName: string | null;
    salesPersonId: string | null;
    salesPersonName: string | null;
    paymentMethodId: string | null;
    paymentMethodName: string | null;
    customerName: string | null;
    customerPhone: string | null;
    discount: number;
  };
  newItems: CartLine[];
  userName: string;
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ order, patch, newItems, userName }: EditOrderInput) => {
      const supabase = createClient();
      const subtotal = newItems.reduce((s, it) => s + (it.isGiveaway ? 0 : it.unitPrice * it.qty), 0);
      const total = Math.max(0, subtotal - patch.discount);

      const { error: updErr } = await supabase
        .from("orders")
        .update({
          event_id: patch.eventId,
          event_name: patch.eventName,
          sales_person_id: patch.salesPersonId,
          sales_person_name: patch.salesPersonName,
          payment_method_id: patch.paymentMethodId,
          payment_method_name: patch.paymentMethodName,
          customer_name: patch.customerName,
          customer_phone: patch.customerPhone,
          discount: patch.discount,
          subtotal,
          total,
        })
        .eq("id", order.id);
      if (updErr) throw updErr;

      await supabase.from("order_items").delete().eq("order_id", order.id);
      const itemRows = newItems.map((it) => ({
        order_id: order.id,
        product_id: it.productId || null,
        product_name: it.name,
        brand: it.brand,
        qty: it.qty,
        unit_price: it.isGiveaway ? 0 : it.unitPrice,
        price_label: it.priceLabel,
        is_giveaway: it.isGiveaway,
        line_total: it.isGiveaway ? 0 : it.unitPrice * it.qty,
      }));
      if (itemRows.length) {
        const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
        if (itemsErr) throw itemsErr;
      }

      // Reconcile stock: combine deltas across old vs. new items into one
      // adjustment per product, so an edit never double-counts a partial
      // reversal — mirrors the original demo's reconcileOrderItemStock.
      if (isCountableOrder(order)) {
        const delta = new Map<string, number>();
        order.order_items.forEach((it) => {
          if (!it.product_id) return;
          delta.set(it.product_id, (delta.get(it.product_id) ?? 0) - it.qty);
        });
        newItems.forEach((it) => {
          if (!it.productId) return;
          delta.set(it.productId, (delta.get(it.productId) ?? 0) + it.qty);
        });

        for (const [productId, d] of delta.entries()) {
          if (d === 0) continue;
          const { data: prod } = await supabase.from("products").select("current_stock").eq("id", productId).single();
          if (!prod) continue;
          const newStock = Math.max(0, prod.current_stock - d);
          await supabase.from("products").update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq("id", productId);
          await supabase.from("product_stock_history").insert({
            product_id: productId,
            action: d > 0 ? "Sale" : "Refund",
            qty: Math.abs(d),
            remark: `Order ${order.order_number} edited`,
            resulting_stock: newStock,
            user_name: userName,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product-extras"] });
    },
  });
}

export function useDeleteOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orders, restock, userName }: { orders: OrderWithItems[]; restock: boolean; userName: string }) => {
      const supabase = createClient();

      if (restock) {
        for (const order of orders) {
          if (!isCountableOrder(order)) continue;
          for (const it of order.order_items) {
            if (!it.product_id) continue;
            const { data: prod } = await supabase.from("products").select("current_stock").eq("id", it.product_id).single();
            if (!prod) continue;
            const newStock = prod.current_stock + it.qty;
            await supabase.from("products").update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq("id", it.product_id);
            await supabase.from("product_stock_history").insert({
              product_id: it.product_id,
              action: "Refund",
              qty: it.qty,
              remark: `Order ${order.order_number} deleted (restocked)`,
              resulting_stock: newStock,
              user_name: userName,
            });
          }
        }
      }

      const { error } = await supabase.from("orders").delete().in("id", orders.map((o) => o.id));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product-extras"] });
    },
  });
}

export function useRefundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("orders").update({ status: "refunded" }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useCancelDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}
