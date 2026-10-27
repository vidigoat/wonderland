import { clamp01, cssHex, lerpColor } from "./helpers";

export type WorldPalette = {
  ground: number;
  ink: number;
  parchment: number;
  accent: number;
  deep: number;
  brass: number;
  mist: number;
  glow: number;
};

const GATEKEEPER: WorldPalette = {
  ground: 0x241816,
  ink: 0x14110e,
  parchment: 0xf3ead7,
  accent: 0xc6a15a,
  deep: 0x6e2430,
  brass: 0xa56b3c,
  mist: 0x4a342c,
  glow: 0xf0d9a0,
};

const FOREST: WorldPalette = {
  ground: 0xd7cdb6,
  ink: 0x241c16,
  parchment: 0xf4efe4,
  accent: 0x5d7a55,
  deep: 0x2c3a2c,
  brass: 0x8a7048,
  mist: 0xc4b79a,
  glow: 0xf7f3ea,
};

const CANNON: WorldPalette = {
  ground: 0x10182e,
  ink: 0xe7e1d4,
  parchment: 0xf3ead7,
  accent: 0xd4b483,
  deep: 0x163a4a,
  brass: 0xb8925a,
  mist: 0x243056,
  glow: 0xf6e7c1,
};

const TOWN: WorldPalette = {
  ground: 0x3a2a32,
  ink: 0x2a211c,
  parchment: 0xfff4e4,
  accent: 0xf0b36a,
  deep: 0x7d4454,
  brass: 0xc4884a,
  mist: 0x5c4650,
  glow: 0xffe1b0,
};

const FIRE: WorldPalette = {
  ground: 0x1c1a3a,
  ink: 0x14110e,
  parchment: 0xe7e0d2,
  accent: 0xe15a24,
  deep: 0x3e6b45,
  brass: 0xa56b3c,
  mist: 0x2a2748,
  glow: 0xffb088,
};

/** Generated worlds without a matching art style: the site's black and white, light sprites on black. */
const NEUTRAL: WorldPalette = {
  ground: 0x0a0a0a,
  ink: 0x6b6b6b,
  parchment: 0xfafafa,
  accent: 0xd4d4d4,
  deep: 0x404040,
  brass: 0x737373,
  mist: 0x171717,
  glow: 0xffffff,
};

const BY_ID: Record<string, WorldPalette> = {
  gatekeeper: GATEKEEPER,
  "peppered-forest": FOREST,
  "newtons-cannon": CANNON,
  "rumour-town": TOWN,
  firebreak: FIRE,
};

/** The five hand-built worlds, whose sprite colours carry their science (moth darkness, a worried citizen). */
export function isHeroWorld(worldId: string): boolean {
  return worldId in BY_ID;
}

export function paletteFor(worldId: string, artStyle: string): WorldPalette {
  const known = BY_ID[worldId];
  if (known) return known;
  const style = artStyle.toLowerCase();
  if (/woodcut|ember|firebreak|indigo/.test(style)) return FIRE;
  if (/engraving|navy|cannon|orbit/.test(style)) return CANNON;
  if (/pastel|lamplight|cosy|cozy|town/.test(style)) return TOWN;
  if (/gouache|moss|forest|birch|moth/.test(style)) return FOREST;
  if (/manuscript|oxblood|ledger|parchment|gold leaf/.test(style)) return GATEKEEPER;
  return NEUTRAL;
}

/** Birch bark from the soot knob. 0 is cream paper, 1 is soot. */
export function barkColor(darkness: number): number {
  return lerpColor(0xe7dcc4, 0x2a2622, clamp01(darkness));
}

/** Sprites drawn as lights: a high value should read as brighter, not darker. */
export function isGlowSprite(sprite = ""): boolean {
  const key = sprite.toLowerCase();
  if (key.includes("starling")) return false;
  return ["firefly", "glow", "light", "spark", "star"].some((word) => key.includes(word));
}

export function populationTint(worldId: string, tint: number, palette: WorldPalette, sprite?: string): number {
  const t = clamp01(tint);
  if (isGlowSprite(sprite)) return lerpColor(0x4a3416, 0xfff1a8, t);
  if (worldId === "peppered-forest") return lerpColor(0xf4efe2, 0x2a2622, t);
  if (worldId === "rumour-town") return lerpColor(0xf6d7b8, 0x7c3040, t);
  return lerpColor(palette.parchment, palette.ink, t);
}

export { cssHex };
