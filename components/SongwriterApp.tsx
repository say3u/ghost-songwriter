"use client";

import { useState, useCallback, useRef } from "react";
import { Wand2, RefreshCw, Save, LogOut, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import MoodBoard from "./MoodBoard";
import StyleSelector from "./StyleSelector";
import BeatUpload from "./BeatUpload";
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

  const [beatContext, setBeatContext] = useState<string>("");
  const [beatFilename, setBeatFilename] = useState<string>("");

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
    setBeatContext(""); setBeatFilename("");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} auth={auth} />}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <span className="text-sm font-bold tracking-tight text-gray-900">Drifty Studio</span>
        <div className="flex items-center gap-3">
          {!auth.loading && (auth.user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 hidden sm:block">{auth.user.email}</span>
              <button onClick={auth.signOut}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                <LogOut size={12} /> Sign out
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Hero */}
        {!song && !isLoading && (
          <div className="pb-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
              Turn your ideas into lyrics
            </h1>
            <p className="text-gray-400 text-sm">Describe a vibe, hum a melody, or paste an idea.</p>
          </div>
        )}

        {/* Form */}
        {!song && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">

            {/* Mode tabs */}
            <div className="flex border-b border-gray-200 -mx-6 px-6 gap-6">
              {([
                { value: "lyrics-from-idea", label: "Idea → Lyrics" },
                { value: "lyrics-from-beat", label: "Beat → Lyrics" },
              ] as const).map((m) => (
                <button key={m.value} onClick={() => setMode(m.value)}
                  className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    mode === m.value
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Beat upload */}
            {mode === "lyrics-from-beat" && (
              <BeatUpload
                onAnalyzed={(desc, name) => { setBeatContext(desc); setBeatFilename(name); }}
                onClear={() => { setBeatContext(""); setBeatFilename(""); }}
              />
            )}

            {/* Textarea */}
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
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <VoiceInput onResult={handleVoiceResult} disabled={isLoading} />
                {voiceMode && input && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {voiceMode === "polish" ? "Polishing vocals" : "Matching melody"}
                    </span>
                    <button onClick={() => setVoiceMode(undefined)} className="text-xs text-gray-300 hover:text-gray-500">✕</button>
                  </div>
                )}
              </div>
            </div>

            <MoodBoard selected={moods} onChange={setMoods} />
            <StyleSelector selected={artistStyles} onChange={setArtistStyles} />

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              More options
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Rhyme scheme</p>
                  <div className="flex gap-2">
                    {RHYME_SCHEMES.map((s) => (
                      <button key={s.value} onClick={() => setRhymeScheme(s.value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          rhymeScheme === s.value
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Language</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => (
                      <button key={l} onClick={() => setLanguage(l)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          language === l
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">Creativity</p>
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

            {/* Generate button */}
            <button onClick={() => generate()} disabled={!input.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Writing... (click to cancel)</>
              ) : (
                <><Wand2 size={15} />Generate Lyrics</>
              )}
            </button>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 text-center border border-red-100">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Output */}
        <LyricsOutput streaming={streaming} song={song} isLoading={isLoading} />

        {/* Actions */}
        {song && !isLoading && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={reset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all">
              <RefreshCw size={13} /> New song
            </button>

            <ExportButton song={song} filename="drifty-lyrics" />

            {auth.user ? (
              <button onClick={saveSong} disabled={saving || saveSuccess}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  saveSuccess
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
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
        )}

        {/* Refine */}
        {song && !isLoading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Refine this draft</p>
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
