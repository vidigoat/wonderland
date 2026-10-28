import { createRng } from "@/engine/rng";
import type { Observation, Params, RulesModule } from "@/engine/rules";
import type { WorldSpec } from "@/engine/spec";
import { defaultsOf, valuesAcrossRange } from "./playability";

/**
 * Honest-readings check. No network.
 * A reading must measure the world, not restate the controls. The science checks can't tell the two apart:
 * a model can write `observe` as a formula of the knobs, and every check on that formula passes.
 *
 * The test swaps the world under a reading. Run the world on the defaults, and again with one knob moved.
 * If a reading changed between the two runs, observe the default world while telling it the moved setting.
 * A reading that measures the world keeps (roughly) the default world's value. A reading that only restates
 * the controls jumps to the moved run's value, though nothing in the world it was given has changed.
 */
export type HonestyIssue = { kind: "reading"; id: string; knob: string; note: string };

const STEPS = 30;
const SEED = 1;

async function finalState(rules: RulesModule, params: Params): Promise<unknown> {
  const rng = createRng(SEED);
  let state = await rules.init(params, rng);
  for (let i = 0; i < STEPS; i++) state = await rules.step(state, params, rng);
  return state;
}

function same(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  }
  return String(a) === String(b);
}

export async function lintHonestReadings(rules: RulesModule, spec: WorldSpec): Promise<HonestyIssue[]> {
  if (spec.rules.kind === "builtin") return [];
  const defaults = defaultsOf(spec);
  const ids = spec.observables.map((item) => item.id);
  const flagged = new Map<string, HonestyIssue>();

  let base: { state: unknown; reading: Observation };
  try {
    const state = await finalState(rules, defaults);
    base = { state, reading: rules.observe(state, defaults) };
  } catch {
    // A crash is the playability lint's to report.
    return [];
  }

  for (const knob of spec.knobs) {
    for (const value of valuesAcrossRange(knob)) {
      const moved = { ...defaults, [knob.id]: value };
      let reading: Observation;
      let swapped: Observation;
      try {
        reading = rules.observe(await finalState(rules, moved), moved);
        swapped = rules.observe(base.state, moved);
      } catch {
        continue;
      }
      for (const id of ids) {
        if (flagged.has(id) || !(id in reading)) continue;
        if (same(base.reading[id], reading[id])) continue;
        if (same(swapped[id], reading[id]) && !same(swapped[id], base.reading[id])) {
          flagged.set(id, {
            kind: "reading",
            id,
            knob: knob.id,
            note: `Reading ${id} follows the control ${knob.id}, not the world: given the default world and the moved setting, it reported the moved run's value (${reading[id]}) although nothing in that world changed. Compute ${id} from the state the world produced, never from params.`,
          });
        }
      }
    }
  }
  return [...flagged.values()];
}
