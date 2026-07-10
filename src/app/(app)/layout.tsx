import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/top-nav";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("name, role").eq("id", user.id).single();

  return (
    <ToastProvider>
      <TopNav userName={profile?.name ?? user.email ?? "User"} userRole={profile?.role ?? "Sales Staff"} />
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-5">{children}</main>
    </ToastProvider>
  );
}
