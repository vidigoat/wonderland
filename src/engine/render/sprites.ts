import { Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";
import { drawSilhouette } from "./silhouettes";

const cache = new Map<string, Promise<Texture | null>>();

export function spriteUrl(worldId: string, sprite: string): string {
  return `/art/${encodeURIComponent(worldId)}/${encodeURIComponent(sprite)}.svg`;
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
  show(worldId: string, sprite: string, tint: number): void;
  /** Drop a pending sprite load without destroying the display object. */
  cancel(): void;
  destroy(): void;
};

/** Silhouette immediately, swapped for `/art/${worldId}/${sprite}.svg` if that file loads. */
export function createFigure(): Figure {
  const view = new Container();
  let graphic: Graphics | null = null;
  let spriteView: Sprite | null = null;
  let key = "";
  let token = 0;
  let alive = true;
  let tint = 0xffffff;

  const applyTint = () => {
    if (graphic) graphic.tint = tint;
    if (spriteView) spriteView.tint = tint;
  };

  return {
    view,
    show(worldId, sprite, nextTint) {
      tint = nextTint;
      const nextKey = `${worldId}/${sprite}`;
      if (key !== nextKey) {
        key = nextKey;
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
          next.scale.set(FIGURE / Math.max(texture.height, 1));
          graphic?.destroy();
          graphic = null;
          spriteView = next;
          next.tint = tint;
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
