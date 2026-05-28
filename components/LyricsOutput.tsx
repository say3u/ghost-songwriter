"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Pencil, Check } from "lucide-react";
import type { GeneratedSong, SongSection } from "@/types";

type Props = {
  streaming: string;
  song: GeneratedSong | null;
  isLoading: boolean;
  accentColor?: string;
  onEdit?: (sectionIndex: number, newContent: string) => void;
};

// ── Metronome helpers ──────────────────────────────────────────────────────

function playClick(ctx: AudioContext, time: number, downbeat: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = downbeat ? 1100 : 880;
  gain.gain.setValueAtTime(0.22, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
  osc.start(time);
  osc.stop(time + 0.05);
}

function parseBpm(tempo?: string): number {
  if (!tempo) return 0;
  const m = tempo.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

// ── Editable section card ──────────────────────────────────────────────────

function SectionCard({
  section, accentColor, index,
  activeSection, activeLine,
  onEdit,
}: {
  section: SongSection;
  accentColor: string;
  index: number;
  activeSection: number;
  activeLine: number;
  onEdit?: (i: number, content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.content);
  const lines = section.content.split("\n");
  const syllables = section.syllables ?? [];
  const total = syllables.reduce((a, b) => a + b, 0);
  const isActiveSection = activeSection === index;

  // Keep draft in sync when song regenerated
  useEffect(() => { setDraft(section.content); }, [section.content]);

  const save = () => { onEdit?.(index, draft); setEditing(false); };
  const cancel = () => { setDraft(section.content); setEditing(false); };

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
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="ml-auto p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            title="Edit section"
            style={{ color: "rgba(255,255,255,0.25)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
          >
            <Pencil size={11} />
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={cancel}
              className="text-[10px] px-2 py-0.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
              style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}
            >
              <Check size={10} /> Save
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          autoFocus
          className="w-full rounded-xl px-3.5 py-3 text-[15px] leading-8 resize-none focus:outline-none transition-colors"
          style={{
            background: "#1a1a1a",
            border: `1px solid ${accentColor}44`,
            color: "rgba(255,255,255,0.9)",
            minHeight: `${lines.length * 32 + 24}px`,
          }}
        />
      ) : (
        <div>
          {lines.map((line, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-4 rounded-lg px-2 -mx-2 transition-all"
              style={{
                lineHeight: "2rem",
                background: isActiveSection && activeLine === i ? `${accentColor}20` : "transparent",
              }}
            >
              <span
                className="text-[15px] transition-all"
                style={{
                  color: isActiveSection && activeLine === i ? "#fff" : "rgba(255,255,255,0.85)",
                  fontWeight: isActiveSection && activeLine === i ? 600 : 400,
                }}
              >
                {line || " "}
              </span>
              {syllables[i] != null && (
                <span className="text-[10px] tabular-nums shrink-0" style={{ color: "rgba(255,255,255,0.18)" }}>
                  {syllables[i]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tag ────────────────────────────────────────────────────────────────────

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <span className="text-[10px] font-semibold uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function LyricsOutput({ streaming, song, isLoading, accentColor = "#9D5CF5", onEdit }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSection, setActiveSection] = useState(-1);
  const [activeLine, setActiveLine] = useState(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bpm = parseBpm(song?.suggestedTempo);

  const allLines = song?.sections.flatMap((s, si) =>
    s.content.split("\n").map((_, li) => ({ si, li }))
  ) ?? [];

  const stopKaraoke = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setIsPlaying(false);
    setActiveSection(-1);
    setActiveLine(-1);
  }, []);

  const startKaraoke = useCallback(() => {
    if (!bpm || allLines.length === 0) return;
    const msPerBeat = 60000 / bpm;
    const msPerLine = msPerBeat * 4; // 1 bar per line

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const scheduleBar = (startAt: number) => {
      for (let b = 0; b < 4; b++) playClick(ctx, startAt + b * (msPerBeat / 1000), b === 0);
    };

    let idx = 0;
    setActiveSection(allLines[0].si);
    setActiveLine(allLines[0].li);
    scheduleBar(ctx.currentTime);

    timerRef.current = setInterval(() => {
      idx++;
      if (idx >= allLines.length) { stopKaraoke(); return; }
      setActiveSection(allLines[idx].si);
      setActiveLine(allLines[idx].li);
      scheduleBar(ctx.currentTime);
    }, msPerLine);

    setIsPlaying(true);
  }, [bpm, allLines, stopKaraoke]);

  // Stop on unmount or new song
  useEffect(() => () => { stopKaraoke(); }, [stopKaraoke]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isPlaying) stopKaraoke(); }, [song]);

  if (!isLoading && !streaming && !song) return null;

  return (
    <div
      className="fade-up group flex flex-col h-full rounded-2xl overflow-hidden"
      style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div className="flex-none flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {isLoading ? (
          <>
            <div className="flex items-end gap-1 h-5">
              {[0,1,2,3,4].map(n => (
                <span key={n} className="wave-bar" style={{ background: accentColor }} />
              ))}
            </div>
            <span className="font-display text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
              Writing your song...
            </span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />
            <span className="font-display text-xs font-semibold uppercase tracking-widest flex-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Your Lyrics
            </span>
            {bpm > 0 && song && (
              <button
                onClick={isPlaying ? stopKaraoke : startKaraoke}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={isPlaying
                  ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {isPlaying ? <><Pause size={11} /> Stop</> : <><Play size={11} /> {bpm} BPM</>}
              </button>
            )}
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          /* Skeleton — no raw JSON */
          <div className="space-y-8 animate-pulse">
            {[80, 65, 80, 70].map((w, i) => (
              <div key={i}>
                <div className="h-5 w-16 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
                {[w, w - 15, w + 5, w - 10].map((p, j) => (
                  <div key={j} className="h-4 rounded mb-2" style={{ background: "rgba(255,255,255,0.04)", width: `${p}%` }} />
                ))}
              </div>
            ))}
          </div>
        ) : song ? (
          <>
            {song.sections.map((s, i) => (
              <SectionCard
                key={i}
                section={s}
                accentColor={accentColor}
                index={i}
                activeSection={activeSection}
                activeLine={activeLine}
                onEdit={onEdit}
              />
            ))}

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
