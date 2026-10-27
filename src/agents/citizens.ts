import "server-only";
import type OpenAI from "openai";
import type { Params } from "@/engine/rules";
import type { WorldSpec } from "@/engine/spec";
import { benchParams, parseJsonObject, scrubReply, textIsPublic } from "@/agents/judge";
import { openWeightsSource } from "@/lib/ai/mode";
import type { DataSource } from "@/lib/samples/mark";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";

/**
 * Optional open-weights brain for Rumour Town.
 * Sample lane, and any live failure, returns decisions: null so the client keeps the in-engine brain.
 * Science checks do not call this module.
 */

export const OPEN_WEIGHTS_FAILURE_NOTICE = "Open-weights call failed; the deterministic brain will tick.";

/** Neighbour radius used by the deterministic brain. Kept here so this file does not need to edit world rules. */
const NEIGHBOUR_RADIUS = 0.25;

export const CITIZEN_SYSTEM = `You voice every person walking past the town bank. Each person hears only their own neighbours.
For EVERY citizen in the input, decide independently from what that person can hear.
Return ONLY JSON: {"citizens": [{"id": number, "worried": 0..1, "withdraw": true|false, "says": a spoken line of at most 12 words, or null}, ...]}.
Nobody knows the rule of this town. Do not explain a theory. Speak like a neighbour, or stay quiet. Most people stay quiet.`;

export type CitizenView = {
  id: number;
  x: number;
  y: number;
  worried: number;
  says: string | null;
};

export type CitizenDecision = {
  id: number;
  worried: number;
  withdraw: boolean;
  says: string | null;
};

export type CitizenResponse = {
  source: DataSource;
  notice?: string;
  decisions: CitizenDecision[] | null;
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function audible(says: string | null, spec: WorldSpec): string | null {
  if (!says) return null;
  const trimmed = says.trim().slice(0, 80);
  if (!trimmed || !textIsPublic(trimmed, spec)) return null;
  return trimmed;
}

function neighboursOf(citizen: CitizenView, citizens: CitizenView[]): CitizenView[] {
  return citizens.filter((other) => other.id !== citizen.id && Math.hypot(other.x - citizen.x, other.y - citizen.y) < NEIGHBOUR_RADIUS);
}

function parseDecision(raw: unknown, id: number, spec: WorldSpec): CitizenDecision {
  if (!raw || typeof raw !== "object") throw new Error("Citizen decision was not an object.");
  const body = raw as Record<string, unknown>;
  if (typeof body.worried !== "number" || !Number.isFinite(body.worried)) throw new Error("Citizen decision was missing worried.");
  if (typeof body.withdraw !== "boolean") throw new Error("Citizen decision was missing withdraw.");
  let says: string | null = null;
  if (typeof body.says === "string" && body.says.trim()) {
    const trimmed = body.says.trim().slice(0, 80);
    says = scrubReply(trimmed, spec) === trimmed && textIsPublic(trimmed, spec) ? trimmed : null;
  } else if (body.says != null && body.says !== "") {
    throw new Error("Citizen decision had an unusable says.");
  }
  return { id, worried: clamp(body.worried), withdraw: body.withdraw, says };
}

/**
 * One call decides the whole square: Muse Spark Open has no JSON mode, so the shape rides in the prompt
 * and every decision is validated. One call per run keeps a live town at about a cent.
 */
async function askTown(client: OpenAI, model: string, citizens: CitizenView[], spec: WorldSpec, settings: Params): Promise<CitizenDecision[]> {
  const people = citizens.map((citizen) => ({
    id: citizen.id,
    worried: Math.round(clamp(citizen.worried) * 100) / 100,
    hears: neighboursOf(citizen, citizens)
      .map((other) => audible(other.says, spec))
      .filter((line): line is string => Boolean(line)),
    worriedNeighbours: neighboursOf(citizen, citizens).filter((other) => other.worried > 0.5).length,
  }));
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    // Reasoning counts toward max_tokens on Muse Spark Open.
    max_tokens: 9000,
    stream: false,
    messages: [
      { role: "system", content: CITIZEN_SYSTEM },
      { role: "user", content: JSON.stringify({ settings, citizens: people }) },
    ],
  });
  const content = completion.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Town decision was empty.");
  const parsed = parseJsonObject(content) as { citizens?: unknown } | null;
  const list = parsed && Array.isArray(parsed.citizens) ? parsed.citizens : null;
  if (!list) throw new Error("Town decision had no citizens list.");
  const byId = new Map<number, unknown>();
  for (const item of list) {
    if (item && typeof item === "object" && typeof (item as { id?: unknown }).id === "number") byId.set((item as { id: number }).id, item);
  }
  return citizens.map((citizen) => {
    const raw = byId.get(citizen.id);
    if (!raw) throw new Error(`Town decision skipped citizen ${citizen.id}.`);
    return parseDecision(raw, citizen.id, spec);
  });
}

export async function decideCitizens(spec: WorldSpec, citizens: CitizenView[], params: Params | undefined): Promise<CitizenResponse> {
  // Sample lane: do not call the model. Null decisions keep the deterministic brain.
  if (openWeightsSource() !== "live") {
    return { source: "sample", notice: SAMPLE_NOTICE, decisions: null };
  }
  try {
    const { openWeights } = await import("@/lib/ai/clients");
    const { client, model } = openWeights();
    const settings = benchParams(spec, params);
    const decisions = await askTown(client, model, citizens, spec, settings);
    return { source: "live", decisions };
  } catch {
    return { source: "sample", notice: OPEN_WEIGHTS_FAILURE_NOTICE, decisions: null };
  }
}
