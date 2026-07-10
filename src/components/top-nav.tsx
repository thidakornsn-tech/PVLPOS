"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Box, ShoppingCart, LayoutDashboard, Settings, LogOut } from "lucide-react";

const TABS = [
  { href: "/inventory", label: "Inventory", icon: Box },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopNav({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gray-900 flex items-center justify-center text-white text-xs font-semibold">P</div>
            <span className="text-sm font-semibold text-gray-900">Powerlife</span>
          </div>
          <div className="flex items-center gap-1">
            {TABS.map((t) => {
              const active = pathname?.startsWith(t.href);
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
                    active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-xs font-medium text-gray-900">{userName}</div>
            <div className="text-[11px] text-gray-400">{userRole}</div>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-gray-700" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
