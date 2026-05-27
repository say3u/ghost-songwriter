"use client";

import { Clock, RotateCcw } from "lucide-react";
import type { Revision } from "@/types";

type Props = { history: Revision[]; onRestore: (revision: Revision) => void };

export default function RevisionHistory({ history, onRestore }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800/60 flex items-center gap-2">
        <Clock size={13} className="text-zinc-500" />
        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
          Session History ({history.length})
        </span>
      </div>
      <div className="divide-y divide-zinc-800/60 max-h-44 overflow-y-auto">
        {history.map((rev, i) => (
          <div key={rev.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-300 truncate">
                #{history.length - i} — "{rev.request.input.slice(0, 42)}{rev.request.input.length > 42 ? "…" : ""}"
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{rev.timestamp.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={() => onRestore(rev)}
              className="ml-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-green-400 transition-colors"
            >
              <RotateCcw size={11} />
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
