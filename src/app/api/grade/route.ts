import { connection } from "next/server";
import { gradeAnswer } from "@/engine/grade";
import { getHeroWorld } from "@/worlds";

/**
 * POST { worldId, kind: "prediction", predictionId, choice }
 * or { worldId, kind: "transfer", choice?, statement? }
 * Returns { correct } only. Local grading — not a model call.
 */
export async function POST(req: Request) {
  await connection();
  const body = (await req.json()) as {
    worldId?: string;
    kind?: "prediction" | "transfer";
    predictionId?: string;
    choice?: number | string;
    statement?: string;
  };
  const spec = body.worldId ? getHeroWorld(body.worldId) : undefined;
  if (!spec || (body.kind !== "prediction" && body.kind !== "transfer")) {
    return Response.json({ error: "worldId and kind are required" }, { status: 400 });
  }
  const result =
    body.kind === "prediction"
      ? gradeAnswer(spec, { kind: "prediction", predictionId: body.predictionId ?? "", choice: body.choice ?? "" })
      : gradeAnswer(spec, { kind: "transfer", choice: body.choice, statement: body.statement });
  return Response.json({ ...result, source: "local" as const });
}
