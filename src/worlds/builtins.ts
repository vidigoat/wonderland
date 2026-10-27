import type { RulesModule } from "@/engine/rules";
import { firebreak } from "./firebreak/rules";
import { gatekeeper } from "./gatekeeper/rules";
import { newtonsCannon } from "./newtons-cannon/rules";
import { pepperedForest } from "./peppered-forest/rules";
import { rumourTown } from "./rumour-town/rules";

/**
 * Built-in rule modules for the browser player.
 * This file must not import world specs — those carry the hidden law.
 */
export const builtinRules: Record<string, RulesModule<never>> = {
  gatekeeper: gatekeeper as RulesModule<never>,
  "peppered-forest": pepperedForest as RulesModule<never>,
  "newtons-cannon": newtonsCannon as RulesModule<never>,
  "rumour-town": rumourTown as RulesModule<never>,
  firebreak: firebreak as RulesModule<never>,
};
