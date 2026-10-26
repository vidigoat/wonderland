import type { DataSource } from "@/lib/samples/mark";

/**
 * Which lane a model call should take. Reads process.env at call time.
 * Server and scripts only — client components should ask `/api/status`.
 * Does not invent model output; callers branch to a real request or a marked sample.
 */

export function metaSource(): DataSource {
  return process.env.MODEL_API_KEY ? "live" : "sample";
}

export function openWeightsSource(): DataSource {
  if (process.env.OPEN_WEIGHTS_PROVIDER === "baseten") {
    return process.env.BASETEN_API_KEY ? "live" : "sample";
  }
  return process.env.FIREWORKS_API_KEY ? "live" : "sample";
}
