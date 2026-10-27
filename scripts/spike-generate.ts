/**
 * pnpm spike — can Muse Wonder turn concepts into worlds that pass their own science checks?
 * Decision rule (see plan.md): ≥ 6/10 verified → "type anything" is the headline. < 6 → hero worlds + variations.
 * Usage: pnpm spike            (all 10)   ·   pnpm spike "How do vaccines…"   (one)
 *
 * With no MODEL_API_KEY this writes docs/spike-results.md and exits 0.
 * It does not call the model and does not invent a verified fraction.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { metaSource } from "@/lib/ai/mode";

const RESULTS = path.join(process.cwd(), "docs/spike-results.md");

const SAMPLE_RESULTS = `# Spike results

The spike did not run because MODEL_API_KEY is unset.

No verified fraction is reported. Sample mode does not call the model, and a sample world is not a model result.
`;

const CONCEPTS = [
  "Why does SQL injection work?",
  "How does natural selection produce camouflage?",
  "Why do bank runs happen?",
  "How do orbits work?",
  "Why does heat flow from hot to cold?",
  "How does public-key cryptography let strangers share secrets?",
  "Why do traffic jams appear out of nowhere?",
  "How does DNS turn a name into an address?",
  "Why do predator and prey populations cycle?",
  "How does a nuclear chain reaction stay controlled?",
];

async function main(): Promise<void> {
  if (metaSource() === "sample") {
    await fs.writeFile(RESULTS, SAMPLE_RESULTS);
    console.log("Spike did not run because MODEL_API_KEY is unset.");
    return;
  }

  const { generateWorld } = await import("@/agents/pipeline");
  const concepts = process.argv[2] ? [process.argv[2]] : CONCEPTS;
  await fs.mkdir(".spike", { recursive: true });
  let verified = 0;
  for (const concept of concepts) {
    const t = Date.now();
    let ok = false;
    for await (const ev of generateWorld(concept)) {
      if (ev.type === "stage") console.log(`  [${ev.stage}] ${ev.message}`);
      if (ev.type === "checks") console.log(`  checks: ${ev.results.filter((r) => r.passed).length}/${ev.results.length} passed`);
      if (ev.type === "world") {
        ok = true;
        await fs.writeFile(`.spike/${ev.spec.id}.json`, JSON.stringify(ev.spec, null, 2));
      }
      if (ev.type === "error") console.log(`  ✗ ${ev.message}`);
    }
    if (ok) verified++;
    console.log(`${ok ? "✅" : "❌"} ${concept} — ${((Date.now() - t) / 1000).toFixed(0)}s\n`);
  }
  console.log(`\nVERIFIED ${verified}/${concepts.length}`);
  await fs.writeFile(
    RESULTS,
    `# Spike results

MODEL_API_KEY was set. The spike called the model.

VERIFIED ${verified}/${concepts.length}
`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
