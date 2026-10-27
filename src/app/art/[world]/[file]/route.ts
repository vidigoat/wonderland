import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Art painted after the app was built. Production Next.js only serves files that were in public/ at build time,
 * so a world painted live would show no picture until the next deploy. Files that existed at build time are still
 * served by Next directly; this route only answers for the rest, from the same folder.
 */
const WORLD = /^[a-z0-9-]+$/;
const FILE = /^[A-Za-z0-9-]+\.(webp|png|jpg|svg)$/;
const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml" };

export async function GET(_req: Request, { params }: { params: Promise<{ world: string; file: string }> }) {
  const { world, file } = await params;
  if (!WORLD.test(world) || !FILE.test(file)) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(/* turbopackIgnore: true */ process.cwd(), "public", "art", world, file));
    const ext = file.slice(file.lastIndexOf(".") + 1);
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
