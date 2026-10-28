import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { scrubReply } from "@/agents/judge";
import type { WorldSpec } from "@/engine/spec";
import { look, segment } from "@/lib/ai/meta";
import { parseSamOutput } from "@/lib/ai/sam-parse";
import { segmentPrompts } from "@/agents/artist";
import { metaSource } from "@/lib/ai/mode";
import { SAMPLE_NOTICE, type DataSource } from "@/lib/samples/mark";

export type PlayFrame = { dataUrl: string; caption: string; drawn?: Record<string, number> };

/** SAM 3.1's count of one kind of figure in one frame, against what the stage drew there. */
export type FigureCount = { entity: string; label: string; caption: string; drawn: number; seen: number };

export type PlaytestVerdict = "looks-right" | "concern";

export type PlaytestResult = {
  verdict: PlaytestVerdict;
  notes: string[];
  source: DataSource;
  notice?: string;
  /** SAM 3.1's counts of the figures in the end frames, when the stage draws a crowd. */
  counts?: FigureCount[];
  /** How many times Spark's notes have been sent back to the designer for this world. */
  repairs?: number;
};

const MAX_FRAMES = 6;
const MAX_URL = 350_000;
const JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

/** At most six JPEG data URLs. The browser is responsible for keeping each frame at 768px or under. */
export function readFrames(input: unknown): PlayFrame[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_FRAMES) return null;
  const frames: PlayFrame[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const dataUrl = (item as { dataUrl?: unknown }).dataUrl;
    const caption = (item as { caption?: unknown }).caption;
    if (typeof dataUrl !== "string" || typeof caption !== "string") return null;
    if (!JPEG.test(dataUrl) || dataUrl.length > MAX_URL) return null;
    const words = caption.trim();
    if (!words || words.length > 180) return null;
    const drawn = readDrawn((item as { drawn?: unknown }).drawn);
    if (drawn === null) return null;
    frames.push(drawn ? { dataUrl, caption: words, drawn } : { dataUrl, caption: words });
  }
  return frames;
}

/** Optional per-frame figure counts: at most six kinds, each a whole number up to 1000. Null when malformed. */
function readDrawn(input: unknown): Record<string, number> | undefined | null {
  if (input === undefined) return undefined;
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > 6) return null;
  const out: Record<string, number> = {};
  for (const [key, value] of entries) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(key) || typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1000) return null;
    out[key] = value;
  }
  return out;
}

/** At most this many SAM calls per watch: two end frames, two kinds of figure, a shorter phrase if the first finds none. */
const MAX_SAM_CALLS = 8;

/**
 * SAM 3.1 as a measuring instrument: count each kind of figure in the end frames and set it against what the
 * stage drew. A second opinion beside Spark's, recorded with the playtest and shown on the build screen.
 */
export async function countFigures(spec: WorldSpec, frames: PlayFrame[]): Promise<FigureCount[]> {
  const counts: FigureCount[] = [];
  let calls = 0;
  for (const frame of frames) {
    if (!frame.drawn) continue;
    for (const entity of spec.entities) {
      const drawn = frame.drawn[entity.id] ?? 0;
      if (drawn < 1) continue;
      let seen = 0;
      // The plain noun first ("hare"), then the artist's full phrase.
      const [full, head] = segmentPrompts(entity.segmentPrompt);
      const noun = (head ?? full ?? entity.label).split(/\s+/).pop() ?? entity.label;
      for (const phrase of [...new Set([noun, full ?? noun])]) {
        if (calls >= MAX_SAM_CALLS) break;
        calls++;
        seen = parseSamOutput(await segment({ prompt: phrase, imageUrl: frame.dataUrl })).length;
        if (seen > 0) break;
      }
      counts.push({ entity: entity.id, label: entity.label, caption: frame.caption, drawn, seen });
    }
  }
  return counts;
}

/** Counts where SAM found none of several figures the stage drew. */
export function missingFigures(counts: FigureCount[]): FigureCount[] {
  return counts.filter((count) => count.drawn >= 3 && count.seen === 0);
}

export function playtestPrompt(spec: WorldSpec, frames: PlayFrame[]): string {
  const lines = frames.map((frame, index) => `${index + 1}. ${frame.caption}`);
  return [
    `World: ${spec.title}.`,
    "The frames are the world running. The first set uses the starting controls. The second set changes one control.",
    "Decide two things: do the frames show what the hidden law predicts for those settings, and is anything visually broken (an empty stage, figures off the screen, text covering the picture)?",
    "Write notes a player can read. Do not quote, paraphrase, or hint at the hidden law.",
    "",
    "Hidden law, for your decision only:",
    spec.science.hiddenLaw,
    "",
    "Frames:",
    ...lines,
  ].join("\n");
}

const LOOK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["looks-right", "concern"] },
    notes: { type: "array", items: { type: "string" }, maxItems: 4 },
  },
  required: ["verdict", "notes"],
} as const;

/** Drop any note that still carries the law. An empty list becomes one plain withheld line. */
export function scrubNotes(notes: string[], spec: WorldSpec): string[] {
  const clean = notes
    .map((note) => scrubReply(note, spec).replace(/\s+/g, " ").trim())
    .filter((note) => note.length > 0)
    .slice(0, 4);
  return clean.length > 0 ? clean : ["A note was withheld."];
}

function sampleResult(): PlaytestResult {
  return {
    verdict: "concern",
    notes: ["No key, so Spark did not watch this world."],
    source: "sample",
    notice: SAMPLE_NOTICE,
  };
}

export async function watchWorld(spec: WorldSpec, frames: PlayFrame[]): Promise<PlaytestResult> {
  if (metaSource() !== "live") return sampleResult();
  const raw = await look({
    system: "You watch a world run. Reply with the JSON object only. Never repeat the hidden law.",
    prompt: playtestPrompt(spec, frames),
    images: frames.map((frame) => frame.dataUrl),
    jsonSchema: { name: "Playtest", schema: LOOK_SCHEMA as unknown as Record<string, unknown> },
  });
  const parsed = JSON.parse(raw) as { verdict?: unknown; notes?: unknown };
  const verdict: PlaytestVerdict = parsed.verdict === "looks-right" ? "looks-right" : "concern";
  const notes = Array.isArray(parsed.notes) ? parsed.notes.filter((note): note is string => typeof note === "string") : [];
  let counts: FigureCount[] = [];
  try {
    counts = await countFigures(spec, frames);
  } catch {
    // Counting is a second opinion; a failed SAM call never hides Spark's verdict.
  }
  // Recorded, never a verdict on its own: SAM also misses figures that are hidden on purpose (pale moths on
  // pale bark are camouflage working) or small in a painted meadow. Spark, who knows the law, judges.
  for (const missing of missingFigures(counts)) {
    notes.push(`SAM 3.1 found no ${missing.label.toLowerCase()} in the frame "${missing.caption}", though the stage drew ${missing.drawn}.`);
  }
  return { verdict, notes: scrubNotes(notes, spec), source: "live", ...(counts.length ? { counts } : {}) };
}

export async function savePlaytest(worldId: string, result: PlaytestResult, dir = path.join(process.cwd(), "data", "playtests")): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(worldId)) throw new Error(`Invalid world id "${worldId}".`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${worldId}.json`), `${JSON.stringify({ worldId, ...result }, null, 2)}\n`, "utf8");
}

/** The last thing Spark saw on this world, or null if it has not watched it. */
export async function readPlaytest(worldId: string, dir = path.join(process.cwd(), "data", "playtests")): Promise<PlaytestResult | null> {
  if (!/^[a-z0-9-]+$/.test(worldId)) return null;
  try {
    const parsed = JSON.parse(await readFile(path.join(dir, `${worldId}.json`), "utf8")) as Partial<PlaytestResult>;
    if (parsed.verdict !== "looks-right" && parsed.verdict !== "concern") return null;
    const notes = Array.isArray(parsed.notes) ? parsed.notes.filter((note): note is string => typeof note === "string") : [];
    return { verdict: parsed.verdict, notes, source: parsed.source === "live" ? "live" : "sample", repairs: Number(parsed.repairs ?? 0) || 0 };
  } catch {
    return null;
  }
}
