"use client";

import { useEffect, useRef } from "react";
import type { GeneratedSong, SongSection } from "@/types";

type Props = { streaming: string; song: GeneratedSong | null; isLoading: boolean };

function SectionCard({ section }: { section: SongSection }) {
  return (
    <div className="mb-7">
      <span className="inline-block text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-full mb-3">
        {section.label}
      </span>
      <p className="text-gray-800 leading-8 whitespace-pre-line text-[15px]">
        {section.content}
      </p>
    </div>
  );
}

export default function LyricsOutput({ streaming, song, isLoading }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [streaming]);

  if (!isLoading && !streaming && !song) return null;

  return (
    <div className="fade-up rounded-3xl bg-white shadow-2xl shadow-black/40 overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        {isLoading ? (
          <div className="flex items-end gap-1 h-5">
            <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
            <span className="wave-bar" /><span className="wave-bar" />
          </div>
        ) : (
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
        )}
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {isLoading ? "Writing your song..." : "Your Lyrics"}
        </span>
      </div>

      <div ref={ref} className="px-6 py-6 max-h-[540px] overflow-y-auto">
        {isLoading && !song ? (
          <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
            {streaming || "Thinking..."}
          </pre>
        ) : song ? (
          <>
            {song.sections.map((s, i) => <SectionCard key={i} section={s} />)}

            {(song.suggestedTempo || song.suggestedKey || song.suggestedMood) && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                {song.suggestedTempo && <Tag label="Tempo" value={song.suggestedTempo} />}
                {song.suggestedKey   && <Tag label="Key"   value={song.suggestedKey} />}
                {song.suggestedMood  && <Tag label="Mood"  value={song.suggestedMood} />}
              </div>
            )}

            {song.notes && (
              <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 italic leading-relaxed">
                {song.notes}
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
      <span className="text-[10px] text-gray-400 font-semibold uppercase">{label}</span>
      <span className="text-xs text-gray-700 font-medium">{value}</span>
    </div>
  );
}
