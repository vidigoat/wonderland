import "server-only";
import { toFile } from "openai";
import { metaClient } from "./clients";
import { MODELS } from "./models";

/**
 * Thin, typed wrappers over the Meta Model API. Each is the ONLY place that model is called,
 * so the rest of the app never touches request shapes. Docs: https://dev.meta.ai/docs
 *
 * STATUS: shapes follow the official quickstart / guides. Verify each against a live call with
 * `pnpm smoke` (scripts/smoke-meta.ts) as soon as MODEL_API_KEY is set — fix here, not at call sites.
 */

export type Effort = "minimal" | "low" | "medium" | "high" | "max";

/** Text/vision reasoning with optional JSON-schema structured output. */
export async function think(opts: {
  model?: string;
  system?: string;
  input: string | Array<Record<string, unknown>>;
  effort?: Effort;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  maxOutputTokens?: number;
}): Promise<string> {
  const res = await metaClient().responses.create({
    model: opts.model ?? MODELS.spark,
    instructions: opts.system,
    input: opts.input as never,
    reasoning: opts.effort ? ({ effort: opts.effort } as never) : undefined,
    max_output_tokens: opts.maxOutputTokens ?? 8000,
    text: opts.jsonSchema ? ({ format: { type: "json_schema", name: opts.jsonSchema.name, schema: opts.jsonSchema.schema, strict: true } } as never) : undefined,
  });
  return res.output_text;
}

/** Muse Image — generate (or edit, by passing reference image URLs). Returns base64 image strings. */
export async function paint(opts: { prompt: string; n?: number; size?: string; referenceImageUrls?: string[] }): Promise<string[]> {
  if (opts.referenceImageUrls?.length) {
    const res = await metaClient().responses.create({
      model: MODELS.image,
      input: [
        {
          role: "user",
          content: [
            ...opts.referenceImageUrls.map((url) => ({ type: "input_image", image_url: url })),
            { type: "input_text", text: opts.prompt },
          ],
        },
      ] as never,
    });
    return (res.output as Array<{ type: string; result?: string }>).filter((o) => o.type === "image_generation_call" && o.result).map((o) => o.result!);
  }
  const res = await metaClient().images.generate({ model: MODELS.image, prompt: opts.prompt, n: opts.n ?? 1, size: (opts.size ?? "1024x1024") as never, response_format: "b64_json" });
  return (res.data ?? []).map((d) => d.b64_json!).filter(Boolean);
}

/**
 * SAM 3.1 — segment every match of a noun phrase. Returns the raw special-token text;
 * parse with src/lib/ai/sam-parse.ts (base85 raster masks + pixel boxes).
 * Docs: https://dev.meta.ai/docs/media-segmentation and /docs/sam/reading-segmentation
 */
export async function segment(opts: { prompt: string; imageUrl: string }): Promise<string> {
  const res = await metaClient().responses.create({
    model: MODELS.sam,
    input: [{ role: "user", content: [{ type: "input_text", text: opts.prompt }, { type: "input_image", image_url: opts.imageUrl }] }] as never,
  });
  return res.output_text;
}

/** Muse Voice Transcribe — WAV in, text out. Docs: https://dev.meta.ai/docs/speech-to-text */
export async function transcribe(wav: ArrayBuffer): Promise<string> {
  const res = await metaClient().audio.transcriptions.create({
    model: MODELS.transcribe,
    file: await toFile(Buffer.from(wav), "speech.wav", { type: "audio/wav" }),
  });
  return res.text;
}
