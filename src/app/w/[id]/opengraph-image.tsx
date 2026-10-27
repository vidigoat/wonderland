import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { PosterCard } from "@/components/play/PosterCard";
import { posterCopy } from "@/components/play/poster";
import { toPublic } from "@/engine/spec";
import { getHeroWorld } from "@/worlds";

export const alt = "A Wonderland world. The law is still hidden.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spec = getHeroWorld(id);
  if (!spec) notFound();
  const pub = toPublic(spec);
  const copy = posterCopy({ id: pub.id, title: pub.title, tagline: pub.tagline, archetype: pub.archetype });
  return new ImageResponse(<PosterCard copy={copy} />, size);
}
