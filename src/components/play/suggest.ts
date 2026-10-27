export type ShelfWorld = { id: string; title: string; concept: string };

const SKIP = new Set([
  "why",
  "how",
  "does",
  "the",
  "and",
  "what",
  "when",
  "with",
  "from",
  "that",
  "this",
  "into",
  "over",
  "your",
  "have",
  "been",
  "will",
  "they",
  "them",
  "than",
  "then",
  "for",
  "are",
  "was",
  "you",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !SKIP.has(word));
}

/** How many meaningful words the question shares with a world's concept. */
export function wordOverlap(question: string, concept: string): number {
  const asked = words(question);
  let score = 0;
  for (const word of words(concept)) {
    if (asked.some((askedWord) => askedWord === word || (word.length > 3 && askedWord.length > 3 && (askedWord.startsWith(word) || word.startsWith(askedWord))))) {
      score += 1;
    }
  }
  return score;
}

export type MissKind = "banned" | "not-a-mechanism" | "failed";

export function missKind(message: string): MissKind {
  if (/medical|politic|war|sport/i.test(message)) return "banned";
  if (/mechanism|did not write|no verified|not a world/i.test(message)) return "not-a-mechanism";
  return "failed";
}

export function missSentence(kind: MissKind): string {
  if (kind === "banned") return "Wonderland does not build that. It stays with how things work.";
  if (kind === "not-a-mechanism") return "That question does not name a mechanism you can poke.";
  return "The build tried, and the science did not hold.";
}

/** Three questions that already have worlds, and the closest one to play. */
export function suggestWorlds(question: string, shelf: ShelfWorld[]): { closest: ShelfWorld; questions: string[] } | null {
  if (shelf.length === 0) return null;
  const ranked = [...shelf].sort((a, b) => wordOverlap(question, b.concept) - wordOverlap(question, a.concept) || a.title.localeCompare(b.title));
  const closest = ranked[0];
  if (!closest) return null;
  return { closest, questions: ranked.slice(0, 3).map((world) => world.concept) };
}
