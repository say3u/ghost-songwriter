"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

const SUGGESTIONS = [
  "Drake", "Kendrick Lamar", "Taylor Swift", "Billie Eilish",
  "The Weeknd", "Frank Ocean", "Lana Del Rey", "Tyler the Creator",
  "Post Malone", "SZA", "J. Cole", "Olivia Rodrigo",
];

type Props = { selected: string[]; onChange: (styles: string[]) => void };

export default function StyleSelector({ selected, onChange }: Props) {
  const [input, setInput] = useState("");

  const add = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !selected.includes(trimmed)) onChange([...selected, trimmed]);
    setInput("");
  };

  const remove = (name: string) => onChange(selected.filter((s) => s !== name));

  return (
    <div>
      <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
        Artist Style Reference
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((s) => (
            <span key={s} className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-xs text-green-400 font-medium">
              {s}
              <button onClick={() => remove(s)} className="hover:text-white transition-colors">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add(input)}
          placeholder="Type an artist name..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-green-500/50 transition-colors"
        />
        <button onClick={() => add(input)} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors">
          <Plus size={15} className="text-zinc-300" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.filter((s) => !selected.includes(s)).map((s) => (
          <button
            key={s}
            onClick={() => add(s)}
            className="px-2.5 py-1 text-xs bg-zinc-900 border border-zinc-800 rounded-full text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
