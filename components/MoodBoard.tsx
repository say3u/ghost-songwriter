"use client";

import type { Mood } from "@/types";

const MOODS: Mood[] = [
  { id: "melancholic",   label: "Sad",       emoji: "" },
  { id: "angry",         label: "Angry",     emoji: "" },
  { id: "euphoric",      label: "Happy",     emoji: "" },
  { id: "romantic",      label: "Love",      emoji: "" },
  { id: "hype",          label: "Hype",      emoji: "" },
  { id: "chill",         label: "Chill",     emoji: "" },
  { id: "dark",          label: "Dark",      emoji: "" },
  { id: "nostalgic",     label: "Nostalgic", emoji: "" },
];

type Props = { selected: string[]; onChange: (moods: string[]) => void; accentColor?: string };

export default function MoodBoard({ selected, onChange, accentColor = "#9D5CF5" }: Props) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]);

  return (
    <div>
      <p className="text-xs mb-3 font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Pick a vibe</p>
      <div className="flex flex-wrap gap-2">
        {MOODS.map((mood) => {
          const active = selected.includes(mood.id);
          return (
            <button
              key={mood.id}
              onClick={() => toggle(mood.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={
                active
                  ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}55` }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.07)" }
              }
            >
              <span>{mood.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
