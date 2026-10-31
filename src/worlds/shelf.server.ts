import "server-only";
import { readPlaytest } from "@/agents/playtest";
import type { PublicWorldSpec } from "@/engine/spec";
import { listPublic } from "@/lib/storage/worlds";

/** After this many automatic repairs, a world Spark still flags stays off the shelf. Matches /api/repair. */
const MAX_VISION_REPAIRS = 2;

/** Whether a world belongs on the shelf: anything except one Spark still flags after every repair it was allowed. */
export function onShelf(watched: { verdict: string; repairs?: number } | null): boolean {
  return !(watched && watched.verdict === "concern" && (watched.repairs ?? 0) >= MAX_VISION_REPAIRS);
}

/** The model-written worlds the gallery and the landing page show. A held-back world is still playable by link. */
export async function shelfWorlds(): Promise<PublicWorldSpec[]> {
  const worlds = await listPublic();
  const kept: PublicWorldSpec[] = [];
  for (const world of worlds) {
    if (onShelf(await readPlaytest(world.id))) kept.push(world);
  }
  return kept;
}
