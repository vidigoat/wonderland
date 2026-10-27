import type { Observation, Params } from "@/engine/rules";
import type { Observable, PublicWorldSpec } from "@/engine/spec";

export function defaultParams(spec: PublicWorldSpec): Params {
  return Object.fromEntries(spec.knobs.map((knob) => [knob.id, knob.default]));
}

/** Anything smaller than this prints as 0, so a tiny negative never becomes "-0.00". */
const NEAR_ZERO = 0.005;

function trimZeros(text: string): string {
  if (!text.includes(".")) return text;
  return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function formatReading(value: number | string | undefined, display: Observable["display"] = "text"): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    if (Math.abs(value) < NEAR_ZERO) return "0";
    if (display === "counter") return String(Math.round(value));
    if (Number.isInteger(value)) return String(value);
    const abs = Math.abs(value);
    const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    return trimZeros(value.toFixed(digits));
  }
  return value;
}

const PLAIN_UNITS: Record<string, string | null> = {
  "m/s": "metres per second",
  "(m/s)²": null,
  "(m/s)^2": null,
  "veh/h": "cars each hour",
  "flashes/s": "flashes a second",
  "per step": "each step",
  "°C": "degrees",
  relative: null,
};

/** Units a player can read. Symbolic leftovers are dropped. */
export function plainUnit(unit: string | undefined): string | null {
  if (!unit || unit.trim() === "") return null;
  if (Object.prototype.hasOwnProperty.call(PLAIN_UNITS, unit)) return PLAIN_UNITS[unit] ?? null;
  if (/[/^²³()]/.test(unit)) return null;
  return unit;
}

/** A 0–1 amount that is a share, a fraction, or a "how together" score. */
export function isShareReading(id: string, label: string, value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) return false;
  return /share|fraction|proportion|percent|synchrony|alignment|polariz|order/i.test(`${id} ${label}`);
}

export function formatHudValue(
  id: string,
  label: string,
  value: number | string | undefined,
  display: Observable["display"] = "series",
  unit?: string,
): { text: string; unit: string | null } {
  if (isShareReading(id, label, value)) return { text: `${Math.round(value * 100)}%`, unit: null };
  // A counter that is really a ratio (a dune's speed against a dune of height 10) must keep its fraction.
  if (display === "counter" && typeof value === "number" && Number.isFinite(value) && Math.abs(value) < 20 && Math.abs(value - Math.round(value)) >= 0.05) {
    return { text: formatReading(value, "series"), unit: plainUnit(unit) };
  }
  return { text: formatReading(value, display), unit: plainUnit(unit) };
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
    const formatted = formatHudValue(item.id, item.label, raw, item.display, item.unit);
    return {
      id: item.id,
      label: item.label,
      value: formatted.unit ? `${formatted.text} ${formatted.unit}` : formatted.text,
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

/** The cleared strip is sown with the valley, so the picture has to be planted again when that knob moves. */
export function stripMoved(worldId: string, previous: Params, next: Params): boolean {
  return worldId === "firebreak" && previous.firebreak !== next.firebreak;
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

/** A cannon shot is over once the ball has met the ground or left. An orbit is still flying. */
export function shotSettled(obs: { status?: number | string } | null | undefined): boolean {
  return obs?.status === "landed" || obs?.status === "escaped";
}

/**
 * Steps for one gesture on Marching Dunes.
 * The saved rules use k = 0.005 and a saltation threshold of 3.5, so c = k (wind − threshold)^1.5 / height.
 * A fixed short run moves the crest by a fraction of a cell. This asks for about 18 cells, and stays short when the wind is too weak to move sand.
 */
export function duneRunSteps(wind: number, height: number): number {
  const diff = Math.max(0, wind - 3.5);
  const celerity = (0.005 * diff ** 1.5) / Math.max(1, height);
  if (celerity <= 1e-8) return 48;
  return Math.min(20000, Math.max(48, Math.ceil(18 / celerity)));
}

export function runSteps(archetype: string, worldId?: string, params?: Params): number {
  if (archetype === "pipeline") return 1;
  // Long enough for a shot above circular speed to leave (escape at 1.4 takes ~550 steps).
  if (archetype === "bodies") return 560;
  if (worldId === "dune-march") return duneRunSteps(Number(params?.windSpeed ?? 5), Number(params?.initialHeight ?? 10));
  // Kuramoto needs on the order of a thousand steps before the swarm locks. Thirty leaves it looking random.
  if (worldId === "firefly-sync-kuramoto") return 2000;
  if (archetype === "field") return 48;
  return 30;
}

/** How many simulation steps to take per frame, so a long march still finishes in one gesture. */
export function tickBatch(steps: number): number {
  if (steps <= 80) return 1;
  if (steps <= 600) return 4;
  return Math.max(1, Math.ceil(steps / 24));
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
