import "server-only";
import { cacheTag } from "next/cache";
import type { WorldSpec } from "@/engine/spec";
import { loadWorld } from "@/lib/storage/worlds";
import { getHeroWorld } from "./index";

/** A hero world, or a generated world that passed its checks and was saved to the shelf. Server only. */
export async function findWorld(id: string): Promise<WorldSpec | undefined> {
  const hero = getHeroWorld(id);
  if (hero) return hero;
  try {
    return await loadWorld(id);
  } catch {
    return undefined;
  }
}

/**
 * The same lookup, cached for pages. On Vercel a world is read from the Blob store, whose client reads the clock,
 * and a page may not do that while it is being prerendered. Saving a new or repaired world revalidates "worlds".
 */
export async function findWorldCached(id: string): Promise<WorldSpec | undefined> {
  "use cache";
  cacheTag("worlds");
  return findWorld(id);
}
