import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { generateWorld } from "@/agents/pipeline";
import { toClientPipelineEvent } from "@/engine/client-event";
import { takeBuild } from "@/lib/storage/limits";

/** A build with repairs and painting can take most of five minutes. */
export const maxDuration = 300;

/** POST { concept } → Server-Sent Events of client-safe pipeline events (no hidden law, no answer keys). */
export async function POST(req: Request) {
  await connection();
  const { concept } = (await req.json()) as { concept?: string };
  if (!concept || concept.length > 300) return Response.json({ error: "concept required (≤ 300 chars)" }, { status: 400 });
  const refusal = await takeBuild(req);
  if (refusal) return Response.json({ error: refusal }, { status: 429 });

  const encoder = new TextEncoder();
  // A world that already cost model calls is always finished and saved, even if the visitor closes the tab mid-build.
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
        for await (const event of generateWorld(concept)) {
          send(toClientPipelineEvent(event));
          // A new world is saved: the landing page and the worlds page list it on their next visit.
          if (event.type === "stage" && event.stage === "done") {
            try {
              revalidateTag("worlds", "max");
            } catch {
              // Outside a request scope (tests); the lists refresh on the next deploy.
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
