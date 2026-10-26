import type { Observation, Params } from "@/engine/rules";
import type { Observable, PublicWorldSpec } from "@/engine/spec";

export function defaultParams(spec: PublicWorldSpec): Params {
  return Object.fromEntries(spec.knobs.map((knob) => [knob.id, knob.default]));
}

export function formatReading(value: number | string | undefined, display: Observable["display"] = "text"): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    if (display === "counter" && Number.isInteger(value)) return String(value);
    const abs = Math.abs(value);
    if (abs >= 100) return value.toFixed(0);
    if (Number.isInteger(value)) return String(value);
    if (abs >= 10) return value.toFixed(1);
    return value.toFixed(2);
  }
  return value;
}

export function formatParam(value: Params[string] | undefined): string {
  if (typeof value === "boolean") return value ? "on" : "off";
  if (typeof value === "number") return formatReading(value, "series");
  if (typeof value === "string") return value === "" ? "—" : value;
  return "—";
}

export type ReadingLine = { id: string; label: string; value: string; spell: boolean };

export function readingLines(spec: { observables: PublicWorldSpec["observables"] }, obs: Observation | null): ReadingLine[] {
  return spec.observables.map((item) => {
    const raw = obs ? obs[item.id] : undefined;
    const value = formatReading(raw, item.display);
    return {
      id: item.id,
      label: item.label,
      value: item.unit ? `${value} ${item.unit}` : value,
      spell: item.id === "query" || item.display === "text",
    };
  });
}

/** Rows where your reading and Ada's reading are not the same. Empty until both have looked. */
export function raceRows(
  spec: { observables: PublicWorldSpec["observables"] },
  yours: Observation | null,
  hers: Observation | null,
): { id: string; label: string; yours: string; hers: string; spell: boolean }[] {
  if (!yours || !hers) return [];
  const other = new Map(readingLines(spec, hers).map((line) => [line.id, line.value]));
  return readingLines(spec, yours)
    .flatMap((line) => {
      const ada = other.get(line.id);
      if (ada == null || ada === line.value) return [];
      return [{ id: line.id, label: line.label, yours: line.value, hers: ada, spell: line.spell }];
    })
    .sort((a, b) => Number(a.spell) - Number(b.spell))
    .slice(0, 4);
}

/** The stage names the split. It does not repeat either reading. */
export const RACE_LINE = "Ada's reading is not yours.";

export function raceLine(count: number): string | null {
  return count > 0 ? RACE_LINE : null;
}

export function summariseObservation(spec: PublicWorldSpec, obs: Record<string, number | string> | undefined): string | null {
  if (!obs) return null;
  const parts = spec.observables.slice(0, 3).flatMap((item) => {
    const raw = obs[item.id];
    if (typeof raw !== "number" && typeof raw !== "string") return [];
    return [`${item.label} ${formatReading(raw, item.display)}`];
  });
  return parts.length ? parts.join(" · ") : null;
}

/** Say a knob by its label. Longer ids are replaced first so a short id cannot eat a longer one. */
export function speakTool(knobs: { id: string; label: string }[], tool: string): string {
  const ordered = [...knobs].sort((a, b) => b.id.length - a.id.length);
  let spoken = tool;
  for (const knob of ordered) {
    if (knob.id) spoken = spoken.replaceAll(knob.id, knob.label);
  }
  return spoken;
}

/** The proof's opening picture. An empty patch means the stage stays as the player left it. */
export function restageParams(current: Params, patch: Params | undefined): Params | null {
  if (!patch || Object.keys(patch).length === 0) return null;
  return { ...current, ...patch };
}

export type PictureAction =
  | { kind: "restage"; params: Params; remember: Params }
  | { kind: "resume"; params: Params }
  | { kind: "stay" };

/**
 * The new situation replaces the knobs. The follow-up question returns the trial
 * the player actually left, including a picture that was already restaged once.
 */
export function pictureAction(
  asking: 0 | 1 | null,
  current: Params,
  patch: Params | undefined,
  remembered: Params | null,
): PictureAction {
  if (asking === 1) {
    if (!remembered) return { kind: "stay" };
    return { kind: "resume", params: remembered };
  }
  if (asking != null) return { kind: "stay" };
  const base = remembered ?? current;
  const staged = restageParams(base, patch);
  if (!staged) return { kind: "stay" };
  return { kind: "restage", params: staged, remember: remembered ?? { ...current } };
}

export function describeParams(spec: PublicWorldSpec, params: Params): { id: string; label: string; value: string }[] {
  return spec.knobs
    .filter((knob) => knob.id in params)
    .map((knob) => ({ id: knob.id, label: knob.label, value: formatParam(params[knob.id]) }));
}

export function runVerb(worldId: string, archetype: string): string {
  switch (worldId) {
    case "gatekeeper":
      return "Send the scroll";
    case "peppered-forest":
      return "A generation";
    case "newtons-cannon":
      return "Fire";
    case "rumour-town":
      return "Let them talk";
    case "firebreak":
      return "Let it burn";
    default:
      if (archetype === "pipeline") return "Send it through";
      if (archetype === "bodies") return "Fire";
      if (archetype === "field") return "Let it spread";
      return "Let time pass";
  }
}

export function runSteps(archetype: string): number {
  if (archetype === "pipeline") return 1;
  // Long enough for a shot above circular speed to leave (escape at 1.4 takes ~550 steps).
  if (archetype === "bodies") return 560;
  if (archetype === "field") return 48;
  return 30;
}

/** How long one gesture should stay on screen, so a shot can travel and a fire can spread. */
export function runDuration(steps: number): number {
  if (steps <= 1) return 1100;
  if (steps > 200) return 5200;
  return Math.min(3600, Math.max(1400, steps * 20));
}

const BIRTH_KNOBS: Record<string, readonly string[]> = {
  "rumour-town": ["rumourSeeds", "reserveRatio"],
  "peppered-forest": ["startDarkness"],
};

/** A new shot, a new planting, or a knob that only matters at the beginning. */
export function freshStart(worldId: string, archetype: string, birth: Params, current: Params): boolean {
  if (archetype === "bodies" || archetype === "field") return true;
  const keys = BIRTH_KNOBS[worldId] ?? [];
  return keys.some((key) => birth[key] !== current[key]);
}
