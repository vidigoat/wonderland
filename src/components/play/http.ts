import type { Params } from "@/engine/rules";
import type { DataSource } from "@/lib/samples/mark";

export const ADA_WIRING = "Ada is still wiring her instruments";

export type JudgeBody = {
  verdict: "discovered" | "warmer" | "colder";
  reply: string;
  source?: DataSource;
  notice?: string;
  nextExperiment?: Params;
};

export type RivalTurn = {
  thought: string;
  tool: string;
  params: Params;
  observation?: Record<string, number | string>;
};

export type RivalBody = {
  source?: DataSource;
  notice?: string;
  turn: RivalTurn;
};

export type TranscriptBody = {
  text: string | null;
  notice?: string;
  source?: DataSource;
};

const LAW_LEAK = /hiddenLaw|answerKey|plainStatement/;

export function safeText(text: string): string {
  if (LAW_LEAK.test(text)) return "";
  return text;
}

export function errorMessage(body: string, status: number): string {
  const trimmed = body.trim();
  if (!trimmed) return `The request failed (${status}).`;
  try {
    const json = JSON.parse(trimmed) as { error?: unknown; message?: unknown };
    if (typeof json.error === "string" && json.error) return safeText(json.error) || `The request failed (${status}).`;
    if (typeof json.message === "string" && json.message) return safeText(json.message) || `The request failed (${status}).`;
  } catch {
    /* plain text */
  }
  return safeText(trimmed.slice(0, 400)) || `The request failed (${status}).`;
}

export function predictionRequest(worldId: string, predictionId: string, choice: number | string) {
  return { worldId, kind: "prediction" as const, predictionId, choice };
}

export function transferRequest(worldId: string, statement: string, choice: number | string) {
  return { worldId, kind: "transfer" as const, statement, choice };
}

export function rivalRequest(worldId: string, seed: number, params: Params) {
  return { worldId, seed, params };
}

export function readGrade(value: unknown): boolean | null {
  if (!value || typeof value !== "object") return null;
  const correct = (value as { correct?: unknown }).correct;
  return typeof correct === "boolean" ? correct : null;
}

function readSource(value: unknown): DataSource | undefined {
  return value === "live" || value === "sample" ? value : undefined;
}

export function asKnobParams(value: unknown, knobIds?: readonly string[]): Params | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Params = {};
  for (const [key, raw] of Object.entries(value)) {
    if (knobIds && !knobIds.includes(key)) continue;
    if (typeof raw === "number" || typeof raw === "boolean" || typeof raw === "string") out[key] = raw;
  }
  return Object.keys(out).length ? out : null;
}

export function readJudge(value: unknown, knobIds?: readonly string[]): JudgeBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.verdict !== "discovered" && v.verdict !== "warmer" && v.verdict !== "colder") return null;
  if (typeof v.reply !== "string") return null;
  const reply = safeText(v.reply);
  const next = asKnobParams(v.nextExperiment, knobIds) ?? undefined;
  return {
    verdict: v.verdict,
    reply,
    source: readSource(v.source),
    notice: typeof v.notice === "string" ? v.notice : undefined,
    nextExperiment: next,
  };
}

export function readTranscript(value: unknown): TranscriptBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!("text" in v)) return null;
  if (v.text !== null && typeof v.text !== "string") return null;
  return {
    text: v.text === null ? null : safeText(v.text),
    notice: typeof v.notice === "string" ? v.notice : undefined,
    source: readSource(v.source),
  };
}

function readObservation(value: unknown): Record<string, number | string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, number | string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" || typeof raw === "string") out[key] = raw;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Ada may send a tool name or the structured tool the rival route returns. */
export function describeTool(tool: unknown): string | null {
  if (typeof tool === "string") {
    const name = safeText(tool.trim());
    return name || null;
  }
  if (!tool || typeof tool !== "object") return null;
  const record = tool as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name : "";
  if (!name) return null;
  if (name === "set_knob") return safeText(`set knob ${String(record.id)} → ${String(record.value)}`);
  if (name === "run") return safeText(`run ${String(record.steps)} steps`);
  if (name === "observe") return "observe";
  if (name === "hypothesise" || name === "hypothesize") {
    const statement = typeof record.statement === "string" ? safeText(record.statement) : "";
    return statement ? `hypothesise: ${statement}` : "hypothesise";
  }
  return safeText(name) || null;
}

export function readRival(value: unknown): RivalBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.thought !== "string") return null;
  const thought = safeText(v.thought);
  const tool = describeTool(v.tool);
  if (!thought || !tool) return null;
  return {
    source: readSource(v.source),
    notice: typeof v.notice === "string" ? v.notice : undefined,
    turn: {
      thought,
      tool,
      params: asKnobParams(v.params) ?? {},
      observation: readObservation(v.observation),
    },
  };
}

/** Ribbon for the landing. Craft: only when models are on the sample lane, and the notice is verbatim. */
export function statusRibbon(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const data = value as { models?: unknown; notice?: unknown };
  if (data.models !== "sample") return null;
  return typeof data.notice === "string" && data.notice ? data.notice : null;
}

export function sampleNotice(source: DataSource | undefined, notice: string | undefined): string | null {
  if (source !== "sample") return null;
  return notice ?? null;
}
