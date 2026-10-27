import heroArt from "./hero-art.json";

type Painting = { background?: string; sprites?: Record<string, string> };

/**
 * Light, client-safe lookup of a hero world's Muse Image + SAM 3.1 files, for the cards.
 * `name` is a sprite name ("background", "moth"); `fallback` is the handmade SVG.
 */
export function heroArtUrl(worldId: string, name: string, fallback: string): string {
  const art = (heroArt as Record<string, Painting>)[worldId];
  const url = name === "background" ? art?.background : art?.sprites?.[name];
  return url && /^\/art\/[a-z0-9-]+\/[A-Za-z0-9-]+\.webp$/.test(url) ? url : fallback;
}
