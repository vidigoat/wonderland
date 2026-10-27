/**
 * Paint saved generated worlds with Muse Image + SAM 3.1 and record the art in each world's file.
 *   pnpm paint firefly-sync-kuramoto [more ids…]   (or --all)
 * Every call goes through the spend guard; the run stops when the Meta cap is reached.
 */
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { finishIllustration } from "@/agents/art-finish";
import { illustrate } from "@/agents/artist";
import { WorldSpec } from "@/engine/spec";
import { spendSummary } from "@/lib/ai/spend";
import { heroWorlds } from "@/worlds";

const dir = path.join(process.cwd(), "data", "worlds");
const args = process.argv.slice(2);
const ids = args.includes("--all") ? (await readdir(dir)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : args;

const heroFile = path.join(process.cwd(), "src", "worlds", "hero-art.json");

for (const id of ids) {
  const hero = heroWorlds.find((world) => world.id === id);
  if (hero) {
    // Hero specs are code; their paintings live in src/worlds/hero-art.json.
    const started = performance.now();
    try {
      const art = await illustrate(hero);
      if (art.source !== "live") throw new Error("The Meta key is not live; nothing was painted.");
      const painted = await finishIllustration(hero.id, art, path.join(process.cwd(), "public", "art"));
      const all = JSON.parse(await readFile(heroFile, "utf8")) as Record<string, unknown>;
      all[hero.id] = painted;
      await writeFile(heroFile, `${JSON.stringify(all, null, 2)}\n`);
      console.log(`${id}: painted in ${((performance.now() - started) / 1000).toFixed(0)}s`, painted);
    } catch (error) {
      console.error(`${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log(JSON.stringify(spendSummary()));
    continue;
  }
  const file = path.join(dir, `${id}.json`);
  const raw = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
  const holder = (raw.spec ?? raw) as Record<string, unknown>;
  const spec = WorldSpec.parse(holder);
  if (spec.art.painted && !args.includes("--again")) {
    console.log(`${id}: already painted`);
    continue;
  }
  const started = performance.now();
  try {
    const art = await illustrate(spec);
    if (art.source !== "live") throw new Error("The Meta key is not live; nothing was painted.");
    const painted = await finishIllustration(spec.id, art, path.join(process.cwd(), "public", "art"));
    (holder.art as Record<string, unknown>).painted = painted;
    await writeFile(file, `${JSON.stringify(raw, null, 2)}\n`);
    console.log(`${id}: painted in ${((performance.now() - started) / 1000).toFixed(0)}s`, painted);
  } catch (error) {
    console.error(`${id}: ${error instanceof Error ? error.message : String(error)}`);
    // Leave no half-painted, full-size originals behind in public/.
    const folder = path.join(process.cwd(), "public", "art", id);
    for (const file of await readdir(folder).catch(() => [] as string[])) {
      if (/\.(png|jpg)$/.test(file)) await rm(path.join(folder, file), { force: true });
    }
  }
  console.log(JSON.stringify(spendSummary()));
}
