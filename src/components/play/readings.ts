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

export function readingLines(spec: PublicWorldSpec, obs: Observation | null): { id: string; label: string; value: string; spell: boolean }[] {
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

export function summariseObservation(spec: PublicWorldSpec, obs: Record<string, number | string> | undefined): string | null {
  if (!obs) return null;
  const parts = spec.observables.slice(0, 3).flatMap((item) => {
    const raw = obs[item.id];
    if (typeof raw !== "number" && typeof raw !== "string") return [];
    return [`${item.label} ${formatReading(raw, item.display)}`];
  });
  return parts.length ? parts.join(" · ") : null;
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
  return archetype === "pipeline" ? 1 : 30;
}
