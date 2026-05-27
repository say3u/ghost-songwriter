"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { AuthState } from "@/hooks/useAuth";

type Props = { onClose: () => void; auth: AuthState };

export default function AuthModal({ onClose, auth }: Props) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    const err = tab === "signin" ? await auth.signIn(email, password) : await auth.signUp(email, password);
    setLoading(false);
    if (err) { setError(err.message); }
    else if (tab === "signup") { setSuccess("Account created! Check your email, then sign in."); setTab("signin"); }
    else { onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-black tracking-wide">
              {tab === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Save and revisit your songs</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 mb-6 p-1 gap-1">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  tab === t ? "bg-green-500 text-black" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@example.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>

            {error   && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-2.5">{error}</p>}
            {success && <p className="text-sm text-green-400 bg-green-950/40 border border-green-900/50 rounded-xl px-4 py-2.5">{success}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 font-bold text-sm text-black transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {tab === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
