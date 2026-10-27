import type { DataSource } from "@/lib/samples/mark";

/**
 * Which lane a model call should take. Reads process.env at call time.
 * Server and scripts only — client components should ask `/api/status`.
 * Does not invent model output; callers branch to a real request or a marked sample.
 */

/** Meta Model API itself (needed for Muse Image, SAM 3.1 and Voice Transcribe). */
export function metaSource(): DataSource {
  return process.env.MODEL_API_KEY ? "live" : "sample";
}

export type OpenWeightsProvider = "baseten" | "fireworks";

/** Explicit OPEN_WEIGHTS_PROVIDER wins; otherwise whichever partner key is present (Baseten first). */
export function openWeightsProvider(): OpenWeightsProvider {
  const chosen = process.env.OPEN_WEIGHTS_PROVIDER?.trim();
  if (chosen === "baseten" || chosen === "fireworks") return chosen;
  return process.env.BASETEN_API_KEY ? "baseten" : "fireworks";
}

export function openWeightsSource(): DataSource {
  if (openWeightsProvider() === "baseten") return process.env.BASETEN_API_KEY ? "live" : "sample";
  return process.env.FIREWORKS_API_KEY ? "live" : "sample";
}

/**
 * Text reasoning (scientist, designer, judge). Prefers the Meta Model API; with no Meta key it runs on
 * Meta's open-weights Muse Spark Open via the partner. Either way it is a real Meta model.
 */
export type ReasoningBackend = "meta" | "open-weights";

export function reasoningBackend(): ReasoningBackend | null {
  if (metaSource() === "live") return "meta";
  if (openWeightsSource() === "live") return "open-weights";
  return null;
}

export function reasoningSource(): DataSource {
  return reasoningBackend() ? "live" : "sample";
}

/** Spoken hypotheses: Muse Voice Transcribe, or Muse Spark Open's audio input on Baseten (Glimmer has no audio). */
export function canTranscribe(): boolean {
  return metaSource() === "live" || (openWeightsSource() === "live" && openWeightsProvider() === "baseten");
}
