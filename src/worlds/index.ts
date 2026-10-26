import type { WorldSpec } from "@/engine/spec";
import { builtinRules } from "./builtins";
import { firebreakSpec } from "./firebreak/spec";
import { gatekeeperSpec } from "./gatekeeper/spec";
import { newtonsCannonSpec } from "./newtons-cannon/spec";
import { pepperedForestSpec } from "./peppered-forest/spec";
import { rumourTownSpec } from "./rumour-town/spec";

export { builtinRules };

/** The hand-authored hero worlds. Always playable, even with every API down. */
export const heroWorlds: WorldSpec[] = [gatekeeperSpec, pepperedForestSpec, newtonsCannonSpec, rumourTownSpec, firebreakSpec];

export function getHeroWorld(id: string): WorldSpec | undefined {
  return heroWorlds.find((w) => w.id === id);
}
