import { z } from "zod";

/**
 * WorldSpec — the contract between the AI (which writes specs) and the engine (which runs them).
 * The model never writes a whole game. It fills in this shape; our engine supplies the polish.
 * Anything in `science.hiddenLaw` and any `answerKey` must NEVER be sent to the client during play.
 */

export const Archetype = z.enum(["pipeline", "population", "bodies", "field"]);
export type Archetype = z.infer<typeof Archetype>;

export const Knob = z.object({
  id: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
  label: z.string(),
  kind: z.enum(["slider", "toggle", "text", "choice"]),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  options: z.array(z.string()).optional(),
  default: z.union([z.number(), z.boolean(), z.string()]),
  hint: z.string().optional(),
});
export type Knob = z.infer<typeof Knob>;

export const Observable = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string().optional(),
  display: z.enum(["counter", "series", "histogram", "text"]).default("series"),
});
export type Observable = z.infer<typeof Observable>;

export const Entity = z.object({
  id: z.string(),
  label: z.string(),
  /** Prompt for Muse Image (rendered on a flat background, then cut out). */
  artPrompt: z.string(),
  /** Short noun phrase SAM 3.1 uses to segment the entity out of the render. */
  segmentPrompt: z.string(),
});
export type Entity = z.infer<typeof Entity>;

export const Prediction = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).min(2).optional(),
  /** Hidden. Index into options, or free-text rubric for the judge. */
  answerKey: z.union([z.number(), z.string()]),
  /** Knob settings the player should try after predicting. */
  tryWith: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])).optional(),
});
export type Prediction = z.infer<typeof Prediction>;

export const Assertion = z.object({
  observable: z.string(),
  op: z.enum(["gt", "lt", "approx", "trendUp", "trendDown", "flat", "eq"]),
  value: z.union([z.number(), z.string()]).optional(),
  tolerance: z.number().optional(),
});
export type Assertion = z.infer<typeof Assertion>;

export const Check = z.object({
  id: z.string(),
  description: z.string(),
  params: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])).default({}),
  steps: z.number().int().positive().max(100_000),
  seeds: z.array(z.number().int()).default([1, 2, 3]),
  assert: Assertion,
});
export type Check = z.infer<typeof Check>;

const ART_URL = /^\/art\/[a-z0-9-]+\/[A-Za-z0-9-]+\.(webp|png|jpg|svg)$/;

export const PaintedArt = z.object({
  background: z.string().regex(ART_URL).optional(),
  sprites: z.record(z.string(), z.string().regex(ART_URL)),
});
export type PaintedArt = z.infer<typeof PaintedArt>;

export const WorldSpec = z.object({
  id: z.string(),
  version: z.literal(1),
  concept: z.string(),
  title: z.string(),
  tagline: z.string(),
  archetype: Archetype,
  science: z.object({
    hiddenLaw: z.string(),
    plainStatement: z.string(),
    misconceptions: z.array(z.string()),
    sources: z.array(z.object({ title: z.string(), url: z.string().url() })),
  }),
  story: z.object({
    setting: z.string(),
    mystery: z.string(),
    goal: z.string(),
  }),
  knobs: z.array(Knob).min(1).max(6),
  observables: z.array(Observable).min(1).max(6),
  entities: z.array(Entity).min(1).max(8),
  /**
   * Rules: either a built-in module key (hand-authored hero worlds) or JS source the AI wrote.
   * JS source must export `init`, `step`, `observe` — see src/engine/rules.ts.
   */
  rules: z.union([
    z.object({ kind: z.literal("builtin"), module: z.string() }),
    z.object({ kind: z.literal("js"), source: z.string().max(20_000) }),
  ]),
  predictions: z.array(Prediction).min(1).max(5),
  transfer: z.object({
    setup: z.string(),
    params: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])),
    question: z.string(),
    options: z.array(z.string()).optional(),
    answerKey: z.union([z.number(), z.string()]),
  }),
  checks: z.array(Check).min(2).max(12),
  art: z.object({
    style: z.string(),
    background: z.string(),
    /** Set by the artist after Muse Image and SAM 3.1 have painted this world. Local files only. */
    painted: PaintedArt.optional(),
  }),
});
export type WorldSpec = z.infer<typeof WorldSpec>;

/** What the browser is allowed to see while playing. Checks, answers, and suggested knob settings stay on the server. */
export type PublicWorldSpec = Omit<WorldSpec, "science" | "predictions" | "transfer" | "checks"> & {
  predictions: Omit<Prediction, "answerKey" | "tryWith">[];
  transfer: Omit<WorldSpec["transfer"], "answerKey">;
};

export function toPublic(spec: WorldSpec): PublicWorldSpec {
  const { predictions, transfer, checks, ...rest } = spec;
  const { science, ...visible } = rest;
  void science;
  void checks;
  return {
    ...visible,
    predictions: predictions.map((p) => {
      const { answerKey, tryWith, ...shown } = p;
      void answerKey;
      void tryWith;
      return shown;
    }),
    transfer: (() => {
      const { answerKey, ...shown } = transfer;
      void answerKey;
      return shown;
    })(),
  };
}
