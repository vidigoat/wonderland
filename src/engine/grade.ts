import type { WorldSpec } from "./spec";

export type GradeResult = { correct: boolean };

const STOP = new Set(["that", "this", "with", "from", "they", "them", "than", "then", "into", "only", "your", "have", "would", "could", "there", "their", "about"]);

function distinctiveWords(answer: string): string[] {
  return answer
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((word) => word.length > 3 && !STOP.has(word));
}

/** Grade a prediction or the transfer question. Returns a boolean only — never the key. */
export function gradeAnswer(spec: WorldSpec, input: { kind: "prediction"; predictionId: string; choice: number | string } | { kind: "transfer"; choice?: number | string; statement?: string }): GradeResult {
  if (input.kind === "prediction") {
    const prediction = spec.predictions.find((item) => item.id === input.predictionId);
    if (!prediction) return { correct: false };
    return { correct: prediction.answerKey === input.choice || String(prediction.answerKey) === String(input.choice) };
  }
  const key = spec.transfer.answerKey;
  if (typeof key === "number") return { correct: input.choice === key || String(input.choice) === String(key) };
  const said = String(input.statement ?? input.choice ?? "").toLowerCase();
  const words = distinctiveWords(key);
  const hits = words.filter((word) => said.includes(word));
  const correct = hits.length >= 2 || hits.some((word) => word.length >= 12);
  return { correct };
}
