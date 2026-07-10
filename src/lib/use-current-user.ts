"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useCurrentUser() {
  const [user, setUser] = useState<{ id: string; name: string; role: string; email: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase.from("profiles").select("name, role").eq("id", authUser.id).single();
      setUser({
        id: authUser.id,
        name: profile?.name ?? authUser.email ?? "User",
        role: profile?.role ?? "Sales Staff",
        email: authUser.email ?? "",
      });
    })();
  }, []);

  return user;
}
