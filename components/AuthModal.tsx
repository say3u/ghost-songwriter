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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-lg font-black text-white">{tab === "signin" ? "Welcome back" : "Join Drifty Studio"}</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Save your songs forever</p>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: "rgba(255,255,255,0.25)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex rounded-2xl overflow-hidden mb-5 p-1 gap-1" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["signin", "signup"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className="flex-1 py-2 text-sm font-bold rounded-xl transition-all"
                style={
                  tab === t
                    ? { background: "#1e1e1e", color: "#fff" }
                    : { color: "rgba(255,255,255,0.35)" }
                }>
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email"
              className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-colors"
              style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(157,92,245,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Password"
              className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-colors"
              style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(157,92,245,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")} />

            {error   && <p className="text-sm text-red-400 rounded-xl px-4 py-2.5" style={{ background: "rgba(239,68,68,0.1)" }}>{error}</p>}
            {success && <p className="text-sm text-green-400 rounded-xl px-4 py-2.5" style={{ background: "rgba(34,197,94,0.1)" }}>{success}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #9D5CF5, #E8437A)" }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {tab === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
