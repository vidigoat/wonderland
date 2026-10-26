import { builtinRules } from "@/worlds";
import { compileRules, type RulesModule } from "./rules";
import type { WorldSpec } from "./spec";

export function loadRules(spec: WorldSpec): RulesModule {
  if (spec.rules.kind === "builtin") {
    const mod = builtinRules[spec.rules.module];
    if (!mod) throw new Error(`Unknown builtin rules module: ${spec.rules.module}`);
    return mod as RulesModule;
  }
  return compileRules(spec.rules.source);
}
