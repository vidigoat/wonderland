/**
 * pnpm smoke — one real call to every model. Run this FIRST once keys are in .env.local.
 * Fix request shapes in src/lib/ai/meta.ts until every line is ✅. Writes artifacts to .smoke/.
 */
import fs from "node:fs/promises";
import { paint, segment, think } from "@/lib/ai/meta";
import { openWeights } from "@/lib/ai/clients";
import { MODELS } from "@/lib/ai/models";
import { parseSamOutput } from "@/lib/ai/sam-parse";

async function step(name: string, fn: () => Promise<string>) {
  const t = Date.now();
  try {
    const out = await fn();
    console.log(`✅ ${name} (${Date.now() - t} ms): ${out.slice(0, 160).replace(/\n/g, " ")}`);
  } catch (e) {
    console.log(`❌ ${name} (${Date.now() - t} ms): ${(e as Error).message}`);
  }
}

await fs.mkdir(".smoke", { recursive: true });

await step(`spark ${MODELS.spark}`, () => think({ input: "In one sentence: why does a quote character break a naive SQL query?" }));
await step(`wonder ${MODELS.wonder}`, () => think({ model: MODELS.wonder, input: "Reply with the JSON {\"ok\":true} and nothing else.", effort: "minimal" }));

let imageB64 = "";
await step(`image ${MODELS.image}`, async () => {
  [imageB64] = await paint({ prompt: "a single peppered moth, wings spread, top-down, storybook gouache illustration, plain flat cream background" });
  await fs.writeFile(".smoke/moth.webp", Buffer.from(imageB64, "base64"));
  return `wrote .smoke/moth.webp (${imageB64.length} b64 chars)`;
});

await step(`sam ${MODELS.sam}`, async () => {
  if (!imageB64) throw new Error("no image from previous step");
  const raw = await segment({ prompt: "moth", imageUrl: `data:image/webp;base64,${imageB64}` });
  await fs.writeFile(".smoke/sam.txt", raw);
  return `${parseSamOutput(raw).length} record(s) parsed — raw in .smoke/sam.txt`;
});

await step("open weights (rival)", async () => {
  const { client, model } = openWeights();
  const r = await client.chat.completions.create({ model, messages: [{ role: "user", content: "Say hi in 3 words." }], max_tokens: 20 });
  return `${model}: ${r.choices[0]?.message?.content ?? ""}`;
});

console.log(`\nℹ️  transcribe (${MODELS.transcribe}) needs a WAV: record one and POST it to /api/transcribe.`);
