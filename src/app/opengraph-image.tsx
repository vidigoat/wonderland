import { ImageResponse } from "next/og";
import { PosterCard } from "@/components/play/PosterCard";
import { posterCopy } from "@/components/play/poster";

export const alt = "Wonderland. The AI builds the world. You find the law.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const copy = posterCopy({
    id: "wonderland",
    title: "Wonderland",
    tagline: "The AI builds the world. You find the law.",
    archetype: "population",
  });
  return new ImageResponse(<PosterCard copy={copy} kicker="The shelf" footer="Five worlds are already on the shelf." />, size);
}
