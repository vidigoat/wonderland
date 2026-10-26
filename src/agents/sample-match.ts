import { runAllChecks, type CheckResult } from "@/engine/checks";
import { loadRules } from "@/engine/load";
import type { WorldSpec } from "@/engine/spec";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";
import { heroWorlds } from "@/worlds";

/**
 * Sample-mode matcher. A missing API key never becomes a made-up law.
 *
 * Keyword → hero (a token matches when it starts with the keyword):
 *   sql, inject, ledger, gatekeeper           → gatekeeper
 *   moth, selection, camouflage, peppered     → peppered-forest
 *   orbit, gravity, cannon, newton            → newtons-cannon
 *   bank, rumour, rumor, deposit              → rumour-town
 *   fire, spark, valley, percolat, firebreak  → firebreak
 *
 * The highest keyword count wins. A tie keeps the earlier hero in this list.
 * Title words that are not already in that list are included (gatekeeper, peppered, newton, firebreak).
 */
export const HERO_KEYWORDS: { id: string; keywords: readonly string[] }[] = [
  { id: "gatekeeper", keywords: ["sql", "inject", "ledger", "gatekeeper"] },
  { id: "peppered-forest", keywords: ["moth", "selection", "camouflage", "peppered"] },
  { id: "newtons-cannon", keywords: ["orbit", "gravity", "cannon", "newton"] },
  { id: "rumour-town", keywords: ["bank", "rumour", "rumor", "deposit"] },
  { id: "firebreak", keywords: ["fire", "spark", "valley", "percolat", "firebreak"] },
];

export type SampleEvent =
  | {
      type: "stage";
      stage: "scientist" | "designer" | "checker" | "repair" | "artist" | "playtester" | "done";
      message: string;
      source: "sample";
      notice: string;
    }
  | { type: "checks"; results: CheckResult[]; source: "sample"; notice: string }
  | { type: "world"; spec: WorldSpec; source: "sample"; notice: string }
  | {
      type: "choose";
      message: string;
      worlds: { id: string; title: string; concept: string }[];
      source: "sample";
      notice: string;
    }
  | { type: "error"; message: string; source: "sample"; notice: string };

function tokens(concept: string): string[] {
  return concept.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export function matchHeroId(concept: string): string | null {
  const words = tokens(concept);
  let best: { id: string; score: number } | null = null;
  for (const hero of HERO_KEYWORDS) {
    const score = hero.keywords.filter((keyword) => words.some((word) => word.startsWith(keyword))).length;
    if (score === 0) continue;
    if (!best || score > best.score) best = { id: hero.id, score };
  }
  return best?.id ?? null;
}

export function matchHero(concept: string): WorldSpec | null {
  const id = matchHeroId(concept);
  if (!id) return null;
  return heroWorlds.find((world) => world.id === id) ?? null;
}

export function heroChoices(): { id: string; title: string; concept: string }[] {
  return heroWorlds.map((world) => ({ id: world.id, title: world.title, concept: world.concept }));
}

/** SAMPLE_NOTICE plus one sentence. The matched title is named only when there is a hero. */
export function sampleNotice(concept: string, title?: string): string {
  const sentence = title
    ? `You wrote “${concept}”. The model did not write this world. You are entering the hand-built world “${title}”.`
    : `You wrote “${concept}”. The model did not write a world for that sentence.`;
  return `${SAMPLE_NOTICE} ${sentence}`;
}

function scrub(text: string, hero: WorldSpec | null): string {
  if (!hero) return text;
  return text.split(hero.science.hiddenLaw).join("███").split(hero.science.plainStatement).join("███");
}

/**
 * Sample generation: real science checks on a hero world, or a choice of the five heroes.
 * Does not call a model and does not invent a WorldSpec.
 */
export async function* generateSample(concept: string): AsyncGenerator<SampleEvent> {
  const hero = matchHero(concept);
  const notice = scrub(sampleNotice(concept, hero?.title), hero);
  const source = "sample" as const;

  yield {
    type: "stage",
    stage: "scientist",
    message: scrub("No model call. Matching your sentence to a verified world. The law stays ███.", hero),
    source,
    notice,
  };

  if (!hero) {
    yield {
      type: "choose",
      message: scrub(
        `No verified world matched “${concept}”. Choose one of the five hand-built worlds. The model did not write a new one.`,
        null,
      ),
      worlds: heroChoices(),
      source,
      notice,
    };
    return;
  }

  yield {
    type: "stage",
    stage: "designer",
    message: scrub(`The model did not design this. Using the hand-built world “${hero.title}”.`, hero),
    source,
    notice,
  };
  yield {
    type: "stage",
    stage: "checker",
    message: scrub(`Running ${hero.checks.length} science checks across seeds.`, hero),
    source,
    notice,
  };

  const results = await runAllChecks(loadRules(hero), hero);
  yield { type: "checks", results, source, notice };
  if (results.some((result) => !result.passed)) {
    yield {
      type: "error",
      message: "The hand-built world failed its science checks. The model did not write a replacement.",
      source,
      notice,
    };
    return;
  }

  yield { type: "world", spec: hero, source, notice };
  yield {
    type: "stage",
    stage: "done",
    message: scrub(`World ready. The model did not write “${hero.title}”.`, hero),
    source,
    notice,
  };
}
