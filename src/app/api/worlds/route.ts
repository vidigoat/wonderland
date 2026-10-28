import { toPublic } from "@/engine/spec";
import { listPublic } from "@/lib/storage/worlds";
import { heroWorlds } from "@/worlds";

/** GET → public (answer-free) specs of every playable world, heroes and the ones the model wrote. */
/** GET → every playable world, public fields only. GET ?id=… → just that one (404 if unknown). */
export async function GET(req: Request) {
  const heroIds = new Set(heroWorlds.map((world) => world.id));
  const written = (await listPublic()).filter((world) => !heroIds.has(world.id));
  const all = [...heroWorlds.map(toPublic), ...written];
  const id = new URL(req.url).searchParams.get("id");
  if (id === null) return Response.json(all);
  const one = all.find((world) => world.id === id);
  return one ? Response.json(one) : Response.json({ error: "unknown world" }, { status: 404 });
}
