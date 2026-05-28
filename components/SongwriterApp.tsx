"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wand2, RefreshCw, Save, LogOut, ChevronDown, ChevronUp, Loader2, Music2, Lightbulb, FileText, Mic2, Share2, BarChart2, Zap } from "lucide-react";
import { FREE_LIMIT } from "@/lib/stripe";
import type { Subscription } from "@/lib/supabase";
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
  { value: "lyrics-from-idea", label: "Idea → Lyrics",  desc: "Turn a concept into a full song",       icon: Lightbulb, color: "#FF6D3B" },
  { value: "lyrics-from-beat", label: "Beat → Lyrics",  desc: "Write lyrics that fit your beat",       icon: Music2,    color: "#E8437A" },
  { value: "expand-lyrics",    label: "Expand Lyrics",  desc: "Complete and polish your rough draft",  icon: FileText,  color: "#9D5CF5" },
  { value: "lyrics-to-beat",   label: "Lyrics → Beat",  desc: "Get a beat brief for your lyrics",     icon: Mic2,      color: "#3D8EF0" },
] as const;

type Mode = typeof MODES[number]["value"];

function getModeColor(m: Mode): string {
  return MODES.find((x) => x.value === m)?.color ?? "#ffffff";
}

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
  const [savedSongId, setSavedSongId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [libRefresh, setLibRefresh] = useState(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [songCount, setSongCount] = useState(0);
  const [upgrading, setUpgrading] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);

  const searchParams = useSearchParams();
  const isPro = subscription?.status === "pro";

  const abortRef = useRef<AbortController | null>(null);
  const accentColor = getModeColor(mode);

  const handleLyricEdit = useCallback((sectionIndex: number, newContent: string) => {
    setSong(prev => {
      if (!prev) return prev;
      const sections = [...prev.sections];
      sections[sectionIndex] = { ...sections[sectionIndex], content: newContent };
      return { ...prev, sections };
    });
  }, []);

  // Load subscription + song count when user logs in
  useEffect(() => {
    if (!auth.user) { setSubscription(null); setSongCount(0); return; }
    supabase.from("subscriptions").select("*").eq("user_id", auth.user.id).single()
      .then(({ data }) => setSubscription(data as Subscription | null));
    supabase.from("songs").select("*", { count: "exact", head: true }).eq("user_id", auth.user.id)
      .then(({ count }) => setSongCount(count ?? 0));
  }, [auth.user]);

  // Show success banner after Stripe redirect
  useEffect(() => {
    if (searchParams?.get("upgraded") === "true") setShowUpgradeBanner(true);
  }, [searchParams]);

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
      // Pass auth token for free-tier enforcement
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers,
        body: JSON.stringify(req),
        signal: abortRef.current.signal,
      });
      if (res.status === 402) {
        const { error: limitErr } = await res.json();
        setError(limitErr ?? "Generation limit reached.");
        return;
      }
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
    const { data, error: dbErr } = await supabase.from("songs").insert({
      user_id: auth.user.id, input, generation_mode: mode,
      artist_styles: artistStyles, moods,
      result: song as unknown as Record<string, unknown>,
      title: song.sections[0]?.content?.split("\n")[0]?.slice(0, 60) ?? null,
    }).select("id").single();
    setSaving(false);
    if (!dbErr && data) {
      setSavedSongId(data.id);
      setSongCount((n) => n + 1);
      setSaveSuccess(true);
      setLibRefresh((n) => n + 1);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const createShare = async () => {
    if (!savedSongId || !auth.user) return;
    setSharing(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ songId: savedSongId }),
    });
    const { shareId, error: shareErr } = await res.json();
    setSharing(false);
    if (shareErr || !shareId) return;
    const url = `${window.location.origin}/share/${shareId}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  };

  const startUpgrade = async () => {
    if (!auth.user) { setShowAuth(true); return; }
    setUpgrading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: auth.user.id, userEmail: auth.user.email }),
    });
    const { url, error: checkoutErr } = await res.json();
    setUpgrading(false);
    if (url) window.location.href = url;
    else console.error(checkoutErr);
  };

  const reset = () => {
    setSong(null); setConversationHistory([]); setStreaming("");
    setError(""); setRefinement(""); setSaveSuccess(false); setInput("");
    setBeatContext(""); setSavedSongId(null); setShareUrl("");
  };

  const placeholder: Record<Mode, string> = {
    "lyrics-from-idea": "What's your song about? Late nights, heartbreak, a new chapter...",
    "lyrics-from-beat": "Describe the beat — dark trap, 140 BPM, heavy 808s, eerie piano...",
    "expand-lyrics":    "Paste your rough or partial lyrics here...",
    "lyrics-to-beat":   "Paste your finished lyrics here...",
  };

  const inputLabel: Record<Mode, string> = {
    "lyrics-from-idea": "Your idea",
    "lyrics-from-beat": "Beat description",
    "expand-lyrics":    "Your lyrics",
    "lyrics-to-beat":   "Your lyrics",
  };

  const showBeatUpload = mode === "lyrics-from-beat";
  const showVoice = true;
  const showMoods = mode !== "lyrics-to-beat";
  const showAdvancedSection = mode !== "lyrics-to-beat";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0a0a0a" }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} auth={auth} />}

      {/* Header */}
      <header className="flex-none h-14 flex items-center justify-between px-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" className="font-display font-bold text-white text-sm tracking-tight hover:opacity-70 transition-opacity">
          drifty studio
        </Link>
        <div className="flex items-center gap-3">
          {!auth.loading && auth.user && (
            <>
              <Link href="/studio/analytics" className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
                <BarChart2 size={13} /> Analytics
              </Link>
              {!isPro && (
                <button
                  onClick={startUpgrade}
                  disabled={upgrading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "rgba(157,92,245,0.15)", color: "#9D5CF5", border: "1px solid rgba(157,92,245,0.3)" }}
                >
                  <Zap size={11} /> {upgrading ? "..." : "Upgrade"}
                </button>
              )}
              <button onClick={auth.signOut} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
                <LogOut size={12} /> Sign out
              </button>
            </>
          )}
          {!auth.loading && !auth.user && (
            <button onClick={() => setShowAuth(true)} className="text-xs font-medium transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel */}
        <div className="w-[340px] flex-none flex flex-col overflow-hidden" style={{ background: "#0f0f0f", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Mode selector */}
          <div className="flex-none p-3 space-y-0.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.value;
              return (
                <button key={m.value}
                  onClick={() => { setMode(m.value); setSong(null); setStreaming(""); setError(""); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={active ? {
                    background: `${m.color}18`,
                    borderLeft: `3px solid ${m.color}`,
                    paddingLeft: "9px",
                  } : { borderLeft: "3px solid transparent", paddingLeft: "9px" }}>
                  <Icon size={14} style={{ color: active ? m.color : "rgba(255,255,255,0.25)" }} />
                  <div>
                    <p className="font-display text-xs font-semibold" style={{ color: active ? "#fff" : "rgba(255,255,255,0.55)" }}>{m.label}</p>
                    <p className="text-[10px] leading-tight" style={{ color: active ? `${m.color}99` : "rgba(255,255,255,0.2)" }}>{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inputs */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {showBeatUpload && (
              <BeatUpload onAnalyzed={(desc) => setBeatContext(desc)} onClear={() => setBeatContext("")} accentColor={accentColor} />
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                {inputLabel[mode]}
              </label>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setVoiceMode(undefined); }}
                placeholder={placeholder[mode]}
                rows={mode === "expand-lyrics" || mode === "lyrics-to-beat" ? 9 : 5}
                className="w-full rounded-xl px-3.5 py-3 text-sm text-white resize-none leading-relaxed transition-all focus:outline-none"
                style={{
                  background: "#161616",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#fff",
                  caretColor: accentColor,
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = `${accentColor}66`}
                onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
              />
              {showVoice && (
                <div className="mt-2 flex items-center gap-2">
                  <VoiceInput onResult={handleVoiceResult} disabled={isLoading} />
                  {voiceMode && input && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: accentColor }}>{voiceMode === "polish" ? "Polishing vocals" : "Matching melody"}</span>
                      <button onClick={() => setVoiceMode(undefined)} className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>✕</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {showMoods && <MoodBoard selected={moods} onChange={setMoods} accentColor={accentColor} />}
            <StyleSelector selected={artistStyles} onChange={setArtistStyles} accentColor={accentColor} />

            {showAdvancedSection && (
              <>
                <button onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.25)" }}>
                  {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  More options
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>Rhyme scheme</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {RHYME_SCHEMES.map((s) => (
                          <button key={s.value} onClick={() => setRhymeScheme(s.value)}
                            className="py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={rhymeScheme === s.value
                              ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }
                              : { background: "#1a1a1a", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>Language</p>
                      <div className="flex flex-wrap gap-1.5">
                        {LANGUAGES.map((l) => (
                          <button key={l} onClick={() => setLanguage(l)}
                            className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                            style={language === l
                              ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }
                              : { background: "#1a1a1a", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>Creativity</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {temperature <= 0.4 ? "Safe" : temperature <= 0.7 ? "Balanced" : "Wild"} ({temperature.toFixed(1)})
                        </p>
                      </div>
                      <input type="range" min={0.1} max={1.0} step={0.1} value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full" style={{ accentColor }} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Generate */}
          <div className="flex-none p-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {auth.user && !isPro && songCount >= FREE_LIMIT - 3 && (
              <div className="flex items-center justify-between text-[10px] px-1">
                <span style={{ color: songCount >= FREE_LIMIT ? "#f87171" : "rgba(255,255,255,0.3)" }}>
                  {Math.max(FREE_LIMIT - songCount, 0)} free {FREE_LIMIT - songCount === 1 ? "song" : "songs"} left
                </span>
                <button onClick={startUpgrade} className="font-semibold" style={{ color: "#9D5CF5" }}>Upgrade →</button>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-400 rounded-lg px-3 py-2 text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </p>
            )}
            <button onClick={() => generate()} disabled={!input.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              style={{ background: input.trim() ? accentColor : "#333" }}>
              {isLoading
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Writing...</>
                : <><Wand2 size={14} />Generate</>}
            </button>
            {auth.user && (
              <SongLibrary
                userId={auth.user.id}
                onLoad={(s, i) => { setSong(s); setInput(i); setConversationHistory([]); }}
                refreshTrigger={libRefresh}
              />
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0a0a0a" }}>
          {showUpgradeBanner && (
            <div className="flex-none mx-8 mt-6 px-5 py-3 rounded-2xl flex items-center justify-between" style={{ background: "rgba(157,92,245,0.12)", border: "1px solid rgba(157,92,245,0.3)" }}>
              <p className="text-sm font-semibold" style={{ color: "#9D5CF5" }}>You&apos;re now on Pro — unlimited songs!</p>
              <button onClick={() => setShowUpgradeBanner(false)} className="text-xs" style={{ color: "rgba(157,92,245,0.6)" }}>✕</button>
            </div>
          )}
          {!song && !isLoading && !streaming ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-12">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}33` }}>
                {(() => { const m = MODES.find(m => m.value === mode); const Icon = m?.icon ?? Wand2; return <Icon size={22} style={{ color: accentColor }} />; })()}
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">
                {mode === "lyrics-from-idea" && "Turn your idea into a song"}
                {mode === "lyrics-from-beat" && "Write to your beat"}
                {mode === "expand-lyrics"    && "Expand your draft"}
                {mode === "lyrics-to-beat"   && "Design your beat"}
              </h2>
              <p className="text-sm max-w-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                {mode === "lyrics-from-idea" && "Describe a vibe, emotion, or story on the left and hit Generate."}
                {mode === "lyrics-from-beat" && "Describe your beat or upload an audio file. We'll write lyrics that fit."}
                {mode === "expand-lyrics"    && "Paste your rough or partial lyrics on the left. We'll complete them into a full song."}
                {mode === "lyrics-to-beat"   && "Paste your finished lyrics and get a full production brief — BPM, genre, instruments, and more."}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Lyrics output fills available space */}
              <div className="flex-1 min-h-0 px-6 pt-6">
                <LyricsOutput streaming={streaming} song={song} isLoading={isLoading} accentColor={accentColor} onEdit={handleLyricEdit} />
              </div>

              {/* Bottom action bar */}
              {song && !isLoading && (
                <div className="flex-none px-6 py-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={reset}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
                      style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <RefreshCw size={13} /> New
                    </button>
                    <ExportButton song={song} filename="drifty-lyrics" />
                    {auth.user ? (
                      <>
                        <button onClick={saveSong} disabled={saving || saveSuccess}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                          style={saveSuccess
                            ? { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
                            : { background: "#1a1a1a", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                          {saveSuccess ? "Saved!" : "Save"}
                        </button>
                        {savedSongId && (
                          <button onClick={createShare} disabled={sharing}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                            style={shareCopied
                              ? { background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
                              : { background: "#1a1a1a", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            {sharing ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
                            {shareCopied ? "Link copied!" : shareUrl ? "Copy link" : "Share"}
                          </button>
                        )}
                      </>
                    ) : (
                      <button onClick={() => setShowAuth(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
                        style={{ background: "#1a1a1a", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <Save size={13} /> Sign in to save
                      </button>
                    )}
                  </div>

                  {mode !== "lyrics-to-beat" && (
                    <div className="rounded-2xl p-4 space-y-3" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>Refine this draft</p>
                      <div className="flex gap-2">
                        <input value={refinement} onChange={(e) => setRefinement(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && refinement.trim() && generate({ refine: refinement })}
                          placeholder='"Make it darker" · "Shorter hook" · "More aggressive"'
                          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                          style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)", caretColor: accentColor }}
                          onFocus={(e) => e.currentTarget.style.borderColor = `${accentColor}55`}
                          onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                        />
                        <button onClick={() => refinement.trim() && generate({ refine: refinement })} disabled={!refinement.trim()}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-30"
                          style={{ background: accentColor }}>
                          Go
                        </button>
                      </div>
                      {conversationHistory.length > 0 && (
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{Math.floor(conversationHistory.length / 2)} refinement(s) this session</p>
                      )}
                    </div>
                  )}

                  <RevisionHistory history={revisions} onRestore={(rev) => {
                    setInput(rev.request.input); setMode(rev.request.mode as Mode);
                    setArtistStyles(rev.request.artistStyles); setMoods(rev.request.moods);
                    setSong(rev.result); setConversationHistory([]);
                  }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
