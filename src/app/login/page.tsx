"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Invalid email or password.");
      return;
    }
    router.replace("/inventory");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-9 h-9 rounded-md bg-gray-900 flex items-center justify-center text-white font-semibold">
            P
          </div>
          <div className="text-lg font-semibold tracking-tight text-gray-900">Powerlife Inventory</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h1 className="text-base font-semibold text-gray-900 mb-1">Sign in</h1>
          <p className="text-xs text-gray-500 mb-5">Event POS System &middot; Inventory Module</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-md hover:bg-gray-800 disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-4">
          Accounts are provisioned by your administrator in Supabase Auth.
        </p>
      </div>
    </div>
  );
}
