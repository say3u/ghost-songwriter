"use client";

import { Download } from "lucide-react";
import type { GeneratedSong } from "@/types";

type Props = {
  song: GeneratedSong | null;
  filename?: string;
};

export default function ExportButton({ song, filename = "lyrics" }: Props) {
  if (!song) return null;

  const exportTxt = () => {
    const lines: string[] = [];
    song.sections.forEach((s) => {
      lines.push(`[${s.label.toUpperCase()}]`);
      lines.push(s.content);
      lines.push("");
    });
    if (song.notes) {
      lines.push("---");
      lines.push(`Notes: ${song.notes}`);
    }
    if (song.suggestedTempo) lines.push(`Suggested Tempo: ${song.suggestedTempo}`);
    if (song.suggestedKey) lines.push(`Suggested Key: ${song.suggestedKey}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportTxt}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all"
    >
      <Download size={14} />
      Export .txt
    </button>
  );
}
