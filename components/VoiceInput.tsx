"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import type { VoiceMode } from "@/types";

type Props = {
  onResult: (text: string, mode: VoiceMode) => void;
  disabled?: boolean;
};

type RecordingState = "idle" | "selecting" | "recording" | "processing";

const MODES: { value: VoiceMode; label: string; desc: string; emoji: string }[] = [
  { value: "idea",   label: "Speak Idea",   desc: "Talk your concept — transcribed into the input", emoji: "🗣️" },
  { value: "polish", label: "Sing Lyrics",  desc: "Sing rough words — AI polishes them",            emoji: "🎤" },
  { value: "melody", label: "Hum Melody",   desc: "Hum a tune — AI writes matching lyrics",         emoji: "🎵" },
];

function getSpeechRec(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

async function describeMelody(blob: Blob, durationMs: number): Promise<string> {
  const audioCtx = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.1);

  let maxRms = 0;
  let totalRms = 0;
  let windows = 0;
  const zcrValues: number[] = [];

  for (let i = 0; i + windowSize < data.length; i += windowSize) {
    const slice = data.slice(i, i + windowSize);
    const rms = Math.sqrt(slice.reduce((s, v) => s + v * v, 0) / windowSize);
    if (rms > maxRms) maxRms = rms;
    totalRms += rms;
    windows++;
    let zcr = 0;
    for (let j = 1; j < slice.length; j++) {
      if ((slice[j] >= 0) !== (slice[j - 1] >= 0)) zcr++;
    }
    zcrValues.push(zcr / windowSize);
  }

  const avgRms = totalRms / (windows || 1);
  const avgZcr = zcrValues.reduce((a, b) => a + b, 0) / (zcrValues.length || 1);
  const durationSec = durationMs / 1000;

  const energy =
    avgRms > 0.15 ? "high-energy, intense" :
    avgRms > 0.06 ? "moderate energy" :
    "soft, low-energy";

  const texture =
    avgZcr > 0.15 ? "rough and gritty" :
    avgZcr > 0.08 ? "mixed smooth and rough" :
    "smooth and flowing";

  const tempo =
    durationSec < 4  ? "short burst" :
    durationSec < 8  ? "medium length phrase" :
    "extended melody";

  await audioCtx.close();

  return [
    `Duration: ${durationSec.toFixed(1)} seconds (${tempo})`,
    `Energy level: ${energy}`,
    `Tonal texture: ${texture}`,
    `Peak amplitude: ${(maxRms * 100).toFixed(0)}%`,
  ].join("\n");
}

export default function VoiceInput({ onResult, disabled }: Props) {
  const [state, setState]           = useState<RecordingState>("idle");
  const [selectedMode, setSelectedMode] = useState<VoiceMode | null>(null);
  const [error, setError]           = useState("");
  const [transcript, setTranscript] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef    = useRef<any>(null);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const startTimeRef      = useRef<number>(0);
  const streamRef         = useRef<MediaStream | null>(null);

  const isSupported = typeof window !== "undefined" && !!getSpeechRec();

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => () => stop(), [stop]);

  const startIdea = useCallback(async () => {
    setError("");
    setTranscript("");

    const SpeechRec = getSpeechRec();
    if (!SpeechRec) {
      setError("Speech recognition not supported. Try Chrome.");
      setState("idle");
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;

    let finalTranscript = "";

    rec.onresult = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t + " ";
        else interim += t;
      }
      setTranscript((finalTranscript + interim).trim());
    };

    rec.onerror = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(`Mic error: ${e.error}`);
      setState("idle");
    };

    rec.onend = () => {
      const text = finalTranscript.trim();
      if (text) onResult(text, "idea");
      setState("idle");
      setTranscript("");
    };

    rec.start();
    setState("recording");
  }, [onResult]);

  const startSingOrHum = useCallback(async (mode: VoiceMode) => {
    setError("");
    setTranscript("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied.");
      setState("idle");
      return;
    }

    streamRef.current = stream;
    const chunks: Blob[] = [];
    chunksRef.current = chunks;
    startTimeRef.current = Date.now();

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    let spokenText = "";
    if (mode === "polish") {
      const SpeechRec = getSpeechRec();
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";
        recognitionRef.current = rec;
        rec.onresult = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) spokenText += e.results[i][0].transcript + " ";
          }
          setTranscript(spokenText.trim());
        };
        rec.start();
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const durationMs = Date.now() - startTimeRef.current;
      setState("processing");
      try {
        if (mode === "polish") {
          const text = spokenText.trim() || "[Purely melodic — no words detected]";
          onResult(text, "polish");
        } else {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const description = await describeMelody(blob, durationMs);
          onResult(description, "melody");
        }
      } catch {
        setError("Could not process audio. Try again.");
      } finally {
        setState("idle");
        setTranscript("");
      }
    };

    recorder.start(250);
    setState("recording");
  }, [onResult]);

  const handleModeSelect = useCallback(async (mode: VoiceMode) => {
    setSelectedMode(mode);
    if (mode === "idea") await startIdea();
    else await startSingOrHum(mode);
  }, [startIdea, startSingOrHum]);

  const handleStop = useCallback(() => {
    if (selectedMode === "idea") {
      recognitionRef.current?.stop(); // triggers onend → calls onResult
    } else {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop(); // triggers onstop → processes audio
    }
  }, [selectedMode]);

  if (!isSupported) return null;

  return (
    <div className="relative">
      {state === "idle" && (
        <button
          onClick={() => setState("selecting")}
          disabled={disabled}
          title="Record voice input"
          className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-violet-400 hover:border-violet-700 transition-all disabled:opacity-40"
        >
          <Mic size={16} />
        </button>
      )}

      {state === "selecting" && (
        <div className="absolute bottom-full mb-2 right-0 z-20 w-64 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800">
            <p className="text-xs text-zinc-400 font-semibold uppercase tracking-widest">Choose input mode</p>
          </div>
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => handleModeSelect(m.value)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
            >
              <span className="text-lg leading-none mt-0.5">{m.emoji}</span>
              <div>
                <p className="text-sm font-medium text-zinc-200">{m.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{m.desc}</p>
              </div>
            </button>
          ))}
          <button
            onClick={() => setState("idle")}
            className="w-full px-4 py-2 text-xs text-zinc-600 hover:text-zinc-400 border-t border-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/60 border border-red-800 text-red-300 hover:bg-red-900 transition-colors text-sm font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            {selectedMode === "idea" ? "Listening..." : "Recording..."}
            <Square size={12} />
          </button>
          {transcript && (
            <span className="text-xs text-zinc-500 truncate max-w-[150px]">
              "{transcript}"
            </span>
          )}
        </div>
      )}

      {state === "processing" && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 size={14} className="animate-spin" />
          Analyzing...
        </div>
      )}

      {error && (
        <p className="absolute top-full mt-1 right-0 text-xs text-red-400 whitespace-nowrap z-10 bg-zinc-950 px-2 py-1 rounded border border-red-900">
          {error}
        </p>
      )}
    </div>
  );
}
