"use client";

import { Clock, RotateCcw } from "lucide-react";
import type { Revision } from "@/types";

type Props = { history: Revision[]; onRestore: (revision: Revision) => void };

export default function RevisionHistory({ history, onRestore }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <Clock size={13} className="text-white/30" />
        <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">
          Session History ({history.length})
        </span>
      </div>
      <div className="divide-y divide-white/5 max-h-44 overflow-y-auto">
        {history.map((rev, i) => (
          <div key={rev.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/60 truncate">
                #{history.length - i} — "{rev.request.input.slice(0, 44)}{rev.request.input.length > 44 ? "…" : ""}"
              </p>
              <p className="text-[10px] text-white/25 mt-0.5">{rev.timestamp.toLocaleTimeString()}</p>
            </div>
            <button onClick={() => onRestore(rev)}
              className="ml-3 flex items-center gap-1 text-xs text-white/30 hover:text-white transition-colors">
              <RotateCcw size={11} /> Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
