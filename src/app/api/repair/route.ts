import "server-only";
import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { repairFromPlaytest } from "@/agents/pipeline";
import { readPlaytest, savePlaytest } from "@/agents/playtest";
import { toClientPipelineEvent } from "@/engine/client-event";
import { findWorld } from "@/worlds/find.server";

/** At most this many vision repairs per world, so a public link can't spend without end. */
const MAX_VISION_REPAIRS = 2;

/**
 * POST { worldId } → Server-Sent Events of a repair round.
 * Only after Spark has watched the world and flagged it. Spark's notes go to the designer on the server;
 * the stream carries client-safe events only.
 */
export async function POST(req: Request) {
  await connection();
  let worldId: unknown;
  try {
    ({ worldId } = (await req.json()) as { worldId?: unknown });
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof worldId !== "string") return Response.json({ error: "worldId is required" }, { status: 400 });
  const spec = await findWorld(worldId);
  if (!spec || spec.rules.kind !== "js") return Response.json({ error: "only a model-written world can be repaired" }, { status: 404 });
  const watched = await readPlaytest(spec.id);
  if (!watched || watched.source !== "live" || watched.verdict !== "concern") {
    return Response.json({ error: "Spark has not flagged this world" }, { status: 409 });
  }
  if ((watched.repairs ?? 0) >= MAX_VISION_REPAIRS) return Response.json({ error: "this world has had its repairs" }, { status: 429 });
  // Count the attempt before spending, so two tabs can't both start one.
  await savePlaytest(spec.id, { ...watched, repairs: (watched.repairs ?? 0) + 1 });

  const encoder = new TextEncoder();
  let open = true;
  const stream = new ReadableStream({
    cancel() {
      open = false;
    },
    async start(controller) {
      const send = (event: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          open = false;
        }
      };
      try {
        for await (const event of repairFromPlaytest(spec, watched.notes)) {
          send(toClientPipelineEvent(event));
          if (event.type === "stage" && event.stage === "done") {
            try {
              revalidateTag("worlds", "max");
            } catch {
              // Outside a request scope.
            }
          }
        }
      } catch (e) {
        send(toClientPipelineEvent({ type: "error", message: (e as Error).message }));
      } finally {
        if (open) controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
