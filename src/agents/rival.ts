import "server-only";
import type { Observation, Params } from "@/engine/rules";
import type { Knob, WorldSpec } from "@/engine/spec";
import { loadRules } from "@/engine/load";
import { runHeadless } from "@/engine/runtime";
import { openWeightsSource } from "@/lib/ai/mode";
import type { DataSource } from "@/lib/samples/mark";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";
import { benchParams, loadAgentPrompt, ModelCallError, parseJsonObject, redactMessage, scrubReply, textIsPublic } from "@/agents/judge";

/**
 * Ada, the open-weights rival. One tool per request, executed on runHeadless with the caller's seed.
 * Sample lane: a fixed cycle of thoughts. It does not invent a model transcript.
 */

export type RivalTool =
  | { name: "set_knob"; id: string; value: number | boolean | string }
  | { name: "run"; steps: number }
  | { name: "observe" }
  | { name: "hypothesise"; statement: string };

export type RivalResponse = {
  source: DataSource;
  notice?: string;
  thought: string;
  tool: RivalTool;
  params: Params;
  observation?: Observation;
};

export const SAMPLE_THOUGHTS = [
  "One knob only. I want a clean comparison.",
  "Running it now, with nothing else moved.",
  "I want to read the meters before I guess.",
  "A rough guess, and I know it is incomplete.",
] as const;

/** Incomplete on purpose. A misconception is allowed. None of these is a hidden law. */
export const SAMPLE_HYPOTHESES: Record<string, string> = {
  gatekeeper: "Maybe the vault opens for anyone who writes a long password.",
  "peppered-forest": "I think each moth slowly darkens itself when the bark gets sooty.",
  "newtons-cannon": "Perhaps gravity switches off once the ball is moving fast.",
  "rumour-town": "I suspect the bank fails only when its loans have gone bad.",
  firebreak: "Maybe a denser valley only burns a little more, in proportion.",
};

export const SAMPLE_HYPOTHESIS_FALLBACK = "I only have a partial guess so far.";

const SAMPLE_RUN_STEPS: Record<string, number> = {
  gatekeeper: 1,
  "peppered-forest": 8,
  "newtons-cannon": 30,
  "rumour-town": 6,
  firebreak: 12,
};

const MAX_STEPS = 4000;

const turns = new Map<string, number>();
const transcripts = new Map<string, RivalResponse[]>();

export function resetRivalMemory(): void {
  turns.clear();
  transcripts.clear();
}

export function takeTurn(worldId: string, seed: number, requested: unknown): number {
  if (typeof requested === "number" && Number.isInteger(requested) && requested >= 0 && requested < 10_000) return requested;
  const key = memoryKey(worldId, seed);
  const turn = turns.get(key) ?? 0;
  turns.set(key, turn + 1);
  return turn;
}

function memoryKey(worldId: string, seed: number): string {
  return `${worldId}:${seed}`;
}

export function sampleRunSteps(worldId: string): number {
  return SAMPLE_RUN_STEPS[worldId] ?? 8;
}

function probe(knob: Knob, current: Params[string]): number | boolean | string {
  if (knob.kind === "toggle") return current !== true;
  if (knob.kind === "slider") {
    const min = knob.min ?? 0;
    const max = knob.max ?? 1;
    return current !== max ? max : min;
  }
  if (knob.kind === "choice" && knob.options?.length) {
    return knob.options.find((option) => option !== current) ?? knob.options[0];
  }
  return current === "visitor" ? "guest" : "visitor";
}

/** Sample lane policy. `turn` 0 changes one knob, then run, observe, and an incomplete guess. */
export function sampleRivalPlan(spec: WorldSpec, params: Params, turn: number): { thought: string; tool: RivalTool } {
  const safeTurn = Number.isInteger(turn) && turn >= 0 ? turn : 0;
  const phase = safeTurn % 4;
  const thought = SAMPLE_THOUGHTS[phase] ?? SAMPLE_THOUGHTS[0];
  const current = benchParams(spec, params);
  if (phase === 0) {
    const knob = spec.knobs[Math.floor(safeTurn / 4) % spec.knobs.length];
    return { thought, tool: { name: "set_knob", id: knob.id, value: probe(knob, current[knob.id]) } };
  }
  if (phase === 1) return { thought, tool: { name: "run", steps: sampleRunSteps(spec.id) } };
  if (phase === 2) return { thought, tool: { name: "observe" } };
  const statement = SAMPLE_HYPOTHESES[spec.id] ?? SAMPLE_HYPOTHESIS_FALLBACK;
  return { thought, tool: { name: "hypothesise", statement } };
}

async function applyTool(spec: WorldSpec, seed: number, params: Params, tool: RivalTool): Promise<{ params: Params; observation?: Observation }> {
  const current = benchParams(spec, params);
  if (tool.name === "set_knob") {
    const knob = spec.knobs.find((item) => item.id === tool.id);
    if (!knob) return { params: current };
    const value = typeof tool.value === "string" && !textIsPublic(tool.value, spec) ? current[knob.id] : tool.value;
    return { params: benchParams(spec, { ...current, [knob.id]: value }) };
  }
  if (tool.name === "hypothesise") return { params: current };
  const steps = tool.name === "run" ? tool.steps : 0;
  const result = await runHeadless(loadRules(spec), current, steps, seed);
  return { params: current, observation: result.final };
}

function remember(spec: WorldSpec, seed: number, response: RivalResponse): void {
  const key = memoryKey(spec.id, seed);
  const prev = transcripts.get(key) ?? [];
  const stored = textIsPublic(JSON.stringify(response), spec) ? response : { ...response, thought: scrubReply(response.thought, spec) };
  transcripts.set(key, [...prev, stored].slice(-8));
}

function priorHistory(spec: WorldSpec, seed: number, incoming: unknown): unknown[] {
  const raw = Array.isArray(incoming) ? incoming : (transcripts.get(memoryKey(spec.id, seed)) ?? []);
  return raw.slice(-8).filter((item) => textIsPublic(JSON.stringify(item ?? ""), spec));
}

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "set_knob",
      description: "Change one public knob before the next run.",
      parameters: {
        type: "object",
        properties: {
          thought: { type: "string", description: "One short sentence, at most 25 words." },
          id: { type: "string" },
          value: { anyOf: [{ type: "number" }, { type: "boolean" }, { type: "string" }] },
        },
        required: ["id", "value"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run",
      description: "Run the world from the start with the current knobs.",
      parameters: {
        type: "object",
        properties: {
          thought: { type: "string" },
          steps: { type: "integer", minimum: 1, maximum: MAX_STEPS },
        },
        required: ["steps"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "observe",
      description: "Read the starting meters for the current knobs.",
      parameters: {
        type: "object",
        properties: { thought: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "hypothesise",
      description: "Write an incomplete guess. You do not know the hidden law.",
      parameters: {
        type: "object",
        properties: {
          thought: { type: "string" },
          statement: { type: "string" },
        },
        required: ["statement"],
      },
    },
  },
];

function readSteps(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(number) || number < 1) return null;
  return Math.min(number, MAX_STEPS);
}

function coerceLiveValue(spec: WorldSpec, knob: Knob, value: unknown): number | boolean | string | undefined {
  if (knob.kind === "toggle") {
    if (typeof value === "boolean") return value;
    return undefined;
  }
  if (knob.kind === "slider") {
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isFinite(number)) return undefined;
    const min = knob.min ?? -Infinity;
    const max = knob.max ?? Infinity;
    return Math.min(max, Math.max(min, number));
  }
  if (typeof value !== "string") return undefined;
  if (!textIsPublic(value, spec)) return undefined;
  if (knob.kind === "choice" && knob.options && !knob.options.includes(value)) return undefined;
  return value;
}

function toolFromModel(spec: WorldSpec, name: string, args: Record<string, unknown>): RivalTool {
  if (name === "set_knob") {
    const id = typeof args.id === "string" ? args.id : "";
    const knob = spec.knobs.find((item) => item.id === id);
    if (!knob) throw new ModelCallError("The rival chose a knob that is not on the bench.");
    const value = coerceLiveValue(spec, knob, args.value);
    if (value === undefined) throw new ModelCallError("The rival tool was refused.");
    return { name: "set_knob", id, value };
  }
  if (name === "run") {
    const steps = readSteps(args.steps);
    if (steps == null) throw new ModelCallError("The rival run length was not usable.");
    return { name: "run", steps };
  }
  if (name === "observe") return { name: "observe" };
  if (name === "hypothesise") {
    if (typeof args.statement !== "string" || !args.statement.trim()) throw new ModelCallError("The rival hypothesis was empty.");
    return { name: "hypothesise", statement: scrubReply(args.statement.trim(), spec).slice(0, 280) };
  }
  throw new ModelCallError("The rival called an unknown tool.");
}

function rivalBrief(spec: WorldSpec, params: Params, history: unknown[]): string {
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
      options: knob.options,
      default: knob.default,
    })),
    observables: spec.observables.map((item) => ({ id: item.id, label: item.label })),
    params,
    history,
  });
}

function spokenThought(content: string | null | undefined, args: Record<string, unknown>, spec: WorldSpec): string {
  const fromMessage = typeof content === "string" ? content.trim() : "";
  const fromArgs = typeof args.thought === "string" ? args.thought.trim() : "";
  return scrubReply(fromMessage || fromArgs, spec).slice(0, 400);
}

async function liveRival(spec: WorldSpec, seed: number, params: Params, history: unknown): Promise<RivalResponse> {
  try {
    const { openWeights } = await import("@/lib/ai/clients");
    const { client, model } = openWeights();
    const current = benchParams(spec, params);
    const prior = priorHistory(spec, seed, history);
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: 300,
      stream: false,
      parallel_tool_calls: false,
      tool_choice: "required",
      tools: TOOLS,
      messages: [
        { role: "system", content: await loadAgentPrompt("rival") },
        { role: "user", content: rivalBrief(spec, current, prior) },
      ],
    });
    const message = completion.choices[0]?.message;
    const call = message?.tool_calls?.[0];
    if (!call || call.type !== "function" || !call.function.name) throw new ModelCallError("The rival did not call a tool.");
    let args: Record<string, unknown> = {};
    if (call.function.arguments) {
      const parsed = parseJsonObject(call.function.arguments);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ModelCallError("The rival tool arguments were empty.");
      args = parsed as Record<string, unknown>;
    }
    const tool = toolFromModel(spec, call.function.name, args);
    const thought = spokenThought(message?.content, args, spec);
    const applied = await applyTool(spec, seed, current, tool);
    const response: RivalResponse = {
      source: "live",
      thought,
      tool,
      params: applied.params,
      ...(applied.observation ? { observation: applied.observation } : {}),
    };
    remember(spec, seed, response);
    return response;
  } catch (error) {
    if (error instanceof ModelCallError) throw error;
    throw new ModelCallError(redactMessage(error, spec));
  }
}

export async function rivalTurn(spec: WorldSpec, seed: number, params: Params, turn: number, history?: unknown): Promise<RivalResponse> {
  if (openWeightsSource() !== "live") {
    const plan = sampleRivalPlan(spec, params, turn);
    const applied = await applyTool(spec, seed, params, plan.tool);
    const response: RivalResponse = {
      source: "sample",
      notice: SAMPLE_NOTICE,
      thought: plan.thought,
      tool: plan.tool,
      params: applied.params,
      ...(applied.observation ? { observation: applied.observation } : {}),
    };
    remember(spec, seed, response);
    return response;
  }
  return liveRival(spec, seed, params, history);
}
