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
      <p className="text-xs font-medium text-gray-500 mb-2">In the style of</p>
      <input
        value={value}
        onChange={handleChange}
        placeholder="Drake, Billie Eilish, Taylor Swift..."
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
      />
    </div>
  );
}
