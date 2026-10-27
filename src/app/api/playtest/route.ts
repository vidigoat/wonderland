import "server-only";
import { connection } from "next/server";
import { readFrames, savePlaytest, watchWorld } from "@/agents/playtest";
import { ModelCallError, redactMessage } from "@/agents/judge";
import { findWorld } from "@/worlds/find.server";

/**
 * POST { worldId, frames: [{ dataUrl, caption }] }
 * Spark 1.3 watches up to six JPEG frames. The law is an input and is scrubbed out of the notes.
 * With no key the result says Spark did not watch, and it is marked sample.
 */
export async function POST(req: Request) {
  await connection();
  let body: { worldId?: unknown; frames?: unknown };
  try {
    body = (await req.json()) as { worldId?: unknown; frames?: unknown };
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.worldId !== "string") return Response.json({ error: "worldId is required" }, { status: 400 });
  const frames = readFrames(body.frames);
  if (!frames) return Response.json({ error: "frames must be 1 to 6 jpeg data URLs" }, { status: 400 });
  const spec = await findWorld(body.worldId);
  if (!spec) return Response.json({ error: "unknown world" }, { status: 404 });
  try {
    const result = await watchWorld(spec, frames);
    await savePlaytest(spec.id, result);
    return Response.json(result);
  } catch (error) {
    if (error instanceof ModelCallError) {
      return Response.json({ source: error.source, message: error.message }, { status: 502 });
    }
    return Response.json({ error: redactMessage(error, spec) }, { status: 500 });
  }
}
