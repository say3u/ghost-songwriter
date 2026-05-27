export type RhymeScheme = "AABB" | "ABAB" | "ABCB" | "free";

export type Language =
  | "English"
  | "Spanish"
  | "French"
  | "Portuguese"
  | "German";

export type SongSection = {
  label: string;
  content: string;
  syllables?: number[];
};

export type GeneratedSong = {
  sections: SongSection[];
  notes: string;
  suggestedTempo?: string;
  suggestedKey?: string;
  suggestedMood?: string;
};

export type Mood = {
  id: string;
  label: string;
  emoji: string;
};

export type VoiceMode = "idea" | "polish" | "melody";

export type GenerationRequest = {
  mode: "lyrics-from-idea" | "lyrics-from-beat";
  input: string;
  artistStyles: string[];
  moods: string[];
  rhymeScheme: RhymeScheme;
  language: Language;
  temperature: number;
  fewShotExamples?: string;
  conversationHistory?: Message[];
  voiceMode?: VoiceMode;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type Revision = {
  id: string;
  timestamp: Date;
  request: GenerationRequest;
  result: GeneratedSong;
};
