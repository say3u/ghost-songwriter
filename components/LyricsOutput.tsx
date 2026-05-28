"use client";

import { useEffect, useRef } from "react";
import type { GeneratedSong, SongSection } from "@/types";

type Props = { streaming: string; song: GeneratedSong | null; isLoading: boolean; accentColor?: string };

function SectionCard({ section, accentColor }: { section: SongSection; accentColor: string }) {
  const lines = section.content.split("\n");
  const syllables = section.syllables ?? [];
  const total = syllables.reduce((a, b) => a + b, 0);

  return (
    <div className="mb-7">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="font-display inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{ background: `${accentColor}22`, color: accentColor }}
        >
          {section.label}
        </span>
        {total > 0 && (
          <span className="text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.2)" }}>
            {total} syl
          </span>
        )}
      </div>
      <div>
        {lines.map((line, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4" style={{ lineHeight: "2rem" }}>
            <span className="text-[15px]" style={{ color: "rgba(255,255,255,0.85)" }}>
              {line || " "}
            </span>
            {syllables[i] != null && (
              <span className="text-[10px] tabular-nums shrink-0" style={{ color: "rgba(255,255,255,0.18)" }}>
                {syllables[i]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LyricsOutput({ streaming, song, isLoading, accentColor = "#9D5CF5" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [streaming]);

  if (!isLoading && !streaming && !song) return null;

  return (
    <div className="fade-up rounded-2xl overflow-hidden" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {isLoading ? (
          <div className="flex items-end gap-1 h-5">
            <span className="wave-bar" style={{ background: accentColor }} />
            <span className="wave-bar" style={{ background: accentColor }} />
            <span className="wave-bar" style={{ background: accentColor }} />
            <span className="wave-bar" style={{ background: accentColor }} />
            <span className="wave-bar" style={{ background: accentColor }} />
          </div>
        ) : (
          <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
        )}
        <span className="font-display text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
          {isLoading ? "Writing your song..." : "Your Lyrics"}
        </span>
      </div>

      <div ref={ref} className="px-6 py-6 max-h-[540px] overflow-y-auto">
        {isLoading && !song ? (
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            {streaming || "Thinking..."}
          </pre>
        ) : song ? (
          <>
            {song.sections.map((s, i) => <SectionCard key={i} section={s} accentColor={accentColor} />)}

            {(song.suggestedTempo || song.suggestedKey || song.suggestedMood) && (
              <div className="flex flex-wrap gap-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {song.suggestedTempo && <Tag label="Tempo" value={song.suggestedTempo} />}
                {song.suggestedKey   && <Tag label="Key"   value={song.suggestedKey} />}
                {song.suggestedMood  && <Tag label="Mood"  value={song.suggestedMood} />}
              </div>
            )}

            {song.notes && (
              <p className="mt-4 pt-4 text-xs italic leading-relaxed" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>
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
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <span className="text-[10px] font-semibold uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{value}</span>
    </div>
  );
}
