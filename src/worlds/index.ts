import type { RulesModule } from "@/engine/rules";
import type { WorldSpec } from "@/engine/spec";
import { gatekeeper } from "./gatekeeper/rules";
import { gatekeeperSpec } from "./gatekeeper/spec";
import { newtonsCannon } from "./newtons-cannon/rules";
import { newtonsCannonSpec } from "./newtons-cannon/spec";
import { pepperedForest } from "./peppered-forest/rules";
import { pepperedForestSpec } from "./peppered-forest/spec";
import { rumourTown } from "./rumour-town/rules";
import { rumourTownSpec } from "./rumour-town/spec";

/** Built-in rule modules, referenced by `rules: { kind: "builtin", module }` in a spec. */
export const builtinRules: Record<string, RulesModule<never>> = {
  gatekeeper: gatekeeper as RulesModule<never>,
  "peppered-forest": pepperedForest as RulesModule<never>,
  "newtons-cannon": newtonsCannon as RulesModule<never>,
  "rumour-town": rumourTown as RulesModule<never>,
};

/** The hand-authored hero worlds. Always playable, even with every API down. */
export const heroWorlds: WorldSpec[] = [gatekeeperSpec, pepperedForestSpec, newtonsCannonSpec, rumourTownSpec];

export function getHeroWorld(id: string): WorldSpec | undefined {
  return heroWorlds.find((w) => w.id === id);
}
