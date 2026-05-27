"use client";

import { useEffect, useRef } from "react";
import type { GeneratedSong, SongSection } from "@/types";

type Props = {
  streaming: string;
  song: GeneratedSong | null;
  isLoading: boolean;
};

function SectionCard({ section }: { section: SongSection }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-violet-400">
          {section.label}
        </span>
        {section.syllables && (
          <span className="text-xs text-zinc-600">
            syllables: [{section.syllables.join(", ")}]
          </span>
        )}
      </div>
      <p className="text-zinc-200 leading-relaxed whitespace-pre-line text-sm font-mono">
        {section.content}
      </p>
    </div>
  );
}

export default function LyricsOutput({ streaming, song, isLoading }: Props) {
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streaming]);

  if (!isLoading && !streaming && !song) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          {isLoading ? "Writing..." : "Generated Lyrics"}
        </span>
      </div>

      <div ref={streamRef} className="p-5 max-h-[600px] overflow-y-auto">
        {isLoading && !song ? (
          <pre className="text-zinc-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">
            {streaming || "Thinking..."}
          </pre>
        ) : song ? (
          <>
            {song.sections.map((s, i) => (
              <SectionCard key={i} section={s} />
            ))}

            {(song.suggestedTempo || song.suggestedKey || song.suggestedMood) && (
              <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-3">
                {song.suggestedTempo && (
                  <Chip label="Tempo" value={song.suggestedTempo} />
                )}
                {song.suggestedKey && (
                  <Chip label="Key" value={song.suggestedKey} />
                )}
                {song.suggestedMood && (
                  <Chip label="Mood" value={song.suggestedMood} />
                )}
              </div>
            )}

            {song.notes && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  Producer Notes
                </span>
                <p className="mt-1 text-sm text-zinc-400 italic">{song.notes}</p>
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
    <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700">
      <span className="text-xs text-zinc-500">{label}:</span>
      <span className="text-xs text-zinc-200 font-medium">{value}</span>
    </div>
  );
}
