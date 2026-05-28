import type { GenerationRequest } from "@/types";

export function buildUserPrompt(req: GenerationRequest): string {
  const {
    mode,
    input,
    artistStyles,
    moods,
    rhymeScheme,
    language,
    fewShotExamples,
  } = req;

  const styleClause =
    artistStyles.length > 0
      ? `Write in the combined style of: ${artistStyles.join(", ")}.`
      : "";

  const moodClause =
    moods.length > 0 ? `Emotional tone/mood: ${moods.join(", ")}.` : "";

  const examplesClause = fewShotExamples?.trim()
    ? `\n\nHere are sample lines from the artist's own writing to match their voice:\n"""\n${fewShotExamples.trim()}\n"""`
    : "";

  if (mode === "lyrics-from-idea") {
    return `Generate a complete song from the following concept or lyric idea.

Concept/idea: "${input}"
${styleClause}
${moodClause}
Rhyme scheme: ${rhymeScheme}
Language: ${language}
${examplesClause}

Include: Verse 1, Pre-Chorus (optional), Chorus, Verse 2, Bridge, and Outro (optional).`;
  }

  const beatAnalysis = (req as any).beatContext
    ? `\n\nUploaded beat analysis:\n${(req as any).beatContext}`
    : "";

  return `Generate lyrics that fit the following beat or musical description.

Beat/music description: "${input}"
${styleClause}
${moodClause}
Rhyme scheme: ${rhymeScheme}
Language: ${language}
${examplesClause}${beatAnalysis}

Match the energy, pocket, and phrasing to the described beat. Include: Verse 1, Pre-Chorus (optional), Chorus, Verse 2, Bridge.`;
}

export function buildExpandPrompt(req: GenerationRequest): string {
  const styleClause = req.artistStyles.length > 0 ? `Write in the combined style of: ${req.artistStyles.join(", ")}.` : "";
  const moodClause = req.moods.length > 0 ? `Emotional tone/mood: ${req.moods.join(", ")}.` : "";
  return `The user has written partial or rough lyrics. Expand them into a complete, polished song while preserving their voice, phrasing, and core ideas.

Existing lyrics:
"""
${req.input}
"""

${styleClause}
${moodClause}
Rhyme scheme: ${req.rhymeScheme}
Language: ${req.language}

Keep what works, complete what's missing, and structure it as a full song (Verse 1, Chorus, Verse 2, Bridge, Outro as needed). Output ONLY valid JSON.`;
}

export function buildLyricsToBeatPrompt(req: GenerationRequest): string {
  const styleClause = req.artistStyles.length > 0 ? `Artist reference: ${req.artistStyles.join(", ")}.` : "";
  const moodClause = req.moods.length > 0 ? `Mood: ${req.moods.join(", ")}.` : "";
  return `Analyze the following lyrics and produce a detailed beat brief — the ideal instrumental production to match them.

Lyrics:
"""
${req.input}
"""

${styleClause}
${moodClause}

Output ONLY valid JSON using this exact structure, with these section labels:
{"sections":[
  {"label":"Genre","content":"...","syllableCount":0},
  {"label":"BPM","content":"...","syllableCount":0},
  {"label":"Key & Scale","content":"...","syllableCount":0},
  {"label":"Core Instruments","content":"...","syllableCount":0},
  {"label":"Drum Pattern","content":"...","syllableCount":0},
  {"label":"Production Notes","content":"...","syllableCount":0}
],"notes":"Overall sonic vision in 1-2 sentences"}`;
}

export function buildRefinementPrompt(instruction: string): string {
  return `Refine the previously generated lyrics with this direction: "${instruction}"

Keep the same JSON structure. Only change what is needed to fulfill the refinement request. Output ONLY valid JSON.`;
}

export function buildPolishPrompt(
  rawTranscription: string,
  req: GenerationRequest
): string {
  const styleClause =
    req.artistStyles.length > 0
      ? `Write in the combined style of: ${req.artistStyles.join(", ")}.`
      : "";
  const moodClause =
    req.moods.length > 0
      ? `Emotional tone/mood: ${req.moods.join(", ")}.`
      : "";

  return `The following text is a raw, rough transcription of someone singing into a microphone. It may be imperfect, fragmented, or unpolished — that's intentional. Your job is to take the core emotion, phrases, and ideas and transform them into a fully structured, polished song.

Raw sung vocals:
"""
${rawTranscription}
"""

${styleClause}
${moodClause}
Rhyme scheme: ${req.rhymeScheme}
Language: ${req.language}

Preserve the singer's original voice and intent as much as possible. Clean up grammar only where needed. Output ONLY valid JSON in the standard song structure.`;
}

export function buildMelodyPrompt(
  melodyDescription: string,
  req: GenerationRequest
): string {
  const styleClause =
    req.artistStyles.length > 0
      ? `Write in the combined style of: ${req.artistStyles.join(", ")}.`
      : "";
  const moodClause =
    req.moods.length > 0
      ? `Emotional tone/mood: ${req.moods.join(", ")}.`
      : "";

  return `The user hummed or sang a wordless melody into their microphone. Here is an audio analysis of what was captured:

${melodyDescription}

Your task is to write original lyrics that would fit this melody's energy, tempo, and emotional character. Do not try to match specific pitches — focus on matching the feel and flow.

${styleClause}
${moodClause}
Rhyme scheme: ${req.rhymeScheme}
Language: ${req.language}

Output ONLY valid JSON in the standard song structure.`;
}
