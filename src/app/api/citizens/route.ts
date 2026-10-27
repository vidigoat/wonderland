import "server-only";
import { connection } from "next/server";
import type { Params } from "@/engine/rules";
import { decideCitizens, type CitizenView } from "@/agents/citizens";
import { getHeroWorld } from "@/worlds";

/**
 * POST { worldId: "rumour-town", citizens: { id, x, y, worried, says }[], params }
 * Live: one open-weights call per citizen, in parallel, each returning { worried, withdraw, says }.
 * Sample, or any live failure: { decisions: null } so the client keeps the deterministic brain.
 */
function readCitizens(raw: unknown): CitizenView[] | null {
  if (!Array.isArray(raw) || raw.length > 80) return null;
  const citizens: CitizenView[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "number" || !Number.isInteger(row.id)) return null;
    if (typeof row.x !== "number" || typeof row.y !== "number" || !Number.isFinite(row.x) || !Number.isFinite(row.y)) return null;
    const worried = typeof row.worried === "number" && Number.isFinite(row.worried) ? row.worried : 0;
    const says = typeof row.says === "string" ? row.says : null;
    citizens.push({ id: row.id, x: row.x, y: row.y, worried, says });
  }
  return citizens;
}

export async function POST(req: Request) {
  await connection();
  let body: { worldId?: unknown; citizens?: unknown; params?: unknown };
  try {
    body = (await req.json()) as { worldId?: unknown; citizens?: unknown; params?: unknown };
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (body.worldId !== "rumour-town") {
    return Response.json({ error: "citizens are only for rumour-town" }, { status: 400 });
  }
  const citizens = readCitizens(body.citizens);
  if (!citizens) return Response.json({ error: "citizens must be a list of { id, x, y, worried, says }" }, { status: 400 });
  if (body.params != null && (typeof body.params !== "object" || Array.isArray(body.params))) {
    return Response.json({ error: "params must be an object" }, { status: 400 });
  }
  const spec = getHeroWorld("rumour-town");
  if (!spec) return Response.json({ error: "unknown world" }, { status: 404 });
  const result = await decideCitizens(spec, citizens, (body.params ?? {}) as Params);
  return Response.json(result);
}
