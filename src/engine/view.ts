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

export type BodiesView = {
  kind: "bodies";
  planet: { r: number };
  ball: { x: number; y: number };
  trail: Array<[number, number] | { x: number; y: number }>;
};

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
  if (archetype === "bodies" && (value as BodiesView).ball && (value as BodiesView).planet) return value as BodiesView;
  if (archetype === "pipeline" && typeof (value as PipelineView).query === "string") return value as PipelineView;
  if (archetype === "field" && Array.isArray((value as FieldView).grid)) return value as FieldView;
  return null;
}
