import "server-only";
import OpenAI from "openai";
import { openWeightsProvider } from "./mode";
import { guardedFetch } from "./spend";

/**
 * All providers speak the OpenAI wire format, so one SDK covers everything.
 * - Meta Model API: Responses API + Chat Completions at https://api.meta.ai/v1
 * - Fireworks (Muse Glimmer): OpenAI-compatible
 * - Baseten (Muse Spark Open): OpenAI-compatible
 * Keys live in .env.local (see .env.example). Never import this file from client components.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  return v;
}

let meta: OpenAI | null = null;
export function metaClient(): OpenAI {
  meta ??= new OpenAI({ baseURL: process.env.META_BASE_URL ?? "https://api.meta.ai/v1", apiKey: required("MODEL_API_KEY"), fetch: guardedFetch("meta") });
  return meta;
}

let fireworks: OpenAI | null = null;
export function fireworksClient(): OpenAI {
  fireworks ??= new OpenAI({ baseURL: "https://api.fireworks.ai/inference/v1", apiKey: required("FIREWORKS_API_KEY") });
  return fireworks;
}

let baseten: OpenAI | null = null;
export function basetenClient(): OpenAI {
  baseten ??= new OpenAI({ baseURL: process.env.BASETEN_BASE_URL ?? "https://inference.baseten.co/v1", apiKey: required("BASETEN_API_KEY"), fetch: guardedFetch("baseten") });
  return baseten;
}

/** Which open-weights provider powers the rival + citizens. Both qualify for the open-weights prize. */
export function openWeights(): { client: OpenAI; model: string } {
  if (openWeightsProvider() === "baseten") return { client: basetenClient(), model: "meta-models/muse-spark-open-1026" };
  return { client: fireworksClient(), model: process.env.FIREWORKS_GLIMMER_MODEL ?? "accounts/fireworks/models/muse-glimmer-30b" };
}
