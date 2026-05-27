"use client";

import type { Mood } from "@/types";

const MOODS: Mood[] = [
  { id: "melancholic", label: "Melancholic", emoji: "🌧️" },
  { id: "angry", label: "Angry", emoji: "🔥" },
  { id: "euphoric", label: "Euphoric", emoji: "⚡" },
  { id: "nostalgic", label: "Nostalgic", emoji: "🌅" },
  { id: "romantic", label: "Romantic", emoji: "🌹" },
  { id: "introspective", label: "Introspective", emoji: "🌙" },
  { id: "hype", label: "Hype", emoji: "💥" },
  { id: "chill", label: "Chill", emoji: "🌊" },
  { id: "dark", label: "Dark", emoji: "🖤" },
  { id: "hopeful", label: "Hopeful", emoji: "✨" },
];

type Props = {
  selected: string[];
  onChange: (moods: string[]) => void;
};

export default function MoodBoard({ selected, onChange }: Props) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]
    );
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
        Mood / Vibe
      </label>
      <div className="flex flex-wrap gap-2">
        {MOODS.map((mood) => {
          const active = selected.includes(mood.id);
          return (
            <button
              key={mood.id}
              onClick={() => toggle(mood.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                active
                  ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/40"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
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
