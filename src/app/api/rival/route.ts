import "server-only";
import { connection } from "next/server";
import type { Params } from "@/engine/rules";
import { ModelCallError, redactMessage } from "@/agents/judge";
import { rivalTurn, takeTurn } from "@/agents/rival";
import { getHeroWorld } from "@/worlds";

/**
 * POST { worldId, seed, params, turn? }
 * → { source, notice?, thought, tool, params, observation? }
 * tool is set_knob | run | observe | hypothesise.
 * Live: one open-weights tool call. A provider failure is 502 with no invented thought.
 * Sample: deterministic policy. `run` and `observe` use runHeadless on the shared seed.
 */
export async function POST(req: Request) {
  await connection();
  let body: { worldId?: unknown; seed?: unknown; params?: unknown; turn?: unknown; history?: unknown };
  try {
    body = (await req.json()) as { worldId?: unknown; seed?: unknown; params?: unknown; turn?: unknown; history?: unknown };
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.worldId !== "string" || typeof body.seed !== "number" || !Number.isFinite(body.seed)) {
    return Response.json({ error: "worldId and seed are required" }, { status: 400 });
  }
  if (body.params != null && (typeof body.params !== "object" || Array.isArray(body.params))) {
    return Response.json({ error: "params must be an object" }, { status: 400 });
  }
  const spec = getHeroWorld(body.worldId);
  if (!spec) return Response.json({ error: "unknown world" }, { status: 404 });
  const params = (body.params ?? {}) as Params;
  const turn = takeTurn(body.worldId, body.seed, body.turn);
  try {
    const result = await rivalTurn(spec, body.seed, params, turn, body.history);
    return Response.json(result);
  } catch (error) {
    if (error instanceof ModelCallError) {
      return Response.json({ source: error.source, message: error.message }, { status: 502 });
    }
    return Response.json({ error: redactMessage(error, spec) }, { status: 500 });
  }
}
