import "server-only";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { PaintedArt } from "@/engine/spec";
import type { Illustration } from "./artist";

const BACKGROUND_WIDTH = 1280;
const SPRITE_SIZE = 192;

/**
 * Muse Image paints at 1600px and the cut sprites are full-size PNGs — megabytes per world.
 * This turns a live illustration into small WebP files the stage can load in a blink,
 * trims each sprite to its silhouette, and removes the originals from public/.
 */
export async function finishIllustration(worldId: string, art: Illustration, artDir: string): Promise<PaintedArt> {
  const folder = path.join(artDir, worldId);
  const toWebp = async (url: string, kind: "background" | "sprite"): Promise<string> => {
    const name = path.basename(url).replace(/\.(png|jpg)$/, "");
    const source = path.join(folder, path.basename(url));
    const input = await readFile(source);
    const image =
      kind === "background"
        ? sharp(input).resize({ width: BACKGROUND_WIDTH, withoutEnlargement: true }).webp({ quality: 78 })
        : sharp(input).trim({ threshold: 1 }).resize({ width: SPRITE_SIZE, height: SPRITE_SIZE, fit: "inside", withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 90 });
    await writeFile(path.join(folder, `${name}.webp`), await image.toBuffer());
    if (source.endsWith(".png") || source.endsWith(".jpg")) await rm(source, { force: true });
    return `/art/${worldId}/${name}.webp`;
  };

  const sprites: Record<string, string> = {};
  const done = new Map<string, string>();
  for (const [sprite, url] of Object.entries(art.sprites)) {
    if (!url.startsWith(`/art/${worldId}/`)) continue;
    const cached = done.get(url) ?? (await toWebp(url, "sprite"));
    done.set(url, cached);
    sprites[sprite] = cached;
  }
  return { background: await toWebp(art.background, "background"), sprites };
}
