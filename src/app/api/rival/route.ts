/**
 * POST { worldId, seed, transcript } → streams the rival's next thought + tool call.
 * Runs on OPEN WEIGHTS (Muse Glimmer on Fireworks, or Muse Spark Open on Baseten) — this is what qualifies
 * the project for the $10K Best Build on Meta Open Weight Models prize. Keep it that way.
 * Tools: set_knob, run, observe, hypothesise — executed server-side against runHeadless with the SAME randomised hidden params as the human.
 * TODO(agent: rival): implement with src/lib/ai/clients.ts openWeights() + src/agents/prompts/rival.md.
 */
export async function POST() {
  return Response.json({ error: "not implemented" }, { status: 501 });
}
