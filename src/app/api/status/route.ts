import { connection } from "next/server";
import { metaSource, openWeightsProvider, openWeightsSource, reasoningBackend, reasoningSource } from "@/lib/ai/mode";
import { pullShared, spendSummary } from "@/lib/ai/spend";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";

/**
 * Whether model calls will run live or take the marked sample path. Never returns keys.
 * models: text reasoning (generator, judge) — Meta Model API, or Muse Spark Open when only a partner key is set.
 * art: Muse Image + SAM 3.1 + Voice Transcribe, which need the Meta Model API itself.
 */
export async function GET() {
  await connection();
  // On Vercel, report the totals every instance shares, not this instance's last copy.
  await pullShared().catch(() => undefined);
  const models = reasoningSource();
  const openWeights = openWeightsSource();
  const sample = models === "sample" || openWeights === "sample";
  return Response.json({
    models,
    reasoning: reasoningBackend(),
    openWeights,
    openWeightsProvider: openWeights === "live" ? openWeightsProvider() : null,
    art: metaSource(),
    spend: spendSummary(),
    notice: sample ? SAMPLE_NOTICE : null,
  });
}
