/**
 * Re-verify every saved world the models built: its science checks on every seed, the playability lint,
 * and the honest-readings check. No network. `pnpm verify-worlds [id]`. Exits 1 if any world fails.
 * The budget is generous because some worlds (a 500-bird flock) need minutes of headless steps.
 */
import { readdirSync, readFileSync } from "node:fs";
import { lintHonestReadings } from "@/agents/honesty";
import { lintPlayability } from "@/agents/playability";
import { runAllChecks } from "@/engine/checks";
import { compileSandboxed } from "@/engine/sandbox.server";
import { WorldSpec } from "@/engine/spec";

const only = process.argv[2];
const files = readdirSync("data/worlds").filter((file) => file.endsWith(".json") && (!only || file === `${only}.json`));
let failed = 0;
for (const file of files) {
  const spec = WorldSpec.parse(JSON.parse(readFileSync(`data/worlds/${file}`, "utf8")));
  if (spec.rules.kind !== "js") continue;
  const source = spec.rules.source;
  const compile = () => compileSandboxed(source, { budgetMs: 900_000 });
  const started = Date.now();
  const checks = await runAllChecks(compile(), spec);
  const playability = await lintPlayability(compile(), spec);
  const honesty = await lintHonestReadings(compile(), spec);
  const passed = checks.filter((check) => check.passed).length;
  const ok = passed === checks.length && playability.length === 0 && honesty.length === 0;
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${spec.id.padEnd(26)} checks ${passed}/${checks.length}  playability ${playability.length ? playability.length + " issue(s)" : "ok"}  honest readings ${honesty.length ? honesty.map((issue) => issue.id).join(", ") : "ok"}  (${((Date.now() - started) / 1000).toFixed(0)}s)`,
  );
  for (const check of checks.filter((item) => !item.passed)) console.log(`      failed ${check.id}: ${check.detail}`);
}
process.exit(failed ? 1 : 0);
