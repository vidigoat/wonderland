import type { Archetype } from "./spec";

/** What `rules.view()` returns. x/y are 0–1, except bodies, which are in planet radii. */

export type PopulationAgent = {
  id: string | number;
  x: number;
  y: number;
  /** 0–1. Peppered moths: darkness. Rumour Town: worry. */
  tint: number;
  sprite: string;
  bubble?: string | null;
};

export type PopulationView = {
  kind: "population";
  agents: PopulationAgent[];
  /** Rumour Town: whether the building on the square still takes deposits. */
  doors?: "open" | "shut";
};

export type CannonView = {
  kind: "bodies";
  planet: { r: number };
  ball: { x: number; y: number };
  trail: Array<[number, number] | { x: number; y: number }>;
};

/** Generic many-body view for AI-written worlds: positions inside `bounds`, optional size and colour. */
export type ParticlesView = {
  kind: "bodies";
  bounds: { x: number; y: number; w: number; h: number };
  bodies: Array<{ id?: string | number; x: number; y: number; radius?: number; color?: string }>;
};

export type BodiesView = CannonView | ParticlesView;

export function isParticlesView(view: BodiesView): view is ParticlesView {
  return Array.isArray((view as ParticlesView).bodies);
}

export type PipelineView = {
  kind: "pipeline";
  stages: string[];
  query: string;
  rows: unknown[];
  error: string | null;
};

/**
 * Scalar field, values roughly 0–1.
 * The Firebreak uses a small set: 0 empty, 0.12 ash, 0.35 tree, 1 flame.
 * Other fields may be continuous.
 */
export type FieldView = {
  kind: "field";
  grid: number[][];
  w: number;
  h: number;
};

export type WorldView = PopulationView | BodiesView | PipelineView | FieldView;

export function asWorldView(value: unknown, archetype: Archetype): WorldView | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { kind?: string };
  if (v.kind !== archetype) return null;
  if (archetype === "population" && Array.isArray((value as PopulationView).agents)) return value as PopulationView;
  if (archetype === "bodies" && (value as CannonView).ball && (value as CannonView).planet) return value as CannonView;
  if (archetype === "bodies" && Array.isArray((value as ParticlesView).bodies)) {
    const b = (value as Partial<ParticlesView>).bounds;
    const bounds = b && [b.x, b.y, b.w, b.h].every((n) => typeof n === "number" && Number.isFinite(n)) && b.w > 0 && b.h > 0 ? b : { x: 0, y: 0, w: 1, h: 1 };
    return { kind: "bodies", bounds, bodies: (value as ParticlesView).bodies } as ParticlesView;
  }
  if (archetype === "pipeline" && typeof (value as PipelineView).query === "string") return value as PipelineView;
  if (archetype === "field" && Array.isArray((value as FieldView).grid)) return value as FieldView;
  return null;
}
