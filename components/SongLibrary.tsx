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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <Library size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            My Songs {songs.length > 0 && `(${songs.length})`}
          </span>
        </div>
        {open ? <ChevronUp size={13} className="text-gray-300" /> : <ChevronDown size={13} className="text-gray-300" />}
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" /> Loading...
            </div>
          ) : songs.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No saved songs yet.</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <button className="flex-1 text-left min-w-0" onClick={() => onLoad(song.result as unknown as GeneratedSong, song.input)}>
                    <p className="text-sm text-gray-800 truncate font-medium">
                      {song.title ?? `"${song.input.slice(0, 40)}${song.input.length > 40 ? "…" : ""}"`}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(song.created_at).toLocaleDateString()} · {song.artist_styles.slice(0, 2).join(", ") || "No style"}
                    </p>
                  </button>
                  <button onClick={() => deleteSong(song.id)} disabled={deleting === song.id}
                    className="ml-3 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40">
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
