import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Params } from "@/engine/rules";
import type { Knob, WorldSpec } from "@/engine/spec";
import { metaSource } from "@/lib/ai/mode";
import type { DataSource } from "@/lib/samples/mark";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";

/**
 * Judge. Server-only: the hidden law is an input to the live model and the sample rubric,
 * and it must never leave in a response. Do not import this module from a client component.
 */

export type JudgeVerdict = "discovered" | "warmer" | "colder";

export type JudgeResponse = {
  verdict: JudgeVerdict;
  reply: string;
  nextExperiment?: Params;
  source: DataSource;
  notice?: string;
};

export const SAMPLE_REPLIES: Record<JudgeVerdict, string> = {
  discovered: "That names the mechanism. A new situation is waiting.",
  warmer: "Part of that holds. What changes if you move only one thing?",
  colder: "The world can disagree with that. Try a setting you have not used.",
};

export const WARMER_REPLY = SAMPLE_REPLIES.warmer;

const SLICE = 24;

export class ModelCallError extends Error {
  readonly source = "live" as const;
  constructor(message: string) {
    super(message);
    this.name = "ModelCallError";
  }
}

/** True when `text` contains any 24-character slice of `secret`. Shorter secrets are ignored. */
export function containsSlice(text: string, secret: string): boolean {
  if (secret.length < SLICE) return false;
  const hay = text.toLowerCase();
  const needle = secret.toLowerCase();
  for (let i = 0; i <= needle.length - SLICE; i++) {
    if (hay.includes(needle.slice(i, i + SLICE))) return true;
  }
  return false;
}

function secretStrings(spec: WorldSpec): string[] {
  const secrets = [spec.science.hiddenLaw, spec.science.plainStatement];
  if (typeof spec.transfer.answerKey === "string") secrets.push(spec.transfer.answerKey);
  for (const prediction of spec.predictions) {
    if (typeof prediction.answerKey === "string") secrets.push(prediction.answerKey);
  }
  return secrets;
}

export function textIsPublic(text: string, spec: WorldSpec): boolean {
  return secretStrings(spec).every((secret) => !containsSlice(text, secret));
}

/**
 * If `reply` contains any 24-character slice of `spec.science.hiddenLaw`, replace the whole reply.
 * Plain statements and long answer keys are removed the same way so they are not returned either.
 */
export function scrubReply(reply: string, spec: WorldSpec): string {
  if (!textIsPublic(reply, spec)) return WARMER_REPLY;
  return reply;
}

export function redactMessage(error: unknown, spec?: WorldSpec): string {
  const raw = error instanceof Error ? error.message : "The model request failed.";
  let message = raw.replace(/\s+/g, " ").trim().slice(0, 240);
  if (!message) message = "The model request failed.";
  for (const name of ["MODEL_API_KEY", "FIREWORKS_API_KEY", "BASETEN_API_KEY"]) {
    const secret = process.env[name];
    if (secret) message = message.split(secret).join("[redacted]");
  }
  if (spec && !textIsPublic(message, spec)) return "The model request failed.";
  return message;
}

export function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    throw new Error("The model did not return JSON.");
  }
}

export function benchParams(spec: WorldSpec, raw: Params | undefined): Params {
  const params: Params = {};
  for (const knob of spec.knobs) {
    const value = raw?.[knob.id];
    if (knob.kind === "toggle") {
      params[knob.id] = typeof value === "boolean" ? value : knob.default;
    } else if (knob.kind === "slider") {
      params[knob.id] = typeof value === "number" && Number.isFinite(value) ? value : knob.default;
    } else {
      const fallback = typeof knob.default === "string" ? knob.default : "";
      params[knob.id] = safeTextParam(spec, value, fallback);
    }
  }
  return params;
}

function safeTextParam(spec: WorldSpec, value: unknown, fallback: string): string {
  if (typeof value === "string" && textIsPublic(value, spec)) return value;
  if (textIsPublic(fallback, spec)) return fallback;
  return "";
}

function has(text: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

type Rubric = {
  discovered: (text: string) => boolean;
  partial: (text: string) => boolean;
  misconception: (text: string) => boolean;
};

const RUBRICS: Record<string, Rubric> = {
  gatekeeper: {
    discovered: (text) =>
      (has(text, ["quote", "apostrophe"]) && has(text, ["executed", "as code", "as a command", "part of the command", "runs as", "run as"])) ||
      (has(text, ["parameter", "sealed"]) && has(text, ["as data", "separate", "mixed into", "not code"])),
    partial: (text) => has(text, ["quote", "apostrophe", "sealed", "parameter", "injection", "command", "scribe"]),
    misconception: (text) => has(text, ["need the password", "need a password", "escaping", "hiding the error", "hide the error", "error messages"]),
  },
  "peppered-forest": {
    discovered: (text) =>
      has(text, ["surviv", "eaten", "eat the", "eats the", "reproduc", "selection", "predation"]) &&
      has(text, ["do not change", "don't change", "does not change", "doesn't change", "no individual", "individuals do not", "not one moth", "none of them change"]),
    partial: (text) => has(text, ["bird", "eaten", "eat the", "dark moth", "surviv", "selection", "population", "inherit", "variation", "offspring"]),
    misconception: (text) => has(text, ["darken itself", "darkens itself", "darken themselves", "darkens themselves", "change themselves", "changes itself", "want to", "try to blend", "because they are needed"]),
  },
  "newtons-cannon": {
    discovered: (text) => has(text, ["fall"]) && has(text, ["sideways", "horizontal", "miss the ground", "missing the ground", "curves away", "keeps missing"]),
    partial: (text) => has(text, ["orbit", "speed", "fall", "cannon", "circular", "escape", "weightless"]),
    misconception: (text) => has(text, ["no gravity", "without gravity", "engines", "heavier"]),
  },
  "rumour-town": {
    discovered: (text) =>
      has(text, ["expect", "fear", "self-fulfilling", "self fulfilling", "rational", "withdraw first", "withdrawing first"]) &&
      has(text, ["fraction", "reserve", "insurance", "solvent", "only some of", "not all of the"]),
    partial: (text) => has(text, ["insurance", "rumour", "rumor", "queue", "withdraw", "panic", "reserve", "fraction", "whisper"]),
    misconception: (text) => has(text, ["bad loan", "loans go bad", "loans have gone bad", "gone bad", "lose money", "keeps all", "all your money", "must be true"]),
  },
  firebreak: {
    discovered: (text) =>
      has(text, ["neighbour", "neighbor", "adjacent", "cluster", "connect"]) &&
      has(text, ["critical", "threshold", "spans", "finite", "unbroken", "gap", "firebreak", "density"]),
    partial: (text) => has(text, ["density", "gap", "strip", "spread", "neighbour", "neighbor", "cluster", "plant", "ridge"]),
    misconception: (text) => has(text, ["in proportion", "a little more", "any gap", "only reason", "wind is the only"]),
  },
};

const NEXT: Record<string, { warmer: Params; colder: Params }> = {
  gatekeeper: {
    warmer: { sealed: true },
    colder: { name: "O'Brien", sealed: false },
  },
  "peppered-forest": {
    warmer: { birds: false, barkDarkness: 0.9 },
    colder: { barkDarkness: 0.9, birds: true },
  },
  "newtons-cannon": {
    warmer: { speed: 1 },
    colder: { speed: 0.5 },
  },
  "rumour-town": {
    warmer: { insurance: true },
    colder: { rumourSeeds: 1, insurance: false },
  },
  firebreak: {
    warmer: { density: 0.9, firebreak: true },
    colder: { density: 0.2, firebreak: false },
  },
};

function normalise(statement: string): string {
  return statement.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

export function sampleVerdict(worldId: string, statement: string): JudgeVerdict {
  const text = normalise(statement);
  const rubric = RUBRICS[worldId];
  if (!rubric || !text) return "colder";
  const discovered = rubric.discovered(text);
  const misconception = rubric.misconception(text);
  if (discovered && !misconception) return "discovered";
  if (discovered && misconception) return "warmer";
  if (misconception) return "colder";
  if (rubric.partial(text)) return "warmer";
  return "colder";
}

function fallbackExperiment(spec: WorldSpec): Params | undefined {
  const knob = spec.knobs[0];
  if (!knob) return undefined;
  if (knob.kind === "toggle") return { [knob.id]: knob.default !== true };
  if (knob.kind === "slider") return { [knob.id]: knob.max ?? knob.default };
  return { [knob.id]: typeof knob.default === "string" ? knob.default : "" };
}

function publicExperiment(spec: WorldSpec, experiment: Params | undefined): Params | undefined {
  if (!experiment) return undefined;
  const clean: Params = {};
  for (const knob of spec.knobs) {
    const value = experiment[knob.id];
    if (value == null) continue;
    if (typeof value === "string") {
      if (!textIsPublic(value, spec)) continue;
      clean[knob.id] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      clean[knob.id] = value;
    }
  }
  return Object.keys(clean).length ? clean : undefined;
}

/** Sample lane: fixed replies, no model call. */
export function sampleJudge(spec: WorldSpec, statement: string): JudgeResponse {
  const verdict = sampleVerdict(spec.id, statement);
  const planned = verdict === "discovered" ? undefined : (NEXT[spec.id]?.[verdict] ?? fallbackExperiment(spec));
  const nextExperiment = publicExperiment(spec, planned);
  return {
    verdict,
    reply: scrubReply(SAMPLE_REPLIES[verdict], spec),
    ...(nextExperiment ? { nextExperiment } : {}),
    source: "sample",
    notice: SAMPLE_NOTICE,
  };
}

function judgeSchema(spec: WorldSpec): { name: string; schema: Record<string, unknown> } {
  const properties: Record<string, unknown> = {};
  for (const knob of spec.knobs) {
    const type = knob.kind === "toggle" ? "boolean" : knob.kind === "slider" ? "number" : "string";
    properties[knob.id] = { anyOf: [{ type }, { type: "null" }] };
  }
  return {
    name: "JudgeVerdict",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        verdict: { type: "string", enum: ["discovered", "warmer", "colder"] },
        reply: { type: "string" },
        nextExperiment: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              additionalProperties: false,
              properties,
              required: spec.knobs.map((knob) => knob.id),
            },
          ],
        },
      },
      required: ["verdict", "reply", "nextExperiment"],
    },
  };
}

function judgeInput(spec: WorldSpec, statement: string): string {
  return JSON.stringify({
    title: spec.title,
    mystery: spec.story.mystery,
    goal: spec.story.goal,
    knobs: spec.knobs.map((knob) => ({
      id: knob.id,
      label: knob.label,
      kind: knob.kind,
      min: knob.min,
      max: knob.max,
      step: knob.step,
      options: knob.options,
      default: knob.default,
    })),
    observables: spec.observables.map((item) => ({ id: item.id, label: item.label })),
    hiddenLaw: spec.science.hiddenLaw,
    plainStatement: spec.science.plainStatement,
    misconceptions: spec.science.misconceptions,
    statement,
  });
}

async function loadPrompt(name: "judge" | "rival"): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "src", "agents", "prompts", `${name}.md`), "utf8");
}

export async function loadAgentPrompt(name: "judge" | "rival"): Promise<string> {
  return loadPrompt(name);
}

function readExperiment(spec: WorldSpec, raw: unknown): Params | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const source = raw as Record<string, unknown>;
  const out: Params = {};
  for (const knob of spec.knobs) {
    const value = coerceKnob(knob, source[knob.id]);
    if (value !== undefined) out[knob.id] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

function coerceKnob(knob: Knob, value: unknown): Params[string] | undefined {
  if (value == null) return undefined;
  if (knob.kind === "toggle") return typeof value === "boolean" ? value : undefined;
  if (knob.kind === "slider") {
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isFinite(number)) return undefined;
    const min = knob.min ?? -Infinity;
    const max = knob.max ?? Infinity;
    return Math.min(max, Math.max(min, number));
  }
  return typeof value === "string" ? value : undefined;
}

function parseJudgePayload(raw: string): { verdict: JudgeVerdict; reply: string; nextExperiment: unknown } {
  let parsed: unknown;
  try {
    parsed = parseJsonObject(raw);
  } catch (error) {
    throw new ModelCallError(redactMessage(error));
  }
  if (!parsed || typeof parsed !== "object") throw new ModelCallError("The judge did not return JSON.");
  const body = parsed as Record<string, unknown>;
  if (body.verdict !== "discovered" && body.verdict !== "warmer" && body.verdict !== "colder") {
    throw new ModelCallError("The judge returned an unknown verdict.");
  }
  if (typeof body.reply !== "string" || !body.reply.trim()) throw new ModelCallError("The judge reply was empty.");
  return { verdict: body.verdict, reply: body.reply, nextExperiment: body.nextExperiment };
}

/** Live lane calls Muse Spark. Sample lane does not. */
export async function judgeStatement(spec: WorldSpec, statement: string): Promise<JudgeResponse> {
  if (metaSource() !== "live") return sampleJudge(spec, statement);
  try {
    const { think } = await import("@/lib/ai/meta");
    const { MODELS } = await import("@/lib/ai/models");
    const raw = await think({
      model: MODELS.spark,
      system: await loadPrompt("judge"),
      input: judgeInput(spec, statement),
      effort: "low",
      maxOutputTokens: 600,
      jsonSchema: judgeSchema(spec),
    });
    const parsed = parseJudgePayload(raw);
    const reply = scrubReply(parsed.reply, spec);
    const nextExperiment = parsed.verdict === "discovered" ? undefined : publicExperiment(spec, readExperiment(spec, parsed.nextExperiment));
    return {
      verdict: parsed.verdict,
      reply,
      ...(nextExperiment ? { nextExperiment } : {}),
      source: "live",
    };
  } catch (error) {
    if (error instanceof ModelCallError) throw error;
    throw new ModelCallError(redactMessage(error, spec));
  }
}
