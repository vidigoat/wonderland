import { PaintedArt, type WorldSpec } from "@/engine/spec";
import { builtinRules } from "./builtins";
import heroArt from "./hero-art.json";
import { firebreakSpec } from "./firebreak/spec";
import { gatekeeperSpec } from "./gatekeeper/spec";
import { newtonsCannonSpec } from "./newtons-cannon/spec";
import { pepperedForestSpec } from "./peppered-forest/spec";
import { rumourTownSpec } from "./rumour-town/spec";

export { builtinRules };

/** The hand-authored hero worlds. Always playable, even with every API down. */
export const heroWorlds: WorldSpec[] = [gatekeeperSpec, pepperedForestSpec, newtonsCannonSpec, rumourTownSpec, firebreakSpec].map(withPainting);

/** Muse Image + SAM 3.1 art for a hero world, written by `pnpm paint <id>`. Without it the world keeps its handmade SVGs. */
export function heroPainting(id: string): PaintedArt | undefined {
  const art = (heroArt as Record<string, unknown>)[id];
  const parsed = art ? PaintedArt.safeParse(art) : null;
  return parsed?.success ? parsed.data : undefined;
}

function withPainting(spec: WorldSpec): WorldSpec {
  const painted = heroPainting(spec.id);
  return painted ? { ...spec, art: { ...spec.art, painted } } : spec;
}

export function getHeroWorld(id: string): WorldSpec | undefined {
  return heroWorlds.find((w) => w.id === id);
}
