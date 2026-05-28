"use client";

type Props = { selected: string[]; onChange: (styles: string[]) => void; accentColor?: string };

export default function StyleSelector({ selected, onChange, accentColor = "#9D5CF5" }: Props) {
  const value = selected.join(", ");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
    onChange(parts);
  };

  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>In the style of</p>
      <input
        value={value}
        onChange={handleChange}
        placeholder="Drake, Billie Eilish, Taylor Swift..."
        className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder-white/20"
        style={{
          background: "#161616",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#fff",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = `${accentColor}66`; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
      />
    </div>
  );
}
