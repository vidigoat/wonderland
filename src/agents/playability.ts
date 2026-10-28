import { runHeadless } from "@/engine/runtime";
import type { Params, RulesModule } from "@/engine/rules";
import type { Knob, WorldSpec } from "@/engine/spec";

/**
 * Pure playability check. No network.
 * Built-in hero worlds are skipped: a lint failure must not weaken them.
 * A knob passes when some value across its range changes an observable versus the default run.
 * A prediction passes when its tryWith changes an observable versus the defaults.
 */
export type PlayabilityIssue = {
  kind: "knob" | "prediction";
  id: string;
  note: string;
};

const STEPS = 12;
const SEED = 1;

export function defaultsOf(spec: WorldSpec): Params {
  return Object.fromEntries(spec.knobs.map((knob) => [knob.id, knob.default]));
}

function stable(value: unknown): string {
  return JSON.stringify(value);
}

/** Values a player can actually move the knob to, excluding the default. */
export function valuesAcrossRange(knob: Knob): Array<number | boolean | string> {
  const candidates: Array<number | boolean | string> = [];
  if (knob.kind === "slider") {
    if (typeof knob.min === "number") candidates.push(knob.min);
    if (typeof knob.max === "number") candidates.push(knob.max);
    if (typeof knob.min === "number" && typeof knob.max === "number" && knob.max !== knob.min) {
      candidates.push((knob.min + knob.max) / 2);
    }
  } else if (knob.kind === "toggle") {
    candidates.push(knob.default === true ? false : true);
  } else if (knob.kind === "choice") {
    for (const option of knob.options ?? []) candidates.push(option);
  } else {
    const current = String(knob.default);
    candidates.push(current.length === 0 ? "x" : `${current}~`);
  }

  const seen = new Set<string>();
  const unique: Array<number | boolean | string> = [];
  for (const value of candidates) {
    if (value === knob.default) continue;
    const key = stable(value);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

function clip(error: unknown, spec: WorldSpec): string {
  const raw = error instanceof Error ? error.message : String(error);
  const hidden = [spec.science.hiddenLaw, spec.science.plainStatement].filter((item) => item.length > 0);
  let text = raw;
  for (const needle of hidden) text = text.split(needle).join("███");
  return text.replace(/\s+/g, " ").slice(0, 160);
}

async function fingerprint(rules: RulesModule, params: Params): Promise<string> {
  const { history } = await runHeadless(rules, params, STEPS, SEED);
  return stable(history);
}

export async function lintPlayability(rules: RulesModule, spec: WorldSpec): Promise<PlayabilityIssue[]> {
  if (spec.rules.kind === "builtin") return [];

  const defaults = defaultsOf(spec);
  let baseline: string;
  try {
    baseline = await fingerprint(rules, defaults);
  } catch (error) {
    return [
      {
        kind: "knob",
        id: spec.knobs[0]?.id ?? "run",
        note: `Default run crashed: ${clip(error, spec)}`,
      },
    ];
  }

  const issues: PlayabilityIssue[] = [];
  for (const knob of spec.knobs) {
    const probes = valuesAcrossRange(knob);
    if (probes.length === 0) {
      issues.push({
        kind: "knob",
        id: knob.id,
        note: `Knob ${knob.id} has no value different from its default, so it cannot change an observable.`,
      });
      continue;
    }
    let changed = false;
    let crash = "";
    for (const value of probes) {
      try {
        const next = await fingerprint(rules, { ...defaults, [knob.id]: value });
        if (next !== baseline) {
          changed = true;
          break;
        }
      } catch (error) {
        crash = clip(error, spec);
      }
    }
    if (!changed) {
      issues.push({
        kind: "knob",
        id: knob.id,
        note: crash
          ? `Changing ${knob.id} across its range crashed: ${crash}`
          : `Changing ${knob.id} across its range did not change any observable versus the default run.`,
      });
    }
  }

  for (const prediction of spec.predictions) {
    if (!prediction.tryWith) continue;
    const params = { ...defaults, ...prediction.tryWith };
    if (stable(params) === stable(defaults)) {
      issues.push({
        kind: "prediction",
        id: prediction.id,
        note: `prediction ${prediction.id} tryWith matches the defaults, so it cannot change an observable.`,
      });
      continue;
    }
    try {
      const next = await fingerprint(rules, params);
      if (next === baseline) {
        issues.push({
          kind: "prediction",
          id: prediction.id,
          note: `prediction ${prediction.id} tryWith did not change any observable versus the default run.`,
        });
      }
    } catch (error) {
      issues.push({
        kind: "prediction",
        id: prediction.id,
        note: `prediction ${prediction.id} tryWith crashed: ${clip(error, spec)}`,
      });
    }
  }

  return issues;
}
