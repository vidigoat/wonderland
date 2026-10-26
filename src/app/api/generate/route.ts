import { generateWorld } from "@/agents/pipeline";

/** POST { concept } → Server-Sent Events stream of PipelineEvent (drives the build montage UI). */
export async function POST(req: Request) {
  const { concept } = (await req.json()) as { concept?: string };
  if (!concept || concept.length > 300) return Response.json({ error: "concept required (≤ 300 chars)" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generateWorld(concept)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: (e as Error).message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
