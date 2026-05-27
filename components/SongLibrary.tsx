"use client";

import { useEffect, useState, useCallback } from "react";
import { Library, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { supabase, type DbSong } from "@/lib/supabase";
import type { GeneratedSong } from "@/types";

type Props = { userId: string; onLoad: (song: GeneratedSong, input: string) => void; refreshTrigger: number };

export default function SongLibrary({ userId, onLoad, refreshTrigger }: Props) {
  const [songs, setSongs] = useState<DbSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("songs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
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

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Library size={14} className="text-zinc-500" />
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
            My Songs {songs.length > 0 && `(${songs.length})`}
          </span>
        </div>
        {open ? <ChevronUp size={13} className="text-zinc-600" /> : <ChevronDown size={13} className="text-zinc-600" />}
      </button>

      {open && (
        <div className="border-t border-zinc-800/60">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-600">
              <Loader2 size={14} className="animate-spin" />Loading...
            </div>
          ) : songs.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-600">No saved songs yet.</p>
          ) : (
            <div className="divide-y divide-zinc-800/40 max-h-64 overflow-y-auto">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/30 transition-colors">
                  <button className="flex-1 text-left min-w-0" onClick={() => onLoad(song.result as unknown as GeneratedSong, song.input)}>
                    <p className="text-sm text-zinc-300 truncate font-medium">
                      {song.title ?? `"${song.input.slice(0, 38)}${song.input.length > 38 ? "…" : ""}"`}
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      {new Date(song.created_at).toLocaleDateString()} · {song.artist_styles.length > 0 ? song.artist_styles.slice(0, 2).join(", ") : "No style"}
                    </p>
                  </button>
                  <button onClick={() => deleteSong(song.id)} disabled={deleting === song.id} className="ml-3 text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-40">
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
