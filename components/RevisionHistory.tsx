"use client";

import { Clock, RotateCcw } from "lucide-react";
import type { Revision } from "@/types";

type Props = { history: Revision[]; onRestore: (revision: Revision) => void };

export default function RevisionHistory({ history, onRestore }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Clock size={13} className="text-gray-300" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          Session History ({history.length})
        </span>
      </div>
      <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">
        {history.map((rev, i) => (
          <div key={rev.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-600 truncate">
                #{history.length - i} — "{rev.request.input.slice(0, 44)}{rev.request.input.length > 44 ? "…" : ""}"
              </p>
              <p className="text-[10px] text-gray-300 mt-0.5">{rev.timestamp.toLocaleTimeString()}</p>
            </div>
            <button onClick={() => onRestore(rev)}
              className="ml-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors">
              <RotateCcw size={11} /> Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
