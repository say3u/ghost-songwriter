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
    <button onClick={exportTxt}
      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all">
      <Download size={13} /> Export
    </button>
  );
}
