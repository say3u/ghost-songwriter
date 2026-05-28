"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Music } from "lucide-react";

type Props = { onAnalyzed: (description: string, filename: string) => void; onClear: () => void };

async function analyzeBeat(file: File): Promise<string> {
  const audioCtx = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  const windowSize = Math.floor(sampleRate * 0.1);

  let maxRms = 0, totalRms = 0, windows = 0;
  const zcrValues: number[] = [];
  const onsets: number[] = [];
  let prevRms = 0;

  for (let i = 0; i + windowSize < data.length; i += windowSize) {
    const slice = data.slice(i, i + windowSize);
    const rms = Math.sqrt(slice.reduce((s, v) => s + v * v, 0) / windowSize);
    if (rms > maxRms) maxRms = rms;
    totalRms += rms;
    windows++;
    if (rms > prevRms * 1.5 && rms > 0.05) onsets.push(i / sampleRate);
    prevRms = rms;
    let zcr = 0;
    for (let j = 1; j < slice.length; j++) {
      if ((slice[j] >= 0) !== (slice[j - 1] >= 0)) zcr++;
    }
    zcrValues.push(zcr / windowSize);
  }

  await audioCtx.close();

  const avgRms = totalRms / (windows || 1);
  const avgZcr = zcrValues.reduce((a, b) => a + b, 0) / (zcrValues.length || 1);

  const energy = avgRms > 0.15 ? "high-energy, hard-hitting" : avgRms > 0.06 ? "moderate energy" : "soft, lo-fi";
  const texture = avgZcr > 0.15 ? "bright and gritty" : avgZcr > 0.08 ? "mixed tones" : "deep and smooth";

  // Rough BPM estimate from onset intervals
  let bpmHint = "";
  if (onsets.length > 4) {
    const intervals = onsets.slice(1).map((t, i) => t - onsets[i]).filter(iv => iv > 0.2 && iv < 2);
    if (intervals.length > 0) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const estimatedBpm = Math.round(60 / avgInterval);
      if (estimatedBpm >= 60 && estimatedBpm <= 200) bpmHint = `Estimated BPM: ~${estimatedBpm}. `;
    }
  }

  // Try to extract BPM from filename
  const filenameBpm = file.name.match(/(\d{2,3})\s*bpm/i);
  if (filenameBpm) bpmHint = `BPM: ${filenameBpm[1]} (from filename). `;

  return [
    `Filename: ${file.name}`,
    `Duration: ${duration.toFixed(1)} seconds`,
    `${bpmHint}Energy: ${energy}`,
    `Tonal texture: ${texture}`,
    `Peak amplitude: ${(maxRms * 100).toFixed(0)}%`,
  ].join("\n");
}

export default function BeatUpload({ onAnalyzed, onClear }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    if (!f.type.startsWith("audio/")) { setError("Please upload an audio file (mp3, wav, etc.)"); return; }
    setFile(f); setError(""); setAnalyzing(true);
    try {
      const description = await analyzeBeat(f);
      onAnalyzed(description, f.name);
    } catch {
      setError("Could not analyze audio. The file may be unsupported.");
      setFile(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const clear = () => {
    setFile(null); setError("");
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  };

  if (file && !analyzing) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
        <Music size={14} className="text-gray-400 shrink-0" />
        <span className="text-sm text-gray-700 truncate flex-1 font-medium">{file.name}</span>
        <button onClick={clear} className="text-gray-300 hover:text-gray-600 transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={analyzing}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all w-full justify-center"
      >
        {analyzing ? (
          <><Loader2 size={14} className="animate-spin" /> Analyzing beat...</>
        ) : (
          <><Upload size={14} /> Upload beat file</>
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
