import { connection } from "next/server";
import { generateWorld } from "@/agents/pipeline";
import { toClientPipelineEvent } from "@/engine/client-event";

/** POST { concept } → Server-Sent Events of client-safe pipeline events (no hidden law, no answer keys). */
export async function POST(req: Request) {
  await connection();
  const { concept } = (await req.json()) as { concept?: string };
  if (!concept || concept.length > 300) return Response.json({ error: "concept required (≤ 300 chars)" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of generateWorld(concept)) {
          send(toClientPipelineEvent(event));
        }
      } catch (e) {
        send(toClientPipelineEvent({ type: "error", message: (e as Error).message }));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
