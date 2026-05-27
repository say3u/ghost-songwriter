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

  return `Generate lyrics that fit the following beat or musical description.

Beat/music description: "${input}"
${styleClause}
${moodClause}
Rhyme scheme: ${rhymeScheme}
Language: ${language}
${examplesClause}

Match the energy, pocket, and phrasing to the described beat. Include: Verse 1, Pre-Chorus (optional), Chorus, Verse 2, Bridge.`;
}

export function buildRefinementPrompt(instruction: string): string {
  return `Refine the previously generated lyrics with this direction: "${instruction}"

Keep the same JSON structure. Only change what is needed to fulfill the refinement request. Output ONLY valid JSON.`;
}
