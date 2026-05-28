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

type Props = { selected: string[]; onChange: (moods: string[]) => void };

export default function MoodBoard({ selected, onChange }: Props) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]);

  return (
    <div>
      <p className="text-xs text-white/40 mb-3 font-medium">Pick a vibe</p>
      <div className="flex flex-wrap gap-2">
        {MOODS.map((mood) => {
          const active = selected.includes(mood.id);
          return (
            <button
              key={mood.id}
              onClick={() => toggle(mood.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                active
                  ? "bg-white text-black shadow-lg scale-105"
                  : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              <span>{mood.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
