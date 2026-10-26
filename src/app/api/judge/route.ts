/**
 * POST { worldId, statement, history? } → { verdict: "discovered" | "warmer" | "colder", reply: string, nextExperiment?: Record<string, unknown> }
 * Uses Muse Spark 1.3 with src/agents/prompts/judge.md. Must NEVER leak spec.science.hiddenLaw.
 * TODO(agent: play-loop): implement + add a leak test (judge output must not contain key phrases of the law).
 */
export async function POST() {
  return Response.json({ error: "not implemented" }, { status: 501 });
}
