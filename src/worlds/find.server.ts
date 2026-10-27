import "server-only";
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
