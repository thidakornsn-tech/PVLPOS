"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { EventAllocation, Product, Promotion, StockHistoryEntry } from "@/lib/types";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProductExtras() {
  // stock history, promotions, and event allocations for ALL products in one
  // shot — simplest correct approach at demo/mid scale; swap for per-product
  // lazy loads if the catalog grows past a few thousand SKUs.
  return useQuery({
    queryKey: ["product-extras"],
    queryFn: async () => {
      const supabase = createClient();
      const [hist, promos, allocs] = await Promise.all([
        supabase.from("product_stock_history").select("*").order("created_at", { ascending: false }),
        supabase.from("promotions").select("*").order("created_at"),
        supabase.from("product_event_allocations").select("*"),
      ]);
      if (hist.error) throw hist.error;
      if (promos.error) throw promos.error;
      if (allocs.error) throw allocs.error;
      return {
        history: hist.data as StockHistoryEntry[],
        promotions: promos.data as Promotion[],
        allocations: allocs.data as EventAllocation[],
      };
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Product>) => {
      const supabase = createClient();
      const { data, error } = await supabase.from("products").insert(input).select().single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Product> }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const supabase = createClient();
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useBulkInsertProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Partial<Product>[]) => {
      const supabase = createClient();
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from("products").insert(chunk);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      product,
      action,
      qty,
      remark,
      userName,
    }: {
      product: Product;
      action: "Increase" | "Decrease" | "Adjust";
      qty: number;
      remark: string;
      userName: string;
    }) => {
      const supabase = createClient();
      let newStock = product.current_stock;
      if (action === "Increase") newStock += qty;
      else if (action === "Decrease") newStock = Math.max(0, newStock - qty);
      else newStock = Math.max(0, qty);

      const { error: updErr } = await supabase
        .from("products")
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", product.id);
      if (updErr) throw updErr;

      const { error: histErr } = await supabase.from("product_stock_history").insert({
        product_id: product.id,
        action,
        qty: action === "Adjust" ? Math.abs(newStock - product.current_stock) : qty,
        remark,
        resulting_stock: newStock,
        user_name: userName,
      });
      if (histErr) throw histErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product-extras"] });
    },
  });
}

export function useSavePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Promotion> & { product_id: string }) => {
      const supabase = createClient();
      if (input.id) {
        const { error } = await supabase.from("promotions").update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promotions").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-extras"] }),
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-extras"] }),
  });
}

export function useSetActivePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, promotionId }: { productId: string; promotionId: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase.from("products").update({ active_promotion_id: promotionId }).eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useSaveAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, eventId, allocated, returned }: { productId: string; eventId: string; allocated: number; returned: number }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("product_event_allocations")
        .upsert({ product_id: productId, event_id: eventId, allocated, returned }, { onConflict: "product_id,event_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-extras"] }),
  });
}

export function activePromotion(product: Product, promotions: Promotion[]) {
  if (!product.active_promotion_id) return null;
  return promotions.find((p) => p.id === product.active_promotion_id && p.enabled) ?? null;
}

export function allocatedEventStock(productId: string, allocations: EventAllocation[]) {
  return allocations
    .filter((a) => a.product_id === productId)
    .reduce((sum, a) => sum + Math.max(0, a.allocated - a.returned), 0);
}

export function availableStock(product: Product, allocations: EventAllocation[]) {
  return Math.max(0, product.current_stock - allocatedEventStock(product.id, allocations));
}
