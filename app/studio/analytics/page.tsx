"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ModeBarChart, DailyLineChart } from "@/components/AnalyticsCharts";

type Song = { generation_mode: string; created_at: string };

const MODE_LABELS: Record<string, string> = {
  "lyrics-from-idea": "Idea → Lyrics",
  "lyrics-from-beat": "Beat → Lyrics",
  "expand-lyrics":    "Expand Lyrics",
  "lyrics-to-beat":   "Lyrics → Beat",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-[10px] font-display font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
      <p className="text-3xl font-display font-bold text-white">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const auth = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user) return;
    supabase
      .from("songs")
      .select("generation_mode, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setSongs(data ?? []);
        setLoading(false);
      });
  }, [auth.user]);

  const thisMonth = songs.filter((s) => {
    const d = new Date(s.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const topMode = Object.entries(
    songs.reduce<Record<string, number>>((acc, s) => {
      acc[s.generation_mode] = (acc[s.generation_mode] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  if (!auth.user && !auth.loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="text-center">
          <p className="text-white/40 text-sm mb-4">Sign in to see your analytics.</p>
          <Link href="/studio" className="text-sm" style={{ color: "#9D5CF5" }}>← Back to studio</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "#0a0a0a", color: "#fff" }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-6 h-14" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/studio" className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: "rgba(255,255,255,0.35)" }}>
          <ArrowLeft size={13} /> Studio
        </Link>
        <span className="font-display font-bold text-white text-sm">Analytics</span>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-sm mb-4">No songs generated yet.</p>
            <Link href="/studio" className="text-sm font-medium" style={{ color: "#9D5CF5" }}>Start writing →</Link>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Total Songs" value={songs.length} />
              <StatCard label="This Month" value={thisMonth} />
              <StatCard label="Favorite Mode" value={topMode ? MODE_LABELS[topMode[0]]?.split(" ")[0] ?? "—" : "—"} sub={topMode ? `${topMode[1]} songs` : undefined} />
            </div>

            {/* Mode breakdown */}
            <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="font-display text-xs font-bold uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>Songs by Mode</p>
              <ModeBarChart songs={songs} />
            </div>

            {/* Daily chart */}
            <div className="rounded-2xl p-6" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="font-display text-xs font-bold uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>Last 30 Days</p>
              <DailyLineChart songs={songs} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
