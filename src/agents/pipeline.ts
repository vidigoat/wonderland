import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { lintPlayability, type PlayabilityIssue } from "@/agents/playability";
import { generateSample } from "@/agents/sample-match";
import { jsonSchemaFor, ScientistBrief, type ScientistBrief as ScientistBriefT } from "@/agents/structured";
import { runAllChecks, type CheckResult } from "@/engine/checks";
import { loadJsRules } from "@/engine/load";
import { WorldSpec, type WorldSpec as WorldSpecT } from "@/engine/spec";
import { think } from "@/lib/ai/meta";
import { reasoningSource } from "@/lib/ai/mode";
import { MODELS } from "@/lib/ai/models";
import type { DataSource } from "@/lib/samples/mark";

/**
 * Concept → verified WorldSpec.
 * Live (MODEL_API_KEY set): scientist → designer → sandbox checks → playability lint → repair.
 * Sample (no key): do not call the model. Match a hero world or ask the player to choose one.
 * Stage text never contains the hidden law; it is shown as ███.
 */

type StageName = "scientist" | "designer" | "checker" | "repair" | "artist" | "playtester" | "done";

export type PipelineEvent =
  | { type: "stage"; stage: StageName; message: string; source?: DataSource; notice?: string }
  | { type: "checks"; results: CheckResult[]; source?: DataSource; notice?: string }
  | { type: "world"; spec: WorldSpecT; source?: DataSource; notice?: string }
  | {
      type: "choose";
      message: string;
      worlds: { id: string; title: string; concept: string }[];
      source: "sample";
      notice: string;
    }
  | { type: "error"; message: string; source?: DataSource; notice?: string };

const prompt = (name: string) => fs.readFile(path.join(process.cwd(), "src/agents/prompts", `${name}.md`), "utf8");

function needles(spec?: WorldSpecT, brief?: ScientistBriefT): string[] {
  const found: string[] = [];
  if (brief) found.push(brief.law, brief.plainStatement);
  if (spec) {
    found.push(spec.science.hiddenLaw, spec.science.plainStatement);
    if (typeof spec.transfer.answerKey === "string") found.push(spec.transfer.answerKey);
    for (const prediction of spec.predictions) {
      if (typeof prediction.answerKey === "string") found.push(prediction.answerKey);
    }
  }
  return found.filter((item) => item.length > 12);
}

function redact(text: string, spec?: WorldSpecT, brief?: ScientistBriefT): string {
  let out = text;
  for (const needle of needles(spec, brief)) out = out.split(needle).join("███");
  return out;
}

function stage(name: StageName, message: string, spec?: WorldSpecT, brief?: ScientistBriefT): PipelineEvent {
  return { type: "stage", stage: name, message: redact(message, spec, brief), source: "live" };
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model did not return JSON");
  }
}

function cause(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function cleanError(error: unknown, spec?: WorldSpecT, brief?: ScientistBriefT): string {
  const text = redact(cause(error), spec, brief).replace(/\s+/g, " ").slice(0, 300);
  return text || "The model call failed. The law stays ███.";
}

async function* finishVerified(spec: WorldSpecT): AsyncGenerator<PipelineEvent> {
  yield { type: "world", spec, source: "live" };
  const problems: string[] = [];
  try {
    const art = await import("./artist");
    if (typeof art.illustrate === "function") await art.illustrate(spec);
  } catch (error) {
    problems.push(`Artist step failed: ${redact(cause(error), spec).replace(/\s+/g, " ").slice(0, 180)}`);
  }
  try {
    const storage = await import("@/lib/storage/worlds");
    if (typeof storage.saveWorld === "function") await storage.saveWorld(spec);
  } catch (error) {
    problems.push(`Saving the world failed: ${redact(cause(error), spec).replace(/\s+/g, " ").slice(0, 180)}`);
  }
  if (problems.length > 0) {
    const message = problems.join(" ");
    yield { type: "stage", stage: "artist", message, source: "live" };
    yield { type: "error", message, source: "live" };
    return;
  }
  yield stage("done", "World verified.", spec);
}

export async function* generateWorld(concept: string, maxRepairs = 3): AsyncGenerator<PipelineEvent> {
  if (reasoningSource() === "sample") {
    yield* generateSample(concept);
    return;
  }
  yield* generateLive(concept, maxRepairs);
}

async function* generateLive(concept: string, maxRepairs: number): AsyncGenerator<PipelineEvent> {
  // Schema failures propagate. They must not be replaced with a sample world.
  const scientistSchema = jsonSchemaFor("ScientistBrief", ScientistBrief);
  const worldSchema = jsonSchemaFor("WorldSpec", WorldSpec);
  let brief: ScientistBriefT | undefined;
  let spec: WorldSpecT | undefined;
  try {
    yield* generateLiveBody(concept, maxRepairs, scientistSchema, worldSchema, (next) => {
      brief = next;
    }, (next) => {
      spec = next;
    });
  } catch (error) {
    yield { type: "error", message: cleanError(error, spec, brief), source: "live" };
  }
}

async function* generateLiveBody(
  concept: string,
  maxRepairs: number,
  scientistSchema: { name: string; schema: Record<string, unknown> },
  worldSchema: { name: string; schema: Record<string, unknown> },
  setBrief: (brief: ScientistBriefT) => void,
  setSpec: (spec: WorldSpecT) => void,
): AsyncGenerator<PipelineEvent> {
  const scientistPrompt = await prompt("scientist");
  const designerPrompt = await prompt("designer");

  yield stage("scientist", `Finding the hidden law behind “${concept}”…`);
  let briefRaw = await think({
    model: MODELS.spark,
    system: scientistPrompt,
    input: concept,
    effort: "high",
    jsonSchema: scientistSchema,
  });
  let brief: ScientistBriefT;
  try {
    brief = ScientistBrief.parse(parseJson(briefRaw));
  } catch (error) {
    briefRaw = await think({
      model: MODELS.spark,
      system: scientistPrompt,
      input: `Your previous output failed validation:\n${cause(error)}\n\nPrevious output:\n${briefRaw}\n\nReturn the corrected JSON only.`,
      effort: "high",
      jsonSchema: scientistSchema,
    });
    brief = ScientistBrief.parse(parseJson(briefRaw));
  }
  setBrief(brief);

  if (brief.refuse) {
    const reason = redact(brief.reason, undefined, brief).trim();
    yield {
      type: "error",
      message: reason ? `This concept was refused. ${reason}` : "This concept was refused. It cannot be a world.",
      source: "live",
    };
    return;
  }

  yield stage("scientist", "Hidden law: ███", undefined, brief);
  yield stage("designer", "Designing the world around a law marked ███…", undefined, brief);

  let raw = await think({
    model: MODELS.wonder,
    system: designerPrompt,
    input: `Concept: ${concept}\n\nScientist brief:\n${JSON.stringify(brief)}`,
    effort: "high",
    maxOutputTokens: 20000,
    jsonSchema: worldSchema,
  });

  for (let round = 0; round <= maxRepairs; round++) {
    let spec: WorldSpecT;
    try {
      spec = WorldSpec.parse(parseJson(raw));
    } catch (error) {
      if (round === maxRepairs) break;
      yield stage("repair", "Spec didn't validate — repairing. The law stays ███.", undefined, brief);
      raw = await think({
        model: MODELS.wonder,
        system: designerPrompt,
        input: `Your previous output failed validation:\n${cause(error)}\n\nPrevious output:\n${raw}\n\nReturn the corrected WorldSpec JSON only.`,
        effort: "high",
        maxOutputTokens: 20000,
        jsonSchema: worldSchema,
      });
      continue;
    }
    setSpec(spec);

    yield stage("checker", `Running ${spec.checks.length} science checks across seeds…`, spec, brief);
    let results: CheckResult[];
    try {
      results = await runAllChecks(await loadJsRules(spec), spec);
    } catch (error) {
      if (round === maxRepairs) break;
      yield stage("repair", "Rules crashed in the sandbox — sending them back to the designer. The law stays ███.", spec, brief);
      raw = await think({
        model: MODELS.wonder,
        system: designerPrompt,
        input: `The sandboxed rules crashed:\n${redact(cause(error), spec, brief)}\n\nCurrent spec:\n${JSON.stringify(spec)}\n\nFix the rules and return the full corrected WorldSpec JSON only.`,
        effort: "high",
        maxOutputTokens: 20000,
        jsonSchema: worldSchema,
      });
      continue;
    }
    yield { type: "checks", results, source: "live" };

    const failed = results.filter((result) => !result.passed);
    if (failed.length > 0) {
      if (round === maxRepairs) break;
      yield stage("repair", `${failed.length} check(s) failed — sending them back to the designer. The law stays ███.`, spec, brief);
      raw = await think({
        model: MODELS.wonder,
        system: designerPrompt,
        input: `These checks failed:\n${JSON.stringify(failed, null, 2)}\n\nCurrent spec:\n${JSON.stringify(spec)}\n\nFix the rules and return the full corrected WorldSpec JSON only.`,
        effort: "high",
        maxOutputTokens: 20000,
        jsonSchema: worldSchema,
      });
      continue;
    }

    const rules = await loadJsRules(spec);
    const issues = await lintPlayability(rules, spec);
    if (issues.length > 0) {
      if (round === maxRepairs) break;
      yield stage(
        "repair",
        `Playability lint failed (${issues.length}). Sending notes back to the designer. The law stays ███.`,
        spec,
        brief,
      );
      raw = await think({
        model: MODELS.wonder,
        system: designerPrompt,
        input: repairNotes(issues, spec),
        effort: "high",
        maxOutputTokens: 20000,
        jsonSchema: worldSchema,
      });
      continue;
    }

    yield* finishVerified(spec);
    return;
  }

  yield {
    type: "error",
    message: "Couldn't produce a world that passes its science checks and playability lint. Try rephrasing the concept.",
    source: "live",
  };
}

function repairNotes(issues: PlayabilityIssue[], spec: WorldSpecT): string {
  return [
    "Playability lint failed. Every knob, changed across its range, must change some observable versus the default run. Every prediction.tryWith must change an observable versus the defaults.",
    "",
    JSON.stringify(issues, null, 2),
    "",
    "Current spec:",
    JSON.stringify(spec),
    "",
    "Fix the rules, knobs, or predictions and return the full corrected WorldSpec JSON only.",
  ].join("\n");
}
