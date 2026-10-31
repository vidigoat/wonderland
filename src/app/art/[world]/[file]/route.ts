import { readFile } from "node:fs/promises";
import path from "node:path";
import { blobGet, blobStorage, writableDir } from "@/lib/storage/blob";

/**
 * Art painted after the app was built. Production Next.js only serves files that were in public/ at build time,
 * so a world painted live would show no picture until the next deploy. Files that existed at build time are still
 * served by Next directly; this route only answers for the rest, from the same folder.
 */
const WORLD = /^[a-z0-9-]+$/;
const FILE = /^[A-Za-z0-9_-]+\.(webp|png|jpg|svg)$/;
const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml" };

export async function GET(_req: Request, { params }: { params: Promise<{ world: string; file: string }> }) {
  const { world, file } = await params;
  if (!WORLD.test(world) || !FILE.test(file)) return new Response("Not found", { status: 404 });
  const ext = file.slice(file.lastIndexOf(".") + 1);
  const headers = { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" };
  // The project folder, then the writable folder (/tmp on Vercel, where a build in progress drops its pieces),
  // then the Blob store, where finished art painted on Vercel lives.
  for (const folder of [path.join(/* turbopackIgnore: true */ process.cwd(), "public", "art"), writableDir("public", "art")]) {
    try {
      return new Response(new Uint8Array(await readFile(path.join(folder, world, file))), { headers });
    } catch {
      continue;
    }
  }
  if (blobStorage()) {
    const stored = await blobGet(`art/${world}/${file}`);
    if (stored) return new Response(new Uint8Array(stored.bytes), { headers });
  }
  return new Response("Not found", { status: 404 });
}
