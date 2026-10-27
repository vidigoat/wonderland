import "server-only";
import { connection } from "next/server";
import { judgeStatement, ModelCallError, redactMessage } from "@/agents/judge";
import { findWorld } from "@/worlds/find.server";

/**
 * POST { worldId, statement }
 * → { verdict: "discovered" | "warmer" | "colder", reply, nextExperiment?, source, notice? }
 * Live: Muse Spark with src/agents/prompts/judge.md, then scrubReply.
 * Sample: server-side rubric and fixed replies.
 * The law, in plain words, is returned only with a "discovered" verdict: you found it, so now you may read it.
 */
export async function POST(req: Request) {
  await connection();
  let body: { worldId?: unknown; statement?: unknown };
  try {
    body = (await req.json()) as { worldId?: unknown; statement?: unknown };
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.worldId !== "string" || typeof body.statement !== "string") {
    return Response.json({ error: "worldId and statement are required" }, { status: 400 });
  }
  if (body.statement.length > 4_000) {
    return Response.json({ error: "statement is too long" }, { status: 400 });
  }
  const spec = await findWorld(body.worldId);
  if (!spec) return Response.json({ error: "unknown world" }, { status: 404 });
  try {
    const result = await judgeStatement(spec, body.statement);
    return Response.json(result.verdict === "discovered" ? { ...result, law: spec.science.plainStatement } : result);
  } catch (error) {
    if (error instanceof ModelCallError) {
      return Response.json({ source: error.source, message: error.message }, { status: 502 });
    }
    return Response.json({ error: redactMessage(error, spec) }, { status: 500 });
  }
}
