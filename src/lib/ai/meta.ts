import "server-only";
import { toFile } from "openai";
import { metaClient, openWeights } from "./clients";
import { metaSource, reasoningBackend } from "./mode";
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
  if (reasoningBackend() === "open-weights") return thinkOpenWeights(opts);
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

/**
 * The same call on Muse Spark Open (Meta open weights, via Baseten or Fireworks).
 * Spark Open has no structured-output mode, so the schema rides in the system prompt; callers already
 * validate with zod and repair on failure. It always reasons first, and reasoning counts toward
 * max_tokens, so the budget is the requested output plus room to think.
 */
async function thinkOpenWeights(opts: Parameters<typeof think>[0]): Promise<string> {
  const { client, model } = openWeights();
  const system = [
    opts.system ?? "",
    opts.jsonSchema
      ? `\n\nReturn ONLY one JSON object that validates against this JSON Schema (named ${opts.jsonSchema.name}). No prose, no markdown fences.\n${JSON.stringify(opts.jsonSchema.schema)}`
      : "",
  ].join("");
  const user = typeof opts.input === "string" ? opts.input : JSON.stringify(opts.input);
  // Spark Open sometimes reasons until max_tokens and never answers. Retry once, larger, asking it to think briefly.
  let lastReason = "";
  for (const attempt of [0, 1]) {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: (opts.maxOutputTokens ?? 8000) + (attempt === 0 ? 8000 : 16000),
      temperature: attempt === 0 ? 0.4 : 0.2,
      messages: [
        { role: "system", content: attempt === 0 ? system : `${system}\n\nKeep your private reasoning short. Write the final answer now.` },
        { role: "user", content: user },
      ],
    });
    const choice = completion.choices[0];
    const content = choice?.message?.content;
    if (typeof content === "string" && content.trim()) return content;
    lastReason = choice?.finish_reason ?? "unknown";
  }
  throw new Error(`The model thought for too long and ran out of room before answering (finish: ${lastReason}). Try asking again.`);
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
  const res = await metaClient().images.generate({ model: MODELS.image, prompt: opts.prompt, n: opts.n ?? 1, size: (opts.size ?? "1024x1024") as never, response_format: "b64_json", output_format: "png" } as never);
  return (res.data ?? []).map((d) => d.b64_json!).filter(Boolean);
}

/**
 * SAM 3.1 — segment every match of a noun phrase. Returns the raw special-token text;
 * parse with src/lib/ai/sam-parse.ts (base85 raster masks + pixel boxes).
 * Docs: https://dev.meta.ai/docs/media-segmentation and /docs/sam/reading-segmentation
 */
export async function segment(opts: { prompt: string; imageUrl: string }): Promise<string> {
  // SAM only answers when streamed; the non-streamed response carries an empty output_text.
  const stream = await metaClient().responses.create({
    model: MODELS.sam,
    stream: true,
    input: [{ role: "user", content: [{ type: "input_text", text: opts.prompt }, { type: "input_image", image_url: opts.imageUrl }] }] as never,
  });
  let text = "";
  for await (const event of stream as unknown as AsyncIterable<{ type: string; delta?: string }>) {
    if (event.type === "response.output_text.delta" && event.delta) text += event.delta;
  }
  return text;
}

/**
 * Muse Spark 1.3 on the Meta Model API, with images.
 * This does not go through `think()`. `think()` sends the turn to Spark Open when
 * REASONING_BACKEND=open-weights, and that path turns an image into text.
 */
export async function look(opts: {
  system?: string;
  prompt: string;
  images: string[];
  jsonSchema: { name: string; schema: Record<string, unknown> };
}): Promise<string> {
  const res = await metaClient().responses.create({
    model: MODELS.spark,
    instructions: opts.system,
    input: [
      {
        role: "user",
        content: [
          ...opts.images.map((image) => ({ type: "input_image", image_url: image })),
          { type: "input_text", text: opts.prompt },
        ],
      },
    ] as never,
    text: {
      format: { type: "json_schema", name: opts.jsonSchema.name, schema: opts.jsonSchema.schema, strict: true },
    } as never,
    // Spark reasons before it answers, and reasoning counts toward this budget; 800 ran out on six frames.
    reasoning: { effort: "low" } as never,
    max_output_tokens: 4000,
  });
  if (!res.output_text) throw new Error("Spark ran out of room before it answered.");
  return res.output_text;
}

/** Muse Voice Transcribe — WAV in, text out. Docs: https://dev.meta.ai/docs/speech-to-text */
export async function transcribe(wav: ArrayBuffer): Promise<string> {
  if (metaSource() !== "live") return transcribeOpenWeights(wav);
  const res = await metaClient().audio.transcriptions.create({
    model: MODELS.transcribe,
    file: await toFile(Buffer.from(wav), "speech.wav", { type: "audio/wav" }),
  });
  return res.text;
}

/** Muse Spark Open hears audio directly (Baseten `audio_url` content part). Asked for a verbatim transcript only. */
async function transcribeOpenWeights(wav: ArrayBuffer): Promise<string> {
  const { client, model } = openWeights();
  const url = `data:audio/wav;base64,${Buffer.from(wav).toString("base64")}`;
  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe this audio verbatim. Reply with only the words spoken, or an empty reply if there is no speech." },
          { type: "audio_url", audio_url: { url } },
        ] as never,
      },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  return typeof text === "string" ? text.trim() : "";
}
