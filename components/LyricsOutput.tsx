"use client";

import { useEffect, useRef } from "react";
import type { GeneratedSong, SongSection } from "@/types";

type Props = { streaming: string; song: GeneratedSong | null; isLoading: boolean };

function SectionCard({ section }: { section: SongSection }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
          {section.label}
        </span>
        {section.syllables && (
          <span className="text-[10px] text-zinc-700 font-mono">
            [{section.syllables.join(", ")}]
          </span>
        )}
      </div>
      <p className="text-zinc-100 leading-8 whitespace-pre-line text-sm">
        {section.content}
      </p>
    </div>
  );
}

export default function LyricsOutput({ streaming, song, isLoading }: Props) {
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [streaming]);

  if (!isLoading && !streaming && !song) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800/60 flex items-center gap-3">
        {isLoading ? (
          <div className="flex items-end gap-0.5 h-4">
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
            <span className="wave-bar" />
          </div>
        ) : (
          <div className="w-2 h-2 rounded-full bg-green-500" />
        )}
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          {isLoading ? "Writing your song..." : "Generated Lyrics"}
        </span>
      </div>

      <div ref={streamRef} className="p-6 max-h-[600px] overflow-y-auto">
        {isLoading && !song ? (
          <pre className="text-zinc-600 text-xs font-mono whitespace-pre-wrap leading-relaxed">
            {streaming || "Thinking..."}
          </pre>
        ) : song ? (
          <>
            {song.sections.map((s, i) => <SectionCard key={i} section={s} />)}

            {(song.suggestedTempo || song.suggestedKey || song.suggestedMood) && (
              <div className="mt-2 pt-4 border-t border-zinc-800 flex flex-wrap gap-2">
                {song.suggestedTempo && <Chip label="Tempo" value={song.suggestedTempo} />}
                {song.suggestedKey   && <Chip label="Key"   value={song.suggestedKey} />}
                {song.suggestedMood  && <Chip label="Mood"  value={song.suggestedMood} />}
              </div>
            )}

            {song.notes && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Producer Notes</span>
                <p className="mt-1.5 text-sm text-zinc-500 italic leading-relaxed">{song.notes}</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-full border border-zinc-700">
      <span className="text-[10px] text-zinc-500 font-semibold uppercase">{label}</span>
      <span className="text-xs text-zinc-200 font-medium">{value}</span>
    </div>
  );
}
