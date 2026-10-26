import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { toPublic, WorldSpec, type PublicWorldSpec } from "@/engine/spec";

const ID = /^[a-z0-9-]+$/;

function defaultDir(): string {
  return path.join(process.cwd(), "data", "worlds");
}

function assertId(id: string): void {
  if (!ID.test(id)) throw new Error(`Invalid world id "${id}". Ids must match /^[a-z0-9-]+$/.`);
}

/** Persist a full spec, including the hidden law, under data/worlds (or `dir`). */
export async function saveWorld(spec: WorldSpec, dir = defaultDir()): Promise<void> {
  assertId(spec.id);
  const parsed = WorldSpec.parse(spec);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${parsed.id}.json`), `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

/** Load a full spec for server use. The browser should receive `toPublic` instead. */
export async function loadWorld(id: string, dir = defaultDir()): Promise<WorldSpec> {
  assertId(id);
  const raw = await readFile(path.join(dir, `${id}.json`), "utf8");
  return WorldSpec.parse(JSON.parse(raw));
}

/** Public gallery list. Hidden laws, answer keys, and checks are removed. */
export async function listPublic(dir = defaultDir()): Promise<PublicWorldSpec[]> {
  let names: string[];
  try {
    names = await readdir(/* turbopackIgnore: true */ dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const specs: PublicWorldSpec[] = [];
  for (const name of names.filter((entry) => entry.endsWith(".json")).sort()) {
    const id = name.slice(0, -".json".length);
    if (!ID.test(id)) continue;
    specs.push(toPublic(await loadWorld(id, dir)));
  }
  return specs;
}
