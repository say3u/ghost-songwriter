"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";

const MODE_COLORS: Record<string, string> = {
  "lyrics-from-idea": "#FF6D3B",
  "lyrics-from-beat": "#E8437A",
  "expand-lyrics":    "#9D5CF5",
  "lyrics-to-beat":   "#3D8EF0",
};
const MODE_LABELS: Record<string, string> = {
  "lyrics-from-idea": "Idea → Lyrics",
  "lyrics-from-beat": "Beat → Lyrics",
  "expand-lyrics":    "Expand",
  "lyrics-to-beat":   "→ Beat",
};

type Song = { generation_mode: string; created_at: string };

function buildModeData(songs: Song[]) {
  return Object.entries(MODE_LABELS).map(([value, label]) => ({
    label,
    count: songs.filter((s) => s.generation_mode === value).length,
    color: MODE_COLORS[value],
  }));
}

function buildDailyData(songs: Song[]) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });
  return days.map((day) => ({
    date: day.slice(5), // MM-DD
    count: songs.filter((s) => s.created_at.startsWith(day)).length,
  }));
}

const tooltipStyle = {
  background: "#111",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
};

export function ModeBarChart({ songs }: { songs: Song[] }) {
  const data = buildModeData(songs);
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="30%">
        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="count" name="Songs" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <rect key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyLineChart({ songs }: { songs: Song[] }) {
  const data = buildDailyData(songs);
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
        <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="count" name="Songs" stroke="#9D5CF5" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#9D5CF5" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
