import Link from "next/link";
import { Lightbulb, Music2, FileText, Mic2 } from "lucide-react";

const FEATURES = [
  { icon: Lightbulb, label: "Idea → Lyrics",  desc: "Turn any concept or phrase into a full structured song.",    color: "#FF6D3B" },
  { icon: Music2,    label: "Beat → Lyrics",  desc: "Upload a beat or describe it — we write lyrics that fit.",   color: "#E8437A" },
  { icon: FileText,  label: "Expand Lyrics",  desc: "Paste a rough draft and we'll build it into a complete song.", color: "#9D5CF5" },
  { icon: Mic2,      label: "Lyrics → Beat",  desc: "Get a full production brief — BPM, genre, instruments.",      color: "#3D8EF0" },
];

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0a0a", color: "#fff" }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="font-display font-bold text-white text-base tracking-tight">drifty studio</span>
        <Link
          href="/studio"
          className="text-sm font-medium transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Open app →
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 text-center px-6 py-24">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: "rgba(157,92,245,0.12)", border: "1px solid rgba(157,92,245,0.3)", color: "#9D5CF5" }}
        >
          AI-powered songwriting
        </div>

        <h1
          className="font-display font-extrabold leading-none tracking-tight mb-6"
          style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", maxWidth: "14ch" }}
        >
          Write songs faster than ever.
        </h1>

        <p
          className="text-lg leading-relaxed mb-10 max-w-xl"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          From a raw idea or a beat file to polished, structured lyrics — in seconds.
          Four modes. One tool.
        </p>

        <Link
          href="/studio"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-display font-bold text-white text-sm transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #9D5CF5, #E8437A)" }}
        >
          Start Writing
        </Link>

        <p className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          No account required to start
        </p>
      </section>

      {/* Feature grid */}
      <section className="px-6 pb-24 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, label, desc, color }) => (
            <div
              key={label}
              className="rounded-2xl p-6 transition-all"
              style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${color}18`, border: `1px solid ${color}33` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              <p className="font-display font-bold text-white text-sm mb-1">{label}</p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8 text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
        drifty studio
      </footer>
    </main>
  );
}
