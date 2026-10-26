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

export const CITIZEN_SYSTEM = `You are one person walking past the town bank. You hear only your neighbours.
Return JSON: {"worried": a number from 0 to 1, "withdraw": true or false, "says": a spoken line of at most 12 words, or null}.
You do not know the rule of this town. Do not explain a theory. Speak like a neighbour, or stay quiet.`;

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

async function askCitizen(client: OpenAI, model: string, citizen: CitizenView, citizens: CitizenView[], spec: WorldSpec, settings: Params): Promise<CitizenDecision> {
  const nearby = neighboursOf(citizen, citizens).map((other) => ({
    id: other.id,
    worried: clamp(other.worried),
    says: audible(other.says, spec),
  }));
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 120,
    stream: false,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CITIZEN_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          you: { id: citizen.id, worried: clamp(citizen.worried) },
          neighbours: nearby,
          settings,
        }),
      },
    ],
  });
  const content = completion.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Citizen decision was empty.");
  return parseDecision(parseJsonObject(content), citizen.id, spec);
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
    const decisions = await Promise.all(citizens.map((citizen) => askCitizen(client, model, citizen, citizens, spec, settings)));
    return { source: "live", decisions };
  } catch {
    return { source: "sample", notice: OPEN_WEIGHTS_FAILURE_NOTICE, decisions: null };
  }
}
