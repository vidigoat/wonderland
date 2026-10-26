import { toPublic } from "@/engine/spec";
import { heroWorlds } from "@/worlds";

/** GET → public (answer-free) specs of every playable world. TODO(agent: gallery): include generated worlds from storage. */
export async function GET() {
  return Response.json(heroWorlds.map(toPublic));
}
