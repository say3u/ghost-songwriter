"use client";

import { useState, useCallback, useRef } from "react";
import { Mic2, Music2, Wand2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import MoodBoard from "./MoodBoard";
import StyleSelector from "./StyleSelector";
import LyricsOutput from "./LyricsOutput";
import RevisionHistory from "./RevisionHistory";
import ExportButton from "./ExportButton";
import type {
  GenerationRequest,
  GeneratedSong,
  Revision,
  RhymeScheme,
  Language,
  Message,
} from "@/types";

const RHYME_SCHEMES: { value: RhymeScheme; label: string; desc: string }[] = [
  { value: "AABB", label: "AABB", desc: "Couplets" },
  { value: "ABAB", label: "ABAB", desc: "Alternating" },
  { value: "ABCB", label: "ABCB", desc: "Ballad" },
  { value: "free", label: "Free", desc: "No scheme" },
];

const LANGUAGES: Language[] = ["English", "Spanish", "French", "Portuguese", "German"];

export default function SongwriterApp() {
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

  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (opts: { refine?: string } = {}) => {
      if (!input.trim() && !opts.refine) return;
      if (isLoading) {
        abortRef.current?.abort();
        return;
      }

      setIsLoading(true);
      setError("");
      setStreaming("");
      setSong(null);

      abortRef.current = new AbortController();

      const req: GenerationRequest & { refinement?: string } = {
        mode,
        input,
        artistStyles,
        moods,
        rhymeScheme,
        language,
        temperature,
        fewShotExamples,
        conversationHistory,
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

        // Parse the completed JSON
        const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid response format");
        const parsed: GeneratedSong = JSON.parse(jsonMatch[0]);
        setSong(parsed);

        // Build new conversation history for iterative refinement
        const userMsg = opts.refine
          ? `Refine: ${opts.refine}`
          : req.input;
        const newHistory: Message[] = [
          ...conversationHistory,
          { role: "user", content: userMsg },
          { role: "assistant", content: accumulated },
        ];
        setConversationHistory(newHistory);

        // Save to revision history
        const revision: Revision = {
          id: Date.now().toString(),
          timestamp: new Date(),
          request: req,
          result: parsed,
        };
        setRevisions((prev) => [revision, ...prev].slice(0, 20));
        setRefinement("");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Something went wrong. Check your API key and try again.");
        }
      } finally {
        setIsLoading(false);
        setStreaming("");
      }
    },
    [
      input, mode, artistStyles, moods, rhymeScheme, language,
      temperature, fewShotExamples, conversationHistory, isLoading,
    ]
  );

  const restoreRevision = (rev: Revision) => {
    setInput(rev.request.input);
    setMode(rev.request.mode);
    setArtistStyles(rev.request.artistStyles);
    setMoods(rev.request.moods);
    setRhymeScheme(rev.request.rhymeScheme);
    setLanguage(rev.request.language);
    setTemperature(rev.request.temperature);
    setSong(rev.result);
    setConversationHistory([]);
  };

  const reset = () => {
    setSong(null);
    setConversationHistory([]);
    setStreaming("");
    setError("");
    setRefinement("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Mic2 size={16} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">GhostWriter AI</h1>
              <p className="text-xs text-zinc-500">AI-powered songwriting assistant</p>
            </div>
          </div>
          {song && (
            <div className="flex items-center gap-2">
              <ExportButton song={song} filename="lyrics" />
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <RefreshCw size={14} />
                New Song
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8">
        {/* Left panel — inputs */}
        <div className="space-y-5">
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
            {(
              [
                { value: "lyrics-from-idea", label: "Idea → Lyrics", icon: <Wand2 size={14} /> },
                { value: "lyrics-from-beat", label: "Beat → Lyrics", icon: <Music2 size={14} /> },
              ] as const
            ).map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  mode === m.value
                    ? "bg-violet-700 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* Main input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
              {mode === "lyrics-from-idea"
                ? "Your idea, concept, or lyric snippet"
                : "Describe the beat or musical vibe"}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === "lyrics-from-idea"
                  ? "e.g. feeling lost after moving to a new city, late nights, neon lights..."
                  : "e.g. dark trap beat, 140 BPM, heavy 808s, minor key, eerie piano loop..."
              }
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-600 resize-none"
            />
          </div>

          <StyleSelector selected={artistStyles} onChange={setArtistStyles} />
          <MoodBoard selected={moods} onChange={setMoods} />

          {/* Rhyme scheme */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
              Rhyme Scheme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {RHYME_SCHEMES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setRhymeScheme(s.value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    rhymeScheme === s.value
                      ? "bg-violet-700 border-violet-600 text-white"
                      : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  <span className="block font-mono">{s.label}</span>
                  <span className="block text-[10px] opacity-60">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-1">
              {/* Language */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                  Language
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        language === l
                          ? "bg-violet-700 border-violet-600 text-white"
                          : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creativity slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                    Creativity
                  </label>
                  <span className="text-xs text-zinc-500">
                    {temperature <= 0.3
                      ? "Conservative"
                      : temperature <= 0.6
                      ? "Balanced"
                      : temperature <= 0.8
                      ? "Creative"
                      : "Wild"}
                    {" "}({temperature.toFixed(1)})
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                  <span>Safe</span>
                  <span>Experimental</span>
                </div>
              </div>

              {/* Few-shot examples */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                  Your Voice (paste 2–3 of your own lines)
                </label>
                <textarea
                  value={fewShotExamples}
                  onChange={(e) => setFewShotExamples(e.target.value)}
                  placeholder="Paste a few lines in your own writing style so the AI can match your voice..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-600 resize-none"
                />
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={() => generate()}
            disabled={!input.trim()}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating... (click to cancel)
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Generate Lyrics
              </>
            )}
          </button>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Right panel — output */}
        <div className="space-y-4">
          <LyricsOutput streaming={streaming} song={song} isLoading={isLoading} />

          {/* Iterative refinement */}
          {song && !isLoading && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 space-y-3">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Refine This Draft
              </label>
              <div className="flex gap-2">
                <input
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && refinement.trim() && generate({ refine: refinement })
                  }
                  placeholder='e.g. "make the chorus darker", "shorter bridge", "more aggressive"'
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-600"
                />
                <button
                  onClick={() => refinement.trim() && generate({ refine: refinement })}
                  disabled={!refinement.trim()}
                  className="px-4 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors"
                >
                  Refine
                </button>
              </div>
              {conversationHistory.length > 0 && (
                <p className="text-[11px] text-zinc-600">
                  {Math.floor(conversationHistory.length / 2)} refinement(s) in this session
                </p>
              )}
            </div>
          )}

          <RevisionHistory history={revisions} onRestore={restoreRevision} />
        </div>
      </main>
    </div>
  );
}
