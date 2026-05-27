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
    else if (tab === "signup") { setSuccess("Check your email to confirm, then sign in."); setTab("signin"); }
    else { onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">{tab === "signin" ? "Welcome back 👋" : "Join Drifty Studio"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Save your songs forever</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6">
          <div className="flex rounded-2xl overflow-hidden bg-gray-100 mb-5 p-1 gap-1">
            {(["signin", "signup"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Password"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors" />

            {error   && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}
            {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-4 py-2.5">{success}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-bold text-sm text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {tab === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
