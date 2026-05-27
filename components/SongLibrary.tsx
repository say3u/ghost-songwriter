"use client";

import { useEffect, useState, useCallback } from "react";
import { Library, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { supabase, type DbSong } from "@/lib/supabase";
import type { GeneratedSong } from "@/types";

type Props = {
  userId: string;
  onLoad: (song: GeneratedSong, input: string) => void;
  refreshTrigger: number;
};

export default function SongLibrary({ userId, onLoad, refreshTrigger }: Props) {
  const [songs, setSongs] = useState<DbSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  useEffect(() => {
    if (open || refreshTrigger > 0) fetchSongs();
  }, [open, refreshTrigger, fetchSongs]);

  const deleteSong = async (id: string) => {
    setDeleting(id);
    await supabase.from("songs").delete().eq("id", id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  };

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Library size={14} className="text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            My Songs {songs.length > 0 && `(${songs.length})`}
          </span>
        </div>
        {open ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
      </button>

      {open && (
        <div className="border-t border-zinc-800">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500">
              <Loader2 size={14} className="animate-spin" />
              Loading...
            </div>
          ) : songs.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-600">
              No saved songs yet. Generate one and save it!
            </p>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-72 overflow-y-auto">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
                >
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => onLoad(song.result as unknown as GeneratedSong, song.input)}
                  >
                    <p className="text-sm text-zinc-300 truncate">
                      {song.title ?? `"${song.input.slice(0, 40)}${song.input.length > 40 ? "…" : ""}"`}
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      {new Date(song.created_at).toLocaleDateString()} ·{" "}
                      {song.artist_styles.length > 0
                        ? song.artist_styles.slice(0, 2).join(", ")
                        : "No style"}
                    </p>
                  </button>
                  <button
                    onClick={() => deleteSong(song.id)}
                    disabled={deleting === song.id}
                    className="ml-3 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {deleting === song.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />}
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
