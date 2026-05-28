"use client";

import { Clock, RotateCcw } from "lucide-react";
import type { Revision } from "@/types";

type Props = { history: Revision[]; onRestore: (revision: Revision) => void };

export default function RevisionHistory({ history, onRestore }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Clock size={13} style={{ color: "rgba(255,255,255,0.25)" }} />
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
          Session History ({history.length})
        </span>
      </div>
      <div className="max-h-44 overflow-y-auto" style={{ borderTop: "none" }}>
        {history.map((rev, i) => (
          <div
            key={rev.id}
            className="flex items-center justify-between px-5 py-3 transition-colors"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                #{history.length - i} — "{rev.request.input.slice(0, 44)}{rev.request.input.length > 44 ? "…" : ""}"
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                {rev.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => onRestore(rev)}
              className="ml-3 flex items-center gap-1 text-xs transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <RotateCcw size={11} /> Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
