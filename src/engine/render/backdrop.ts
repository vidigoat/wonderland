import { Sprite, Texture } from "pixi.js";
import { loadSprite } from "./sprites";

/** Full-bleed sample background. Hidden until `/art/${worldId}/background.svg` loads. */
export function createBackdrop() {
  const view = new Sprite(Texture.EMPTY);
  view.anchor.set(0.5);
  view.visible = false;
  let worldId = "";
  let token = 0;
  let alive = true;

  const cover = (width: number, height: number) => {
    const texture = view.texture;
    if (!texture || texture === Texture.EMPTY || texture.width <= 0 || texture.height <= 0) return;
    const scale = Math.max(width / texture.width, height / texture.height);
    view.scale.set(scale);
    view.position.set(width / 2, height / 2);
  };

  return {
    view,
    /** Returns true once the painting is on screen. */
    show(nextWorld: string, width: number, height: number): boolean {
      if (!alive || width <= 0 || height <= 0) return false;
      if (nextWorld !== worldId) {
        worldId = nextWorld;
        const current = ++token;
        view.visible = false;
        view.texture = Texture.EMPTY;
        void loadSprite(nextWorld, "background").then((texture) => {
          if (!alive || current !== token || !texture) return;
          view.texture = texture;
          view.visible = true;
          cover(width, height);
        });
        return false;
      }
      if (view.visible) cover(width, height);
      return view.visible;
    },
    destroy() {
      alive = false;
      view.destroy();
    },
  };
}
