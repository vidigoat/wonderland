import type { Rng } from "./rng";

export type Params = Record<string, number | boolean | string>;
export type Observation = Record<string, number | string>;

/**
 * Every world — hand-authored or AI-written — implements this. Pure and deterministic given (seed, params).
 * `state` is plain JSON-serialisable data so it can cross a Web Worker boundary and be snapshotted.
 */
export interface RulesModule<S = unknown> {
  init(params: Params, rng: Rng): S | Promise<S>;
  step(state: S, params: Params, rng: Rng): S | Promise<S>;
  observe(state: S, params: Params): Observation;
  /** Optional: what the renderer draws. Archetype-specific shape, see src/engine/archetypes. */
  view?(state: S, params: Params): unknown;
}

/**
 * Compile AI-written JS into a RulesModule.
 * The source is the body of a module that assigns `exports.init/step/observe/view`.
 * On the server this must run inside node:vm with a timeout (see src/engine/sandbox.server.ts);
 * in the browser inside a Web Worker. Never eval AI code on the main thread.
 */
export function compileRules(source: string): RulesModule {
  const exports: Partial<RulesModule> = {};
  const factory = new Function("exports", "Math", `"use strict";\n${source}\nreturn exports;`);
  const safeMath = Object.freeze({ ...Object.fromEntries(Object.getOwnPropertyNames(Math).map((k) => [k, (Math as never)[k]])), random: () => { throw new Error("Use rng, not Math.random"); } });
  factory(exports, safeMath);
  if (typeof exports.init !== "function" || typeof exports.step !== "function" || typeof exports.observe !== "function") {
    throw new Error("Rules source must define exports.init, exports.step and exports.observe");
  }
  return exports as RulesModule;
}
