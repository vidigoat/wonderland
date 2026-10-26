import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { runAllChecks, type CheckResult } from "@/engine/checks";
import { loadRules } from "@/engine/load";
import { WorldSpec } from "@/engine/spec";
import { think } from "@/lib/ai/meta";
import { MODELS } from "@/lib/ai/models";

/**
 * The generation pipeline: concept → verified WorldSpec.
 *   1. scientist (Spark 1.3, high effort, web-grounded)  → law, misconceptions, archetype, checks
 *   2. designer  (Wonder 1.0)                             → full WorldSpec incl. JS rules
 *   3. checker   (our engine, headless, multi-seed)       → pass/fail per check
 *   4. repair loop (≤ 3 rounds) back to the designer with failures
 *   5. artist + SAM (src/agents/artist.ts)               → sprites  [TODO: art-pipeline agent]
 *   6. playtester (open weights)                          → winnable? [TODO: rival agent]
 * Emits progress events so the UI can show the build montage (it's the demo's second "wow").
 */

export type PipelineEvent =
  | { type: "stage"; stage: "scientist" | "designer" | "checker" | "repair" | "artist" | "playtester" | "done"; message: string }
  | { type: "checks"; results: CheckResult[] }
  | { type: "world"; spec: WorldSpec }
  | { type: "error"; message: string };

const prompt = (name: string) => fs.readFile(path.join(process.cwd(), "src/agents/prompts", `${name}.md`), "utf8");

export async function* generateWorld(concept: string, maxRepairs = 3): AsyncGenerator<PipelineEvent> {
  yield { type: "stage", stage: "scientist", message: `Finding the hidden law behind “${concept}”…` };
  // TODO(agent: generator): give scientist a JSON schema (law, plainStatement, misconceptions, sources, archetype, checks, refuse)
  const brief = await think({ model: MODELS.spark, system: await prompt("scientist"), input: concept, effort: "high" });

  yield { type: "stage", stage: "designer", message: "Designing the world…" };
  // TODO(agent: generator): pass a JSON Schema generated from the zod WorldSpec (zod v4: z.toJSONSchema(WorldSpec))
  let raw = await think({ model: MODELS.wonder, system: await prompt("designer"), input: `Concept: ${concept}\n\nScientist brief:\n${brief}`, effort: "high", maxOutputTokens: 20000 });

  for (let round = 0; round <= maxRepairs; round++) {
    let spec: WorldSpec;
    try {
      spec = WorldSpec.parse(JSON.parse(raw));
    } catch (e) {
      yield { type: "stage", stage: "repair", message: `Spec didn't validate (${(e as Error).message.slice(0, 120)}) — repairing` };
      raw = await think({ model: MODELS.wonder, system: await prompt("designer"), input: `Your previous output failed validation:\n${(e as Error).message}\n\nPrevious output:\n${raw}\n\nReturn the corrected WorldSpec JSON only.` });
      continue;
    }
    yield { type: "stage", stage: "checker", message: `Running ${spec.checks.length} science checks across seeds…` };
    // TODO(agent: generator): run AI-written rules inside node:vm with a timeout (src/engine/sandbox.server.ts), not new Function.
    const results = await runAllChecks(loadRules(spec), spec);
    yield { type: "checks", results };
    const failed = results.filter((r) => !r.passed);
    if (failed.length === 0) {
      yield { type: "world", spec };
      yield { type: "stage", stage: "done", message: "World verified." };
      return;
    }
    yield { type: "stage", stage: "repair", message: `${failed.length} check(s) failed — sending back to the designer` };
    raw = await think({ model: MODELS.wonder, system: await prompt("designer"), input: `These checks failed:\n${JSON.stringify(failed, null, 2)}\n\nCurrent spec:\n${JSON.stringify(spec)}\n\nFix the rules and return the full corrected WorldSpec JSON only.` });
  }
  yield { type: "error", message: "Couldn't produce a world that passes its science checks. Try rephrasing the concept." };
}
