/**
 * Every model-shaped response carries one of these.
 * "sample" means a key was missing and a stand-in was used. The UI must show `notice`.
 * Never describe sample output as if a model produced it.
 */
export type DataSource = "live" | "sample";

export const SAMPLE_NOTICE =
  "Sample — no API key. This stand-in is labeled on purpose. The same code path calls the model once MODEL_API_KEY (and, for Ada, an open-weights key) is in .env.local.";
