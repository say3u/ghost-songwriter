"use client";

import { Download } from "lucide-react";
import type { GeneratedSong } from "@/types";

type Props = { song: GeneratedSong | null; filename?: string };

export default function ExportButton({ song, filename = "lyrics" }: Props) {
  if (!song) return null;

  const exportTxt = () => {
    const lines: string[] = [];
    song.sections.forEach((s) => { lines.push(`[${s.label.toUpperCase()}]`); lines.push(s.content); lines.push(""); });
    if (song.notes) { lines.push("---"); lines.push(`Notes: ${song.notes}`); }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportTxt}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.7)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
    >
      <Download size={13} /> Export
    </button>
  );
}
