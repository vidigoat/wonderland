import { Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";
import type { PaintedArt } from "@/engine/spec";
import { isHeroWorld } from "./palette";
import { drawSilhouette } from "./silhouettes";

const cache = new Map<string, Promise<Texture | null>>();
const paintedWorlds = new Map<string, PaintedArt>();

/** Worlds painted by Muse Image + SAM 3.1 load their own files; every other world keeps its handmade SVGs. */
export function registerPaintedArt(worldId: string, art: PaintedArt | undefined): void {
  if (worldId && art) paintedWorlds.set(worldId, art);
}

export function isPaintedWorld(worldId: string): boolean {
  return paintedWorlds.has(worldId);
}

export function paintedSpriteNames(worldId: string): string[] {
  return Object.keys(paintedWorlds.get(worldId)?.sprites ?? {});
}

function paintedUrl(worldId: string, sprite: string): string | undefined {
  const art = paintedWorlds.get(worldId);
  return sprite === "background" ? art?.background : art?.sprites[sprite];
}

export function spriteUrl(worldId: string, sprite: string): string {
  return paintedUrl(worldId, sprite) ?? `/art/${encodeURIComponent(worldId)}/${encodeURIComponent(sprite)}.svg`;
}

/** A painting keeps its own colours: the state tint only changes how bright it is. */
function brightnessOf(tint: number): number {
  const r = (tint >> 16) & 0xff;
  const g = (tint >> 8) & 0xff;
  const b = tint & 0xff;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const v = Math.round((0.42 + 0.58 * lum) * 255);
  return (v << 16) | (v << 8) | v;
}

/** Load sample art. A missing file resolves to null and never throws. */
export function loadSprite(worldId: string, sprite: string): Promise<Texture | null> {
  if (!worldId || !sprite) return Promise.resolve(null);
  const url = spriteUrl(worldId, sprite);
  let pending = cache.get(url);
  if (!pending) {
    pending = (async () => {
      try {
        const texture = await Assets.load<Texture>(url);
        if (!texture || texture.destroyed || texture.width <= 0 || texture.height <= 0) return null;
        return texture;
      } catch {
        return null;
      }
    })();
    cache.set(url, pending);
  }
  return pending;
}

const FIGURE = 86;

export type Figure = {
  view: Container;
  show(worldId: string, sprite: string, tint: number, tintArt?: boolean): void;
  /** Drop a pending sprite load without destroying the display object. */
  cancel(): void;
  destroy(): void;
};

/** Silhouette immediately, swapped for the world's art (painted, or `/art/${worldId}/${sprite}.svg`) if that file loads. */
export function createFigure(): Figure {
  const view = new Container();
  let graphic: Graphics | null = null;
  let spriteView: Sprite | null = null;
  let key = "";
  let token = 0;
  let alive = true;
  let tint = 0xffffff;
  let tintArt = false;
  let painting = false;

  const artTint = () => (!tintArt ? 0xffffff : painting ? brightnessOf(tint) : tint);
  const applyTint = () => {
    if (graphic) graphic.tint = tint;
    if (spriteView) spriteView.tint = artTint();
  };

  return {
    view,
    show(worldId, sprite, nextTint, paintTint = false) {
      tint = nextTint;
      tintArt = paintTint;
      const nextKey = `${worldId}/${sprite}`;
      if (key !== nextKey) {
        key = nextKey;
        // Hero worlds' paintings are pale on purpose and take the full tint, so the science colours stay exact.
        painting = paintedUrl(worldId, sprite) !== undefined && !isHeroWorld(worldId);
        const current = ++token;
        spriteView?.destroy();
        spriteView = null;
        graphic?.destroy();
        graphic = new Graphics();
        drawSilhouette(graphic, sprite);
        view.addChild(graphic);
        void loadSprite(worldId, sprite).then((texture) => {
          if (!alive || current !== token || !texture) return;
          const next = new Sprite(texture);
          next.anchor.set(0.5);
          // Handmade SVGs are drawn to a height; a painted cut-out (a moth with open wings) is sized by its longest side.
          const side = paintedUrl(worldId, sprite) ? Math.max(texture.width, texture.height) : texture.height;
          next.scale.set(FIGURE / Math.max(side, 1));
          graphic?.destroy();
          graphic = null;
          spriteView = next;
          next.tint = artTint();
          view.addChild(next);
        });
      }
      applyTint();
    },
    cancel() {
      alive = false;
    },
    destroy() {
      alive = false;
      view.destroy({ children: true });
    },
  };
}

export function destroyChildren(container: Container): void {
  const removed = container.removeChildren();
  for (const child of removed) child.destroy({ children: true, context: true });
}
