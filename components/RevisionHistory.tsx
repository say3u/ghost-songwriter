"use client";

import { Clock, RotateCcw } from "lucide-react";
import type { Revision } from "@/types";

type Props = {
  history: Revision[];
  onRestore: (revision: Revision) => void;
};

export default function RevisionHistory({ history, onRestore }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <Clock size={14} className="text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Revision History ({history.length})
        </span>
      </div>
      <div className="divide-y divide-zinc-800 max-h-48 overflow-y-auto">
        {history.map((rev, i) => (
          <div
            key={rev.id}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/40 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-300 truncate">
                #{history.length - i} — {rev.request.mode === "lyrics-from-idea" ? "Idea" : "Beat"}: "
                {rev.request.input.slice(0, 40)}
                {rev.request.input.length > 40 ? "…" : ""}"
              </p>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                {rev.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => onRestore(rev)}
              className="ml-3 flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <RotateCcw size={12} />
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
