import { transcribe } from "@/lib/ai/meta";

/** POST audio/wav body → { text }. The player says their law out loud; Muse Voice Transcribe turns it into text for the judge. */
export async function POST(req: Request) {
  const wav = await req.arrayBuffer();
  if (wav.byteLength === 0) return Response.json({ error: "empty audio" }, { status: 400 });
  const text = await transcribe(wav);
  return Response.json({ text });
}
