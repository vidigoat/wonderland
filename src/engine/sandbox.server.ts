import vm from "node:vm";
import type { Observation, RulesModule } from "./rules";

/** Per init/step/observe/view call. Tests may pass a shorter timeout. */
export const SANDBOX_TIMEOUT_MS = 1000;

export type SandboxOptions = {
  timeoutMs?: number;
};

const BANNED_GLOBALS = ["process", "require", "fetch", "global", "Buffer", "module"] as const;

function safeMath(): Readonly<Record<string, unknown>> {
  const math: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(Math)) {
    const value = (Math as unknown as Record<string, unknown>)[key];
    math[key] = typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(Math) : value;
  }
  math.random = () => {
    throw new Error("Use rng, not Math.random");
  };
  return Object.freeze(math);
}

/**
 * Compile AI-written rules inside node:vm.
 * Same source contract as compileRules: the body assigns exports.init/step/observe/view.
 * Each call is capped at timeoutMs. process, require, fetch, and Node's global are not available.
 * Math.random throws. This file must stay free of the server-only import so tests can load it.
 */
export function compileSandboxed(source: string, options?: SandboxOptions): RulesModule {
  const timeoutMs = options?.timeoutMs ?? SANDBOX_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Sandbox timeout must be a positive integer");
  }

  const exportsObject: Record<string, unknown> = Object.create(null);
  const raw: Record<string, unknown> = Object.create(null);
  raw.exports = exportsObject;
  raw.Math = safeMath();
  const context = vm.createContext(raw);
  for (const banned of BANNED_GLOBALS) {
    if (banned in context) delete context[banned];
  }

  const program = new vm.Script(`"use strict";\n${source}\n`, { filename: "ai-rules.js" });
  program.runInContext(context, { timeout: timeoutMs });

  if (
    typeof exportsObject.init !== "function" ||
    typeof exportsObject.step !== "function" ||
    typeof exportsObject.observe !== "function"
  ) {
    throw new Error("Rules source must define exports.init, exports.step and exports.observe");
  }

  const caller = new vm.Script('"use strict"; exports[__wl_fn](...__wl_args)', { filename: "ai-rules-call.js" });
  const invoke = (name: string, args: unknown[]): unknown => {
    raw.__wl_fn = name;
    raw.__wl_args = args;
    try {
      return caller.runInContext(context, { timeout: timeoutMs });
    } finally {
      raw.__wl_fn = undefined;
      raw.__wl_args = undefined;
    }
  };

  const rules: RulesModule = {
    init: (params, rng) => invoke("init", [params, rng]) as never,
    step: (state, params, rng) => invoke("step", [state, params, rng]) as never,
    observe: (state, params) => invoke("observe", [state, params]) as Observation,
  };
  if (typeof exportsObject.view === "function") {
    rules.view = (state, params) => invoke("view", [state, params]);
  }
  return rules;
}
