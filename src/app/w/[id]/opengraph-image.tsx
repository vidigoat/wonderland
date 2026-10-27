import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { notFound } from "next/navigation";
import { PosterCard } from "@/components/play/PosterCard";
import { posterCopy } from "@/components/play/poster";
import { toPublic } from "@/engine/spec";
import { findWorld } from "@/worlds/find.server";

export const alt = "A Wonderland world. The law is still hidden.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spec = await findWorld(id);
  if (!spec) notFound();
  const pub = toPublic(spec);
  const copy = posterCopy({ id: pub.id, title: pub.title, tagline: pub.tagline, archetype: pub.archetype });
  return new ImageResponse(<PosterCard copy={copy} painting={await paintingFor(spec.art.painted?.background)} />, size);
}

/** The share card can't read WebP, so the painting is re-encoded as a small JPEG data URL. */
async function paintingFor(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const file = path.join(/* turbopackIgnore: true */ process.cwd(), "public", url);
    const jpeg = await sharp(await readFile(file)).resize(680, 680, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return undefined;
  }
}
