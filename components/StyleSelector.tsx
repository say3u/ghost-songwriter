"use client";

type Props = { selected: string[]; onChange: (styles: string[]) => void };

export default function StyleSelector({ selected, onChange }: Props) {
  const value = selected.join(", ");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
    onChange(parts);
  };

  return (
    <div>
      <p className="text-xs text-white/40 mb-3 font-medium">In the style of</p>
      <input
        value={value}
        onChange={handleChange}
        placeholder="Drake, Billie Eilish, Taylor Swift..."
        className="w-full bg-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-colors border border-transparent focus:border-white/20"
      />
    </div>
  );
}
