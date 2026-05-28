import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { GeneratedSong } from "@/types";

// Public Supabase client — reads shared songs via RLS policy
function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const MODE_COLORS: Record<string, string> = {
  "lyrics-from-idea": "#FF6D3B",
  "lyrics-from-beat": "#E8437A",
  "expand-lyrics":    "#9D5CF5",
  "lyrics-to-beat":   "#3D8EF0",
};

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: song } = await getPublicClient()
    .from("songs")
    .select("*")
    .eq("share_id", id)
    .single();

  if (!song) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="text-center">
          <p className="text-white/40 text-sm mb-4">This link is invalid or the song isn't shared.</p>
          <Link href="/" className="text-sm font-medium" style={{ color: "#9D5CF5" }}>← drifty studio</Link>
        </div>
      </main>
    );
  }

  const result = song.result as unknown as GeneratedSong;
  const accent = MODE_COLORS[song.generation_mode] ?? "#9D5CF5";

  return (
    <main className="min-h-screen" style={{ background: "#0a0a0a", color: "#fff" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" className="font-display font-bold text-sm text-white hover:opacity-70 transition-opacity">
          drifty studio
        </Link>
        <Link
          href="/studio"
          className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}33` }}
        >
          Write your own →
        </Link>
      </header>

      {/* Song */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Meta */}
        <div className="mb-8">
          {song.artist_styles?.length > 0 && (
            <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              Style: {song.artist_styles.join(", ")}
            </p>
          )}
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            Shared from Drifty Studio · {new Date(song.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {result.sections?.map((section, i) => {
            const lines = section.content.split("\n");
            const syllables = section.syllables ?? [];
            const total = syllables.reduce((a, b) => a + b, 0);

            return (
              <div key={i}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span
                    className="font-display inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    {section.label}
                  </span>
                  {total > 0 && (
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{total} syl</span>
                  )}
                </div>
                <div>
                  {lines.map((line, j) => (
                    <div key={j} className="flex items-baseline justify-between gap-4" style={{ lineHeight: "2rem" }}>
                      <span className="text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>{line || " "}</span>
                      {syllables[j] != null && (
                        <span className="text-[10px] tabular-nums shrink-0" style={{ color: "rgba(255,255,255,0.18)" }}>
                          {syllables[j]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {result.notes && (
          <p className="mt-10 pt-6 text-xs italic leading-relaxed" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
            {result.notes}
          </p>
        )}

        <div className="mt-12 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.25)" }}>Write your own songs with AI</p>
          <Link
            href="/studio"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display font-bold text-white text-sm"
            style={{ background: `linear-gradient(135deg, ${accent}, #E8437A)` }}
          >
            Start Writing Free
          </Link>
        </div>
      </div>
    </main>
  );
}
