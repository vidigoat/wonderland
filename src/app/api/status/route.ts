import { connection } from "next/server";
import { metaSource, openWeightsSource } from "@/lib/ai/mode";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";

/** Whether model calls will run live or take the marked sample path. Never returns keys. */
export async function GET() {
  await connection();
  const models = metaSource();
  const openWeights = openWeightsSource();
  const sample = models === "sample" || openWeights === "sample";
  return Response.json({
    models,
    openWeights,
    notice: sample ? SAMPLE_NOTICE : null,
  });
}
