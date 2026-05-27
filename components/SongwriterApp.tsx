"use client";

import { useState, useCallback, useRef } from "react";
import { Mic2, Music2, Wand2, RefreshCw, ChevronDown, ChevronUp, Save, LogOut, User, Loader2 } from "lucide-react";
import MoodBoard from "./MoodBoard";
import StyleSelector from "./StyleSelector";
import LyricsOutput from "./LyricsOutput";
import RevisionHistory from "./RevisionHistory";
import ExportButton from "./ExportButton";
import VoiceInput from "./VoiceInput";
import AuthModal from "./AuthModal";
import SongLibrary from "./SongLibrary";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { GenerationRequest, GeneratedSong, Revision, RhymeScheme, Language, Message, VoiceMode } from "@/types";

const RHYME_SCHEMES: { value: RhymeScheme; label: string; desc: string }[] = [
  { value: "AABB", label: "AABB", desc: "Couplets"    },
  { value: "ABAB", label: "ABAB", desc: "Alternating" },
  { value: "ABCB", label: "ABCB", desc: "Ballad"      },
  { value: "free", label: "Free", desc: "No scheme"   },
];

const LANGUAGES: Language[] = ["English", "Spanish", "French", "Portuguese", "German"];

export default function SongwriterApp() {
  const auth = useAuth();

  const [mode, setMode] = useState<"lyrics-from-idea" | "lyrics-from-beat">("lyrics-from-idea");
  const [input, setInput] = useState("");
  const [artistStyles, setArtistStyles] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [rhymeScheme, setRhymeScheme] = useState<RhymeScheme>("AABB");
  const [language, setLanguage] = useState<Language>("English");
  const [temperature, setTemperature] = useState(0.7);
  const [fewShotExamples, setFewShotExamples] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [streaming, setStreaming] = useState("");
  const [song, setSong] = useState<GeneratedSong | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [refinement, setRefinement] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [voiceMode, setVoiceMode] = useState<VoiceMode | undefined>(undefined);

  const [showAuth, setShowAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [libRefresh, setLibRefresh] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const handleVoiceResult = useCallback((text: string, vMode: VoiceMode) => {
    setInput(text);
    setVoiceMode(vMode === "idea" ? undefined : vMode);
  }, []);

  const generate = useCallback(async (opts: { refine?: string; overrideVoiceMode?: VoiceMode } = {}) => {
    if (!input.trim() && !opts.refine) return;
    if (isLoading) { abortRef.current?.abort(); return; }

    setIsLoading(true); setError(""); setStreaming(""); setSong(null); setSaveSuccess(false);
    abortRef.current = new AbortController();

    const activeVoiceMode = opts.overrideVoiceMode ?? voiceMode;
    const req: GenerationRequest & { refinement?: string } = {
      mode, input, artistStyles, moods, rhymeScheme, language,
      temperature, fewShotExamples, conversationHistory,
      voiceMode: activeVoiceMode,
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

      const userMsg = opts.refine ? `Refine: ${opts.refine}` : req.input;
      setConversationHistory((prev) => [...prev, { role: "user", content: userMsg }, { role: "assistant", content: accumulated }]);
      setRevisions((prev) => [{ id: Date.now().toString(), timestamp: new Date(), request: req, result: parsed }, ...prev].slice(0, 20));
      setRefinement("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("Something went wrong. Check your API key and try again.");
    } finally {
      setIsLoading(false); setStreaming("");
    }
  }, [input, mode, artistStyles, moods, rhymeScheme, language, temperature, fewShotExamples, conversationHistory, isLoading, voiceMode]);

  const saveSong = async () => {
    if (!song || !auth.user) return;
    setSaving(true);
    const { error: dbErr } = await supabase.from("songs").insert({
      user_id: auth.user.id, input, generation_mode: mode,
      artist_styles: artistStyles, moods, result: song as unknown as Record<string, unknown>,
      title: song.sections[0]?.content?.split("\n")[0]?.slice(0, 60) ?? null,
    });
    setSaving(false);
    if (!dbErr) { setSaveSuccess(true); setLibRefresh((n) => n + 1); setTimeout(() => setSaveSuccess(false), 3000); }
  };

  const loadFromLibrary = (loadedSong: GeneratedSong, loadedInput: string) => {
    setSong(loadedSong); setInput(loadedInput); setConversationHistory([]); setSaveSuccess(false);
  };

  const restoreRevision = (rev: Revision) => {
    setInput(rev.request.input); setMode(rev.request.mode);
    setArtistStyles(rev.request.artistStyles); setMoods(rev.request.moods);
    setRhymeScheme(rev.request.rhymeScheme); setLanguage(rev.request.language);
    setTemperature(rev.request.temperature); setSong(rev.result); setConversationHistory([]);
  };

  const reset = () => { setSong(null); setConversationHistory([]); setStreaming(""); setError(""); setRefinement(""); setSaveSuccess(false); };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} auth={auth} />}

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-900 bg-[#0a0a0a]/95 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
              <Mic2 size={17} className="text-black" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-[0.2em] uppercase text-white">Drifty Studio</h1>
              <p className="text-[10px] text-zinc-600 tracking-widest uppercase">AI Songwriting</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {song && <ExportButton song={song} filename="lyrics" />}
            {song && (
              <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                <RefreshCw size={12} /> New song
              </button>
            )}
            {!auth.loading && (auth.user ? (
              <div className="flex items-center gap-2 ml-2 pl-3 border-l border-zinc-800">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                  <User size={12} className="text-green-500" />
                  <span className="max-w-[110px] truncate">{auth.user.email}</span>
                </div>
                <button onClick={auth.signOut} title="Sign out" className="p-2 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} className="ml-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-black text-xs font-bold tracking-wide transition-colors">
                Sign In
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10">
        {/* ── Left panel ── */}
        <div className="space-y-7">

          {/* Mode toggle */}
          <div className="flex rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50 p-1 gap-1">
            {([
              { value: "lyrics-from-idea", label: "Idea → Lyrics", icon: <Wand2 size={13} /> },
              { value: "lyrics-from-beat", label: "Beat → Lyrics", icon: <Music2 size={13} /> },
            ] as const).map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                  mode === m.value ? "bg-green-500 text-black shadow-sm" : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {m.icon}{m.label}
              </button>
            ))}
          </div>

          {/* Main input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                {mode === "lyrics-from-idea" ? "Your idea or lyric concept" : "Describe the beat"}
              </label>
              <VoiceInput onResult={handleVoiceResult} disabled={isLoading} />
            </div>
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setVoiceMode(undefined); }}
              placeholder={
                mode === "lyrics-from-idea"
                  ? "e.g. feeling lost after moving to a new city, late nights, neon lights..."
                  : "e.g. dark trap, 140 BPM, heavy 808s, eerie piano loop..."
              }
              rows={4}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-3.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 resize-none transition-colors leading-relaxed"
            />
            {voiceMode && input && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
                  {voiceMode === "polish" ? "🎤 Polishing your sung lyrics" : "🎵 Writing lyrics for your melody"}
                </span>
                <button onClick={() => setVoiceMode(undefined)} className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">clear</button>
              </div>
            )}
          </div>

          <StyleSelector selected={artistStyles} onChange={setArtistStyles} />
          <MoodBoard selected={moods} onChange={setMoods} />

          {/* Rhyme scheme */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Rhyme Scheme</label>
            <div className="grid grid-cols-4 gap-2">
              {RHYME_SCHEMES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setRhymeScheme(s.value)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    rhymeScheme === s.value
                      ? "bg-green-500 border-green-500 text-black"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  <span className="block font-mono">{s.label}</span>
                  <span className="block text-[9px] mt-0.5 opacity-60 font-normal">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-5 pt-1 border-t border-zinc-800/60">
              {/* Language */}
              <div className="pt-5">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Language</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        language === l ? "bg-green-500 border-green-500 text-black" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creativity slider */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Creativity</label>
                  <span className="text-xs text-zinc-500">
                    {temperature <= 0.3 ? "Conservative" : temperature <= 0.6 ? "Balanced" : temperature <= 0.8 ? "Creative" : "Wild"}
                    <span className="text-zinc-700 ml-1">({temperature.toFixed(1)})</span>
                  </span>
                </div>
                <input type="range" min={0.1} max={1.0} step={0.1} value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-700 mt-1.5">
                  <span>Safe</span><span>Experimental</span>
                </div>
              </div>

              {/* Few-shot examples */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  Your Voice — paste 2–3 of your own lines
                </label>
                <textarea
                  value={fewShotExamples}
                  onChange={(e) => setFewShotExamples(e.target.value)}
                  placeholder="Paste a few lines in your own writing style so the AI can match your voice..."
                  rows={3}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={() => generate()}
            disabled={!input.trim()}
            className="w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Writing... (tap to cancel)</>
            ) : (
              <><Wand2 size={15} />Generate Lyrics</>
            )}
          </button>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-2xl px-4 py-3">{error}</p>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="space-y-4">
          <LyricsOutput streaming={streaming} song={song} isLoading={isLoading} />

          {/* Save */}
          {song && !isLoading && (
            <div className="flex items-center gap-2">
              {auth.user ? (
                <button
                  onClick={saveSong}
                  disabled={saving || saveSuccess}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    saveSuccess
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {saveSuccess ? "Saved to library!" : saving ? "Saving..." : "Save Song"}
                </button>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  <Save size={13} />
                  Sign in to save
                </button>
              )}
            </div>
          )}

          {/* Refine */}
          {song && !isLoading && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Refine This Draft</label>
              <div className="flex gap-2">
                <input
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && refinement.trim() && generate({ refine: refinement })}
                  placeholder='"make the chorus darker" · "shorter bridge" · "more aggressive"'
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                />
                <button
                  onClick={() => refinement.trim() && generate({ refine: refinement })}
                  disabled={!refinement.trim()}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-xl text-xs font-bold text-zinc-300 transition-colors"
                >
                  Refine
                </button>
              </div>
              {conversationHistory.length > 0 && (
                <p className="text-[10px] text-zinc-700">
                  {Math.floor(conversationHistory.length / 2)} refinement(s) this session
                </p>
              )}
            </div>
          )}

          <RevisionHistory history={revisions} onRestore={restoreRevision} />

          {auth.user && (
            <SongLibrary userId={auth.user.id} onLoad={loadFromLibrary} refreshTrigger={libRefresh} />
          )}
        </div>
      </main>
    </div>
  );
}
