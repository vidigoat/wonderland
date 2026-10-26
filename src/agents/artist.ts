import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorldSpec } from "@/engine/spec";
import { decodeMaskToRaster, parseSamOutput, type SamRecord } from "@/lib/ai/sam-parse";
import { metaSource } from "@/lib/ai/mode";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";
import { decodePng, encodeRgbaPng, type RgbaImage } from "@/lib/storage/png";

const ID = /^[a-z0-9-]+$/;

/** Sprite names the stage looks up, including ones that are not entity ids. */
const VIEW_SPRITES: Record<string, readonly string[]> = {
  "peppered-forest": ["moth", "bird"],
  "rumour-town": ["citizen", "citizen-queue", "bank"],
  gatekeeper: ["scribe", "scroll", "vault"],
  "newtons-cannon": ["cannon", "planet"],
  firebreak: ["tree", "flame"],
};

export type Illustration = {
  source: "sample" | "live";
  notice?: string;
  sprites: Record<string, string>;
  background: string;
};

function assertId(id: string): void {
  if (!ID.test(id)) throw new Error(`Invalid world id "${id}". Ids must match /^[a-z0-9-]+$/.`);
}

function spriteUrls(spec: WorldSpec, ext: "svg" | "png", overrides?: Record<string, string>): Record<string, string> {
  const sprites: Record<string, string> = {};
  for (const entity of spec.entities) {
    sprites[entity.id] = overrides?.[entity.id] ?? `/art/${spec.id}/${entity.id}.${ext}`;
  }
  for (const alias of VIEW_SPRITES[spec.id] ?? []) {
    if (!sprites[alias]) sprites[alias] = overrides?.[alias] ?? `/art/${spec.id}/${alias}.${ext}`;
  }
  return sprites;
}

function sampleIllustration(spec: WorldSpec): Illustration {
  return {
    source: "sample",
    notice: SAMPLE_NOTICE,
    sprites: spriteUrls(spec, "svg"),
    background: `/art/${spec.id}/background.svg`,
  };
}

function imageBytes(value: string): Buffer {
  const trimmed = value.trim();
  const payload = trimmed.startsWith("data:") ? trimmed.slice(trimmed.indexOf(",") + 1) : trimmed;
  return Buffer.from(payload, "base64");
}

function mediaType(bytes: Buffer): "image/png" | "image/jpeg" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

function cutSprite(entityId: string, image: RgbaImage, record: SamRecord, raster: Uint8Array): RgbaImage {
  const mask = record.mask;
  if (!mask) throw new Error(`SAM returned no mask for ${entityId}.`);
  if (raster.length !== mask.h * mask.w) throw new Error(`SAM mask for ${entityId} decoded to the wrong size.`);
  const { x1, y1, x2, y2 } = record.box;
  const boxW = x2 - x1 + 1;
  const boxH = y2 - y1 + 1;
  if (boxW <= 0 || boxH <= 0) throw new Error(`SAM box for ${entityId} is empty.`);
  if (x1 < 0 || y1 < 0 || x2 >= image.width || y2 >= image.height) {
    throw new Error(`SAM box for ${entityId} falls outside the painted image.`);
  }
  const rgba = new Uint8Array(boxW * boxH * 4);
  let covered = 0;
  for (let y = 0; y < boxH; y += 1) {
    for (let x = 0; x < boxW; x += 1) {
      const mx = mask.w === boxW ? x : Math.min(mask.w - 1, Math.floor((x * mask.w) / boxW));
      const my = mask.h === boxH ? y : Math.min(mask.h - 1, Math.floor((y * mask.h) / boxH));
      const on = raster[my * mask.w + mx] === 1;
      const dest = (y * boxW + x) * 4;
      if (!on) continue;
      const source = ((y1 + y) * image.width + (x1 + x)) * 4;
      rgba[dest] = image.rgba[source]!;
      rgba[dest + 1] = image.rgba[source + 1]!;
      rgba[dest + 2] = image.rgba[source + 2]!;
      rgba[dest + 3] = 255;
      covered += 1;
    }
  }
  if (covered === 0) throw new Error(`SAM mask for ${entityId} was empty.`);
  return { width: boxW, height: boxH, rgba };
}

function largestMask(entityId: string, text: string): { record: SamRecord; raster: Uint8Array } {
  const records = parseSamOutput(text).filter((record) => record.mask);
  if (records.length === 0) throw new Error(`SAM returned no mask for ${entityId}.`);
  let best: { record: SamRecord; raster: Uint8Array; set: number } | null = null;
  for (const record of records) {
    const raster = decodeMaskToRaster(record.mask!);
    let set = 0;
    for (const value of raster) set += value;
    if (!best || set > best.set) best = { record, raster, set };
  }
  if (!best || best.set === 0) throw new Error(`SAM mask for ${entityId} was empty.`);
  return best;
}

async function liveIllustration(spec: WorldSpec, artDir: string): Promise<Illustration> {
  const { paint, segment } = await import("@/lib/ai/meta");
  const folder = path.join(artDir, spec.id);
  await mkdir(folder, { recursive: true });

  const backgroundImages = await paint({
    prompt: `${spec.art.background}. Painted in this style: ${spec.art.style}. Full-frame scene, no text, no border.`,
    size: "1024x1024",
  });
  const backgroundB64 = backgroundImages[0];
  if (!backgroundB64) throw new Error(`Muse Image returned no background for ${spec.id}.`);
  const backgroundBytes = imageBytes(backgroundB64);
  const backgroundType = mediaType(backgroundBytes);
  if (!backgroundType) throw new Error(`Muse Image returned an unrecognized background for ${spec.id}.`);
  const backgroundExt = backgroundType === "image/jpeg" ? "jpg" : "png";
  await writeFile(path.join(folder, `background.${backgroundExt}`), backgroundBytes);

  const written: Record<string, string> = {};
  for (const entity of spec.entities) {
    const painted = await paint({
      prompt: `${entity.artPrompt}. Style: ${spec.art.style}. Single subject, centered, flat background, no text.`,
      size: "1024x1024",
    });
    const b64 = painted[0];
    if (!b64) throw new Error(`Muse Image returned no picture for ${entity.id}.`);
    const bytes = imageBytes(b64);
    const type = mediaType(bytes);
    const text = await segment({
      prompt: entity.segmentPrompt,
      imageUrl: `data:${type ?? "application/octet-stream"};base64,${bytes.toString("base64")}`,
    });
    if (type !== "image/png") {
      throw new Error(`Muse Image returned ${type ?? "an unrecognized image"} for ${entity.id}. A PNG is required to cut a transparent sprite.`);
    }
    const { record, raster } = largestMask(entity.id, text);
    let image: RgbaImage;
    try {
      image = decodePng(bytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : "could not read PNG";
      throw new Error(`Could not read the painted PNG for ${entity.id}: ${message}`);
    }
    const sprite = cutSprite(entity.id, image, record, raster);
    await writeFile(path.join(folder, `${entity.id}.png`), encodeRgbaPng(sprite));
    written[entity.id] = `/art/${spec.id}/${entity.id}.png`;
  }
  if (written.citizen) written["citizen-queue"] = written.citizen;

  return {
    source: "live",
    sprites: spriteUrls(spec, "png", written),
    background: `/art/${spec.id}/background.${backgroundExt}`,
  };
}

/**
 * Sample lane serves the handmade files in public/art and says so.
 * Live lane calls Muse Image, then SAM, and writes a transparent PNG.
 * A live failure is rethrown — sample art is never substituted for a failed call.
 */
export async function illustrate(spec: WorldSpec, artDir?: string): Promise<Illustration> {
  assertId(spec.id);
  if (metaSource() === "sample") return sampleIllustration(spec);
  return liveIllustration(spec, artDir ?? path.join(process.cwd(), "public", "art"));
}
