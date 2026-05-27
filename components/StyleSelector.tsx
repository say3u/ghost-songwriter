"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

const SUGGESTIONS = [
  "Drake", "Kendrick Lamar", "Taylor Swift", "Billie Eilish",
  "The Weeknd", "Frank Ocean", "Lana Del Rey", "Tyler the Creator",
  "Post Malone", "SZA", "J. Cole", "Olivia Rodrigo",
];

type Props = {
  selected: string[];
  onChange: (styles: string[]) => void;
};

export default function StyleSelector({ selected, onChange }: Props) {
  const [input, setInput] = useState("");

  const add = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setInput("");
  };

  const remove = (name: string) => onChange(selected.filter((s) => s !== name));

  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
        Artist Style Reference
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 px-3 py-1 bg-violet-900/60 border border-violet-700 rounded-full text-sm text-violet-200"
            >
              {s}
              <button onClick={() => remove(s)} className="hover:text-white">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add(input)}
          placeholder="Type an artist name..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-600"
        />
        <button
          onClick={() => add(input)}
          className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
        >
          <Plus size={16} className="text-zinc-300" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.filter((s) => !selected.includes(s)).map((s) => (
          <button
            key={s}
            onClick={() => add(s)}
            className="px-2.5 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-full text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
