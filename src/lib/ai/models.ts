/**
 * Every model Wonderland uses, in one place. Verified against https://dev.meta.ai/docs/models on 2026-10-26.
 * Change ids here only.
 */
export const MODELS = {
  /** Orchestrator + world designer. 1M ctx, tool calling, structured output, computer use. $4/$20 per 1M. */
  wonder: "muse-wonder-1.0",
  /** Scientist, judge, video QA. 1M ctx, image/video/PDF in. $1.25/$4.25 per 1M. */
  spark: "muse-spark-1.3",
  /** Cheap Spark for bulk calls (no `max` reasoning, 150 RPM). $0.10/$0.20 per 1M. */
  sparkCheap: "muse-spark-1.3-contributor",
  /** Spark 1.2 — use this one for AUDIO input (1.3 audio is not fully reliable). */
  sparkAudio: "muse-spark-1.2",
  /** Image generation + editing. $0.01/image. No transparent backgrounds → cut out with SAM. */
  image: "muse-image-1.0",
  /** Segmentation (text prompt → boxes + masks, tracks across video). $2.50 / 1k images. */
  sam: "sam-3.1",
  /** Speech → text, streaming, diarization. $0.18/hour. */
  transcribe: "muse-voice-transcribe-1.0",
  /** Open weights — via partner inference (counts for the $10K Best Open Weights prize). */
  glimmer: process.env.FIREWORKS_GLIMMER_MODEL ?? "accounts/fireworks/models/muse-glimmer-30b",
  sparkOpen: "meta-models/muse-spark-open-1026",
} as const;
