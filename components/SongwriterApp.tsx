"use client";

import { useState, useCallback, useRef } from "react";
import { Mic2, Wand2, Music2, RefreshCw, Save, LogOut, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import MoodBoard from "./MoodBoard";
import StyleSelector from "./StyleSelector";
import LyricsOutput from "./LyricsOutput";
import ExportButton from "./ExportButton";
import VoiceInput from "./VoiceInput";
import AuthModal from "./AuthModal";
import SongLibrary from "./SongLibrary";
import RevisionHistory from "./RevisionHistory";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { GenerationRequest, GeneratedSong, Revision, RhymeScheme, Language, Message, VoiceMode } from "@/types";

const LANGUAGES: Language[] = ["English", "Spanish", "French", "Portuguese", "German"];
const RHYME_SCHEMES: { value: RhymeScheme; label: string }[] = [
  { value: "AABB", label: "AABB" },
  { value: "ABAB", label: "ABAB" },
  { value: "ABCB", label: "Ballad" },
  { value: "free", label: "Free" },
];

export default function SongwriterApp() {
  const auth = useAuth();

  const [mode, setMode] = useState<"lyrics-from-idea" | "lyrics-from-beat">("lyrics-from-idea");
  const [input, setInput] = useState("");
  const [artistStyles, setArtistStyles] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [rhymeScheme, setRhymeScheme] = useState<RhymeScheme>("AABB");
  const [language, setLanguage] = useState<Language>("English");
  const [temperature, setTemperature] = useState(0.7);
  const [voiceMode, setVoiceMode] = useState<VoiceMode | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [streaming, setStreaming] = useState("");
  const [song, setSong] = useState<GeneratedSong | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [refinement, setRefinement] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);

  const [showAuth, setShowAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [libRefresh, setLibRefresh] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const handleVoiceResult = useCallback((text: string, vMode: VoiceMode) => {
    setInput(text);
    setVoiceMode(vMode === "idea" ? undefined : vMode);
  }, []);

  const generate = useCallback(async (opts: { refine?: string } = {}) => {
    if (!input.trim() && !opts.refine) return;
    if (isLoading) { abortRef.current?.abort(); return; }

    setIsLoading(true); setError(""); setStreaming(""); setSong(null); setSaveSuccess(false);
    abortRef.current = new AbortController();

    const req: GenerationRequest & { refinement?: string } = {
      mode, input, artistStyles, moods, rhymeScheme, language,
      temperature, conversationHistory, voiceMode,
      ...(opts.refine ? { refinement: opts.refine } : {}),
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error("Generation failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreaming(accumulated);
      }

      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid response format");
      const parsed: GeneratedSong = JSON.parse(jsonMatch[0]);
      setSong(parsed);

      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: opts.refine ?? input },
        { role: "assistant", content: accumulated },
      ]);
      setRevisions((prev) =>
        [{ id: Date.now().toString(), timestamp: new Date(), request: req, result: parsed }, ...prev].slice(0, 20)
      );
      setRefinement("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("Something went wrong. Check your API key.");
    } finally {
      setIsLoading(false); setStreaming("");
    }
  }, [input, mode, artistStyles, moods, rhymeScheme, language, temperature, conversationHistory, isLoading, voiceMode]);

  const saveSong = async () => {
    if (!song || !auth.user) return;
    setSaving(true);
    const { error: dbErr } = await supabase.from("songs").insert({
      user_id: auth.user.id, input, generation_mode: mode,
      artist_styles: artistStyles, moods,
      result: song as unknown as Record<string, unknown>,
      title: song.sections[0]?.content?.split("\n")[0]?.slice(0, 60) ?? null,
    });
    setSaving(false);
    if (!dbErr) { setSaveSuccess(true); setLibRefresh((n) => n + 1); setTimeout(() => setSaveSuccess(false), 3000); }
  };

  const reset = () => {
    setSong(null); setConversationHistory([]); setStreaming("");
    setError(""); setRefinement(""); setSaveSuccess(false); setInput("");
  };

  return (
    <div className="min-h-screen">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} auth={auth} />}

      {/* ── Header ── */}
      <header className="px-6 py-5 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Mic2 size={15} className="text-white" />
          </div>
          <span className="text-sm font-black tracking-[0.15em] uppercase text-white">Drifty Studio</span>
        </div>

        <div className="flex items-center gap-2">
          {!auth.loading && (auth.user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 hidden sm:block">{auth.user.email}</span>
              <button onClick={auth.signOut} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all">
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/10">
              Sign In
            </button>
          ))}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-2xl mx-auto px-6 pb-20 space-y-5">

        {/* Hero */}
        {!song && !isLoading && (
          <div className="text-center pt-6 pb-2">
            <h1 className="text-4xl font-black text-white leading-tight mb-3">
              Turn your ideas<br />into lyrics ✨
            </h1>
            <p className="text-white/50 text-base">Describe a vibe, hum a melody, or paste an idea — we'll write the song.</p>
          </div>
        )}

        {/* ── Form card ── */}
        {!song && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-6 space-y-5">

            {/* Mode toggle */}
            <div className="flex rounded-2xl bg-white/10 p-1 gap-1">
              {([
                { value: "lyrics-from-idea", label: "💡 Idea → Lyrics" },
                { value: "lyrics-from-beat", label: "🎵 Beat → Lyrics" },
              ] as const).map((m) => (
                <button key={m.value} onClick={() => setMode(m.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    mode === m.value ? "bg-white text-black shadow-sm" : "text-white/60 hover:text-white"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Textarea + voice */}
            <div className="space-y-2">
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setVoiceMode(undefined); }}
                placeholder={
                  mode === "lyrics-from-idea"
                    ? "What's your song about? Late nights, heartbreak, a new chapter..."
                    : "Describe the beat — dark trap, 140 BPM, heavy 808s, eerie piano..."
                }
                rows={4}
                className="w-full bg-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:bg-white/15 transition-colors resize-none leading-relaxed border border-transparent focus:border-white/20"
              />
              <div className="flex items-center justify-between">
                <VoiceInput onResult={handleVoiceResult} disabled={isLoading} />
                {voiceMode && input && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-300">
                      {voiceMode === "polish" ? "🎤 Polishing vocals" : "🎵 Matching melody"}
                    </span>
                    <button onClick={() => setVoiceMode(undefined)} className="text-xs text-white/30 hover:text-white/60">✕</button>
                  </div>
                )}
              </div>
            </div>

            <MoodBoard selected={moods} onChange={setMoods} />
            <StyleSelector selected={artistStyles} onChange={setArtistStyles} />

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              More options
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-1 border-t border-white/10">
                {/* Rhyme scheme */}
                <div className="pt-4">
                  <p className="text-xs text-white/40 mb-2 font-medium">Rhyme scheme</p>
                  <div className="flex gap-2">
                    {RHYME_SCHEMES.map((s) => (
                      <button key={s.value} onClick={() => setRhymeScheme(s.value)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          rhymeScheme === s.value ? "bg-white text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <p className="text-xs text-white/40 mb-2 font-medium">Language</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => (
                      <button key={l} onClick={() => setLanguage(l)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          language === l ? "bg-white text-black" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Creativity */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-xs text-white/40 font-medium">Creativity</p>
                    <p className="text-xs text-white/40">
                      {temperature <= 0.4 ? "Safe" : temperature <= 0.7 ? "Balanced" : "Wild"} ({temperature.toFixed(1)})
                    </p>
                  </div>
                  <input type="range" min={0.1} max={1.0} step={0.1} value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-purple-400" />
                </div>
              </div>
            )}

            {/* Generate */}
            <button onClick={() => generate()} disabled={!input.trim()}
              className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl shadow-purple-500/25 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Writing... (tap to cancel)</>
              ) : (
                <><Wand2 size={17} />Generate Lyrics</>
              )}
            </button>

            {error && <p className="text-sm text-red-300 bg-red-500/10 rounded-2xl px-4 py-3 text-center">{error}</p>}
          </div>
        )}

        {/* ── Output ── */}
        <LyricsOutput streaming={streaming} song={song} isLoading={isLoading} />

        {/* Actions below output */}
        {song && !isLoading && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all">
              <RefreshCw size={13} /> New song
            </button>

            <ExportButton song={song} filename="drifty-lyrics" />

            {auth.user ? (
              <button onClick={saveSong} disabled={saving || saveSuccess}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                  saveSuccess
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saveSuccess ? "Saved!" : "Save"}
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-sm transition-all">
                <Save size={13} /> Sign in to save
              </button>
            )}
          </div>
        )}

        {/* Refine */}
        {song && !isLoading && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-5 space-y-3">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-widest">Refine this draft</p>
            <div className="flex gap-2">
              <input value={refinement} onChange={(e) => setRefinement(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && refinement.trim() && generate({ refine: refinement })}
                placeholder='"Make it darker" · "Shorter hook" · "More aggressive"'
                className="flex-1 bg-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-colors" />
              <button onClick={() => refinement.trim() && generate({ refine: refinement })} disabled={!refinement.trim()}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 rounded-2xl text-sm font-bold text-white transition-colors">
                Go
              </button>
            </div>
            {conversationHistory.length > 0 && (
              <p className="text-[10px] text-white/20">{Math.floor(conversationHistory.length / 2)} refinement(s) this session</p>
            )}
          </div>
        )}

        <RevisionHistory history={revisions} onRestore={(rev) => {
          setInput(rev.request.input); setMode(rev.request.mode);
          setArtistStyles(rev.request.artistStyles); setMoods(rev.request.moods);
          setSong(rev.result); setConversationHistory([]);
        }} />

        {auth.user && (
          <SongLibrary userId={auth.user.id}
            onLoad={(s, i) => { setSong(s); setInput(i); setConversationHistory([]); }}
            refreshTrigger={libRefresh} />
        )}
      </main>
    </div>
  );
}
