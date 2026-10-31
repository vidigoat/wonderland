import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { toPublic, WorldSpec, type PublicWorldSpec } from "@/engine/spec";
import { blobGetText, blobList, blobPut, blobStorage } from "./blob";

const ID = /^[a-z0-9-]+$/;

function defaultDir(): string {
  return path.join(process.cwd(), "data", "worlds");
}

function assertId(id: string): void {
  if (!ID.test(id)) throw new Error(`Invalid world id "${id}". Ids must match /^[a-z0-9-]+$/.`);
}

/**
 * Persist a full spec, including the hidden law, under data/worlds (or `dir`). On Vercel it goes to the private
 * Blob store, where it also overrides a world that shipped with the app (a repaired one).
 */
export async function saveWorld(spec: WorldSpec, dir?: string): Promise<void> {
  assertId(spec.id);
  const parsed = WorldSpec.parse(spec);
  if (!dir && blobStorage()) {
    await blobPut(`worlds/${parsed.id}.json`, `${JSON.stringify(parsed, null, 2)}\n`, "application/json");
    return;
  }
  dir ??= defaultDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${parsed.id}.json`), `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

/** Load a full spec for server use. The browser should receive `toPublic` instead. */
export async function loadWorld(id: string, dir?: string): Promise<WorldSpec> {
  assertId(id);
  if (!dir && blobStorage()) {
    const stored = await blobGetText(`worlds/${id}.json`);
    if (stored) return WorldSpec.parse(JSON.parse(stored));
  }
  const raw = await readFile(path.join(dir ?? defaultDir(), `${id}.json`), "utf8");
  return WorldSpec.parse(JSON.parse(raw));
}

/** Public gallery list. Hidden laws, answer keys, and checks are removed. */
export async function listPublic(dir?: string): Promise<PublicWorldSpec[]> {
  let names: string[] = [];
  try {
    names = await readdir(/* turbopackIgnore: true */ dir ?? defaultDir());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const ids = new Set(names.filter((entry) => entry.endsWith(".json")).map((name) => name.slice(0, -".json".length)));
  if (!dir && blobStorage()) {
    for (const pathname of await blobList("worlds/")) ids.add(pathname.slice("worlds/".length).replace(/\.json$/, ""));
  }
  const specs: PublicWorldSpec[] = [];
  for (const id of [...ids].sort()) {
    if (!ID.test(id)) continue;
    specs.push(toPublic(await loadWorld(id, dir)));
  }
  return specs;
}
