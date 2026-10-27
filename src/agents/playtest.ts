import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scrubReply } from "@/agents/judge";
import type { WorldSpec } from "@/engine/spec";
import { look } from "@/lib/ai/meta";
import { metaSource } from "@/lib/ai/mode";
import { SAMPLE_NOTICE, type DataSource } from "@/lib/samples/mark";

export type PlayFrame = { dataUrl: string; caption: string };

export type PlaytestVerdict = "looks-right" | "concern";

export type PlaytestResult = {
  verdict: PlaytestVerdict;
  notes: string[];
  source: DataSource;
  notice?: string;
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
    frames.push({ dataUrl, caption: words });
  }
  return frames;
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
  return { verdict, notes: scrubNotes(notes, spec), source: "live" };
}

export async function savePlaytest(worldId: string, result: PlaytestResult, dir = path.join(process.cwd(), "data", "playtests")): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(worldId)) throw new Error(`Invalid world id "${worldId}".`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${worldId}.json`), `${JSON.stringify({ worldId, ...result }, null, 2)}\n`, "utf8");
}
