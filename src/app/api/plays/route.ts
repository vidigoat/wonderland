import "server-only";
import { connection } from "next/server";
import { savePlay } from "@/lib/study/store";

/** POST one anonymous finished play. Nothing from this file is shown until there are at least 10 lines. */
export async function POST(req: Request) {
  await connection();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return Response.json({ error: "invalid play" }, { status: 400 });
  const raw = body as Record<string, unknown>;
  if (typeof raw.worldId !== "string" || typeof raw.verdict !== "string") {
    return Response.json({ error: "invalid play" }, { status: 400 });
  }
  if (typeof raw.minutes !== "number" || raw.minutes < 0 || raw.minutes > 240) {
    return Response.json({ error: "invalid play" }, { status: 400 });
  }
  const verdicts = new Set(["discovered", "warmer", "colder", "unsaid"]);
  if (!verdicts.has(raw.verdict)) return Response.json({ error: "invalid play" }, { status: 400 });
  try {
    await savePlay({
      worldId: raw.worldId,
      firstCorrect: raw.firstCorrect === true,
      verdict: raw.verdict,
      transferCorrect: raw.transferCorrect === true,
      minutes: Math.round(raw.minutes * 10) / 10,
    });
  } catch {
    return Response.json({ error: "invalid play" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
