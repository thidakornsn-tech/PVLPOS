"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, PaymentMethod, SalesPerson } from "@/lib/types";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("events").select("*").order("created_at");
      if (error) throw error;
      return data as EventRow[];
    },
  });
}

export function useSalesPeople() {
  return useQuery({
    queryKey: ["sales_people"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("sales_people").select("*").order("created_at");
      if (error) throw error;
      return data as SalesPerson[];
    },
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment_methods"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("payment_methods").select("*").order("created_at");
      if (error) throw error;
      return data as PaymentMethod[];
    },
  });
}

function makeCrud<T extends { id?: string }>(table: string, queryKey: string) {
  return {
    useCreate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (input: Partial<T>) => {
          const supabase = createClient();
          const { error } = await supabase.from(table).insert(input as never);
          if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
      });
    },
    useUpdate() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async ({ id, patch }: { id: string; patch: Partial<T> }) => {
          const supabase = createClient();
          const { error } = await supabase.from(table).update(patch as never).eq("id", id);
          if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
      });
    },
    useDelete() {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (id: string) => {
          const supabase = createClient();
          const { error } = await supabase.from(table).delete().eq("id", id);
          if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
      });
    },
  };
}

export const eventsCrud = makeCrud<EventRow>("events", "events");
export const salesPeopleCrud = makeCrud<SalesPerson>("sales_people", "sales_people");
export const paymentMethodsCrud = makeCrud<PaymentMethod>("payment_methods", "payment_methods");
