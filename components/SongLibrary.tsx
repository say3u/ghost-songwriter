"use client";

import { useEffect, useState, useCallback } from "react";
import { Library, Trash2, ChevronDown, ChevronUp, Loader2, Shuffle } from "lucide-react";
import { supabase, type DbSong } from "@/lib/supabase";
import type { GeneratedSong } from "@/types";

type Props = {
  userId: string;
  onLoad: (song: GeneratedSong, input: string) => void;
  onRemix: (lyricsContent: string) => void;
  refreshTrigger: number;
};

export default function SongLibrary({ userId, onLoad, onRemix, refreshTrigger }: Props) {
  const [songs, setSongs] = useState<DbSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [remixing, setRemixing] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setSongs(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { if (open || refreshTrigger > 0) fetchSongs(); }, [open, refreshTrigger, fetchSongs]);

  const deleteSong = async (id: string) => {
    setDeleting(id);
    await supabase.from("songs").delete().eq("id", id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  };

  const remixSong = (song: DbSong) => {
    setRemixing(song.id);
    const generated = song.result as unknown as GeneratedSong;
    const content = generated.sections
      .map((s) => `[${s.label}]\n${s.content}`)
      .join("\n\n");
    onRemix(content);
    setTimeout(() => setRemixing(null), 800);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div className="flex items-center gap-2">
          <Library size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            My Songs {songs.length > 0 && `(${songs.length})`}
          </span>
        </div>
        {open
          ? <ChevronUp size={13} style={{ color: "rgba(255,255,255,0.25)" }} />
          : <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.25)" }} />}
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              <Loader2 size={14} className="animate-spin" /> Loading...
            </div>
          ) : songs.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>No saved songs yet.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-1.5 px-4 py-3 transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Song info — load on click */}
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => onLoad(song.result as unknown as GeneratedSong, song.input)}
                  >
                    <p className="text-sm truncate font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                      {song.title ?? `"${song.input.slice(0, 40)}${song.input.length > 40 ? "…" : ""}"`}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {new Date(song.created_at).toLocaleDateString()} · {song.artist_styles.slice(0, 2).join(", ") || "No style"}
                    </p>
                  </button>

                  {/* Remix */}
                  <button
                    onClick={() => remixSong(song)}
                    disabled={remixing === song.id}
                    title="Remix — open in Expand Lyrics mode"
                    className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#9D5CF5")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                  >
                    {remixing === song.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Shuffle size={12} />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteSong(song.id)}
                    disabled={deleting === song.id}
                    className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}
                  >
                    {deleting === song.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
