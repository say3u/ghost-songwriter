"use client";

import type { Mood } from "@/types";

const MOODS: Mood[] = [
  { id: "melancholic", label: "Melancholic", emoji: "🌧️" },
  { id: "angry",       label: "Angry",       emoji: "🔥" },
  { id: "euphoric",    label: "Euphoric",    emoji: "⚡" },
  { id: "nostalgic",   label: "Nostalgic",   emoji: "🌅" },
  { id: "romantic",    label: "Romantic",    emoji: "🌹" },
  { id: "introspective", label: "Introspective", emoji: "🌙" },
  { id: "hype",        label: "Hype",        emoji: "💥" },
  { id: "chill",       label: "Chill",       emoji: "🌊" },
  { id: "dark",        label: "Dark",        emoji: "🖤" },
  { id: "hopeful",     label: "Hopeful",     emoji: "✨" },
];

type Props = { selected: string[]; onChange: (moods: string[]) => void };

export default function MoodBoard({ selected, onChange }: Props) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]);

  return (
    <div>
      <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
        Mood / Vibe
      </label>
      <div className="flex flex-wrap gap-2">
        {MOODS.map((mood) => {
          const active = selected.includes(mood.id);
          return (
            <button
              key={mood.id}
              onClick={() => toggle(mood.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                active
                  ? "bg-green-500 border-green-500 text-black"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {mood.emoji} {mood.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
