import { toPublic } from "@/engine/spec";
import { listPublic } from "@/lib/storage/worlds";
import { heroWorlds } from "@/worlds";

/** GET → public (answer-free) specs of every playable world, heroes and the ones the model wrote. */
export async function GET() {
  const heroIds = new Set(heroWorlds.map((world) => world.id));
  const written = (await listPublic()).filter((world) => !heroIds.has(world.id));
  return Response.json([...heroWorlds.map(toPublic), ...written]);
}
