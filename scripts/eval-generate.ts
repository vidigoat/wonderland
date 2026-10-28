/**
 * pnpm eval — eight fresh questions through generateWorld. pnpm lab — the fifteen Lab questions.
 * With no key this writes the results file and exits 0. It does not invent a fraction.
 *
 * Live: a question only starts if the Baseten ledger has room for a whole question under the stop line
 * (a hard question with three repairs costs about $0.45), so a run can't overshoot the cap.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { reasoningSource } from "@/lib/ai/mode";
import { spendSummary } from "@/lib/ai/spend";

import { LAB_QUESTIONS } from "./lab-questions";

const LAB = process.argv.includes("--lab");
const RESULTS = path.join(process.cwd(), LAB ? "docs/lab-results.md" : "docs/eval-results.md");
const BASETEN_STOP = Number(process.env.EVAL_BASETEN_STOP ?? (LAB ? 9.5 : 4.3));
const QUESTION_ROOM = 0.45;

const EVAL_QUESTIONS = [
  "Why do ants find the shortest path to food?",
  "Why does sugar dissolve faster in hot water?",
  "Why do sand piles suddenly avalanche?",
  "Why do penguins huddle in a rotating crowd?",
  "Why does the Moon always show us the same face?",
  "Why do prices rise when a harvest fails?",
  "Why do rumours spread faster than corrections?",
  "Why do schools of fish swirl in a circle?",
];

const QUESTIONS: readonly string[] = LAB ? LAB_QUESTIONS : EVAL_QUESTIONS;

const NOT_RUN = `# Eval results

The eval did not run. \`MODEL_API_KEY\` is unset, and there is no spend ledger in this checkout.

No fraction, no median time, and no median cost. Those numbers wait for a real \`pnpm eval\`.
`;

type Row = {
  question: string;
  verified: boolean;
  saved: boolean;
  world: string;
  stage: string;
  reason: string;
  seconds: number;
  baseten: number;
  meta: number;
};

async function main(): Promise<void> {
  if (reasoningSource() === "sample") {
    await fs.writeFile(RESULTS, NOT_RUN);
    console.log("Eval did not run because MODEL_API_KEY is unset.");
    return;
  }

  const { generateWorld } = await import("@/agents/pipeline");
  const rows: Row[] = [];
  const left: string[] = [];
  for (const question of QUESTIONS) {
    const before = spendSummary();
    if (before.baseten.spent + QUESTION_ROOM > BASETEN_STOP) {
      left.push(question);
      console.log(`Stop. Baseten ledger is $${before.baseten.spent.toFixed(2)}: not enough room under the $${BASETEN_STOP.toFixed(2)} line for another question.`);
      continue;
    }
    const started = Date.now();
    let verified = false;
    let saved = false;
    let world = "";
    let stage = "none";
    let reason = "";
    for await (const event of generateWorld(question)) {
      if (event.type === "stage") {
        stage = event.stage;
        console.log(`  [${event.stage}] ${event.message}`);
      }
      if (event.type === "world") {
        verified = true;
        world = event.spec.id;
      }
      if (event.type === "stage" && event.stage === "done") saved = true;
      if (event.type === "error") {
        stage = "error";
        reason = event.message;
        console.log(`  ✗ ${event.message}`);
      }
    }
    const after = spendSummary();
    const row: Row = {
      question,
      verified,
      saved,
      world,
      stage,
      reason,
      seconds: Math.round((Date.now() - started) / 1000),
      baseten: Math.round((after.baseten.spent - before.baseten.spent) * 10000) / 10000,
      meta: Math.round((after.meta.spent - before.meta.spent) * 10000) / 10000,
    };
    rows.push(row);
    console.log(`${verified ? (saved ? "verified" : "verified, not saved") : "failed"} ${question} — ${row.seconds}s`);
  }

  const verified = rows.filter((row) => row.verified).length;
  const lines = [
    LAB ? "# Lab results" : "# Eval results",
    "",
    `Each row is one real \`pnpm ${LAB ? "lab" : "eval"}\` question, run on ${new Date().toISOString().slice(0, 10)} with reasoning on Muse Spark Open (Baseten) and art on Muse Image + SAM 3.1. Every world had to pass its science checks on every seed, the playability lint and the honest-readings check. Nothing here is estimated.`,
    "",
    `Ran ${rows.length} of ${QUESTIONS.length}. Verified ${verified}.`,
    "",
    "| Question | Result | World | Stage | Seconds | Baseten USD | Meta USD |",
    "|---|---|---|---|---:|---:|---:|",
    ...rows.map(
      (row) =>
        `| ${row.question} | ${row.verified ? (row.saved ? "verified" : "verified, not saved") : "failed"} | ${row.world ? `\`${row.world}\`` : ""} | ${row.stage} | ${row.seconds} | ${row.baseten.toFixed(4)} | ${row.meta.toFixed(4)} |`,
    ),
    "",
  ];
  if (left.length) {
    lines.push(`Stopped before these, because the Baseten ledger had no room for another question under $${BASETEN_STOP.toFixed(2)}:`, "", ...left.map((question) => `- ${question}`), "");
  }
  const failed = rows.filter((row) => !row.verified);
  if (failed.length) {
    lines.push("Failed, and not re-run in this pass:", "", ...failed.map((row) => `- ${row.question} — ${row.stage}${row.reason ? `: ${row.reason}` : ""}`), "");
  }
  await fs.writeFile(RESULTS, lines.join("\n"));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
