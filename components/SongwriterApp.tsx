"use client";

import { useState, useCallback, useRef } from "react";
import { Wand2, RefreshCw, Save, LogOut, ChevronDown, ChevronUp, Loader2, Music2, Lightbulb, FileText, Mic2 } from "lucide-react";
import MoodBoard from "./MoodBoard";
import StyleSelector from "./StyleSelector";
import LyricsOutput from "./LyricsOutput";
import ExportButton from "./ExportButton";
import VoiceInput from "./VoiceInput";
import BeatUpload from "./BeatUpload";
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

const MODES = [
  { value: "lyrics-from-idea",  label: "Idea → Lyrics",   desc: "Turn a concept into a full song",         icon: Lightbulb },
  { value: "lyrics-from-beat",  label: "Beat → Lyrics",   desc: "Write lyrics that fit your beat",         icon: Music2 },
  { value: "expand-lyrics",     label: "Expand Lyrics",   desc: "Complete and polish your rough draft",    icon: FileText },
  { value: "lyrics-to-beat",    label: "Lyrics → Beat",   desc: "Get a beat brief for your lyrics",        icon: Mic2 },
] as const;

type Mode = typeof MODES[number]["value"];

export default function SongwriterApp() {
  const auth = useAuth();

  const [mode, setMode] = useState<Mode>("lyrics-from-idea");
  const [input, setInput] = useState("");
  const [artistStyles, setArtistStyles] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [rhymeScheme, setRhymeScheme] = useState<RhymeScheme>("AABB");
  const [language, setLanguage] = useState<Language>("English");
  const [temperature, setTemperature] = useState(0.7);
  const [voiceMode, setVoiceMode] = useState<VoiceMode | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [beatContext, setBeatContext] = useState("");

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

    const req: GenerationRequest & { refinement?: string; beatContext?: string } = {
      mode, input, artistStyles, moods, rhymeScheme, language,
      temperature, conversationHistory, voiceMode,
      ...(opts.refine ? { refinement: opts.refine } : {}),
      ...(beatContext ? { beatContext } : {}),
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
  }, [input, mode, artistStyles, moods, rhymeScheme, language, temperature, conversationHistory, isLoading, voiceMode, beatContext]);

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
    setBeatContext("");
  };

  const placeholder: Record<Mode, string> = {
    "lyrics-from-idea": "What's your song about? Late nights, heartbreak, a new chapter...",
    "lyrics-from-beat": "Describe the beat — dark trap, 140 BPM, heavy 808s, eerie piano...",
    "expand-lyrics":    "Paste your rough or partial lyrics here — we'll complete the song...",
    "lyrics-to-beat":   "Paste your finished lyrics here — we'll design the perfect beat...",
  };

  const inputLabel: Record<Mode, string> = {
    "lyrics-from-idea": "Your idea",
    "lyrics-from-beat": "Beat description",
    "expand-lyrics":    "Your lyrics",
    "lyrics-to-beat":   "Your lyrics",
  };

  const showBeatUpload = mode === "lyrics-from-beat";
  const showVoice = mode === "lyrics-from-idea" || mode === "lyrics-from-beat";
  const showMoods = mode !== "lyrics-to-beat";
  const showStyle = true;
  const showAdvancedSection = mode !== "lyrics-to-beat";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} auth={auth} />}

      {/* ── Header ── */}
      <header className="flex-none h-14 border-b border-gray-100 flex items-center justify-between px-6">
        <span className="font-semibold text-gray-900 text-sm tracking-tight">Drifty Studio</span>
        <div className="flex items-center gap-4">
          {!auth.loading && (auth.user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 hidden sm:block">{auth.user.email}</span>
              <button onClick={auth.signOut}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-900 transition-colors">
                <LogOut size={12} /> Sign out
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Sign in
            </button>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-[360px] flex-none border-r border-gray-100 flex flex-col overflow-hidden">

          {/* Mode selector */}
          <div className="flex-none p-4 border-b border-gray-100 space-y-1">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.value;
              return (
                <button key={m.value} onClick={() => { setMode(m.value); setSong(null); setStreaming(""); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}>
                  <Icon size={14} className={active ? "text-white" : "text-gray-400"} />
                  <div>
                    <p className={`text-xs font-semibold ${active ? "text-white" : "text-gray-700"}`}>{m.label}</p>
                    <p className={`text-[10px] leading-tight ${active ? "text-white/60" : "text-gray-400"}`}>{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Form inputs */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {showBeatUpload && (
              <BeatUpload
                onAnalyzed={(desc) => setBeatContext(desc)}
                onClear={() => setBeatContext("")}
              />
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                {inputLabel[mode]}
              </label>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setVoiceMode(undefined); }}
                placeholder={placeholder[mode]}
                rows={mode === "expand-lyrics" || mode === "lyrics-to-beat" ? 8 : 5}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors resize-none leading-relaxed"
              />
              {showVoice && (
                <div className="mt-2 flex items-center gap-2">
                  <VoiceInput onResult={handleVoiceResult} disabled={isLoading} />
                  {voiceMode && input && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">
                        {voiceMode === "polish" ? "Polishing vocals" : "Matching melody"}
                      </span>
                      <button onClick={() => setVoiceMode(undefined)} className="text-xs text-gray-300 hover:text-gray-500">✕</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {showMoods && <MoodBoard selected={moods} onChange={setMoods} />}
            {showStyle && <StyleSelector selected={artistStyles} onChange={setArtistStyles} />}

            {showAdvancedSection && (
              <>
                <button onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  More options
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Rhyme scheme</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {RHYME_SCHEMES.map((s) => (
                          <button key={s.value} onClick={() => setRhymeScheme(s.value)}
                            className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                              rhymeScheme === s.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Language</p>
                      <div className="flex flex-wrap gap-1.5">
                        {LANGUAGES.map((l) => (
                          <button key={l} onClick={() => setLanguage(l)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                              language === l ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Creativity</p>
                        <p className="text-xs text-gray-400">
                          {temperature <= 0.4 ? "Safe" : temperature <= 0.7 ? "Balanced" : "Wild"} ({temperature.toFixed(1)})
                        </p>
                      </div>
                      <input type="range" min={0.1} max={1.0} step={0.1} value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full accent-gray-900" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Generate button */}
          <div className="flex-none p-4 border-t border-gray-100">
            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3 text-center border border-red-100">
                {error}
              </p>
            )}
            <button onClick={() => generate()} disabled={!input.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Writing... (click to stop)</>
              ) : (
                <><Wand2 size={14} />Generate</>
              )}
            </button>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 overflow-y-auto bg-[#fafafa]">
          {!song && !isLoading && !streaming ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center px-12">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                {(() => { const m = MODES.find(m => m.value === mode); const Icon = m?.icon ?? Wand2; return <Icon size={20} className="text-gray-400" />; })()}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {mode === "lyrics-from-idea" && "Turn your idea into a song"}
                {mode === "lyrics-from-beat" && "Write to your beat"}
                {mode === "expand-lyrics"    && "Expand your draft"}
                {mode === "lyrics-to-beat"   && "Design your beat"}
              </h2>
              <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                {mode === "lyrics-from-idea" && "Describe a vibe, emotion, or story on the left and hit Generate."}
                {mode === "lyrics-from-beat" && "Describe your beat or upload an audio file. We'll write lyrics that fit."}
                {mode === "expand-lyrics"    && "Paste your rough or partial lyrics on the left. We'll complete them into a full song."}
                {mode === "lyrics-to-beat"   && "Paste your finished lyrics and get a full production brief — BPM, genre, instruments, and more."}
              </p>
            </div>
          ) : (
            <div className="p-8 space-y-5 max-w-3xl">
              <LyricsOutput streaming={streaming} song={song} isLoading={isLoading} />

              {song && !isLoading && (
                <>
                  {/* Action bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={reset}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all">
                      <RefreshCw size={13} /> New
                    </button>
                    <ExportButton song={song} filename="drifty-lyrics" />
                    {auth.user ? (
                      <button onClick={saveSong} disabled={saving || saveSuccess}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          saveSuccess
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}>
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        {saveSuccess ? "Saved!" : "Save"}
                      </button>
                    ) : (
                      <button onClick={() => setShowAuth(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-700 text-sm transition-all">
                        <Save size={13} /> Sign in to save
                      </button>
                    )}
                  </div>

                  {/* Refine */}
                  {mode !== "lyrics-to-beat" && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Refine this draft</p>
                      <div className="flex gap-2">
                        <input value={refinement} onChange={(e) => setRefinement(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && refinement.trim() && generate({ refine: refinement })}
                          placeholder='"Make it darker" · "Shorter hook" · "More aggressive"'
                          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors" />
                        <button onClick={() => refinement.trim() && generate({ refine: refinement })} disabled={!refinement.trim()}
                          className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-30 rounded-xl text-sm font-semibold text-white transition-colors">
                          Go
                        </button>
                      </div>
                      {conversationHistory.length > 0 && (
                        <p className="text-[10px] text-gray-300">{Math.floor(conversationHistory.length / 2)} refinement(s) this session</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <RevisionHistory history={revisions} onRestore={(rev) => {
                setInput(rev.request.input); setMode(rev.request.mode as Mode);
                setArtistStyles(rev.request.artistStyles); setMoods(rev.request.moods);
                setSong(rev.result); setConversationHistory([]);
              }} />

              {auth.user && (
                <SongLibrary userId={auth.user.id}
                  onLoad={(s, i) => { setSong(s); setInput(i); setConversationHistory([]); }}
                  refreshTrigger={libRefresh} />
              )}
            </div>
          )}

          {/* Library always visible when signed in and no output */}
          {!song && !isLoading && !streaming && auth.user && (
            <div className="p-8 pt-0 max-w-3xl">
              <SongLibrary userId={auth.user.id}
                onLoad={(s, i) => { setSong(s); setInput(i); setConversationHistory([]); }}
                refreshTrigger={libRefresh} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
