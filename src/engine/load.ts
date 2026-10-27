import { builtinRules } from "@/worlds/builtins";
import type { RulesModule } from "./rules";
import type { WorldSpec } from "./spec";

/**
 * Built-in hero rules stay synchronous so the browser player and hero tests can load them
 * without the sandbox. AI-written `js` rules go through loadJsRules.
 */
export function loadRules(spec: WorldSpec): RulesModule {
  if (spec.rules.kind === "builtin") {
    const mod = builtinRules[spec.rules.module];
    if (!mod) throw new Error(`Unknown builtin rules module: ${spec.rules.module}`);
    return mod as RulesModule;
  }
  throw new Error("JS rules must be loaded with loadJsRules so they run in the sandbox");
}

/** Dynamic-import the sandbox only when a world actually has AI-written rules. */
export async function loadJsRules(spec: WorldSpec): Promise<RulesModule> {
  if (spec.rules.kind === "builtin") return loadRules(spec);
  const { compileSandboxed } = await import("./sandbox.server");
  return compileSandboxed(spec.rules.source);
}
