import "server-only";
import { connection } from "next/server";
import { canTranscribe } from "@/lib/ai/mode";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";

/**
 * POST audio/wav → { source, text, notice? }.
 * Live: Muse Voice Transcribe, or Muse Spark Open audio input when only a Baseten key is set.
 * Sample: text is null. No invented transcript.
 */
function failureMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "The transcript failed.";
  let message = raw.replace(/\s+/g, " ").trim().slice(0, 240) || "The transcript failed.";
  for (const name of ["MODEL_API_KEY", "FIREWORKS_API_KEY", "BASETEN_API_KEY"]) {
    const secret = process.env[name];
    if (secret) message = message.split(secret).join("[redacted]");
  }
  return message;
}

export async function POST(req: Request) {
  await connection();
  if (!canTranscribe()) {
    return Response.json({ source: "sample", text: null, notice: SAMPLE_NOTICE });
  }
  const wav = await req.arrayBuffer();
  if (wav.byteLength === 0) return Response.json({ error: "empty audio" }, { status: 400 });
  try {
    const { transcribe } = await import("@/lib/ai/meta");
    const text = await transcribe(wav);
    if (typeof text !== "string") return Response.json({ source: "live", message: "The transcript was empty." }, { status: 502 });
    return Response.json({ source: "live", text });
  } catch (error) {
    return Response.json({ source: "live", message: failureMessage(error) }, { status: 502 });
  }
}
