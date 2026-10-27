import { Application, type Ticker } from "pixi.js";
import { asWorldView } from "@/engine/view";
import { pixelRatio } from "./fonts";
import { paletteFor } from "./palette";
import { createBodiesScene } from "./bodies";
import { createFieldScene } from "./field";
import { createPipelineScene } from "./pipeline";
import { createPopulationScene } from "./population";
import type { Frame, Scene, StageProps } from "./scene";

export type { StageProps };

/** Create the Pixi application for a host element. The returned function destroys it. */
export function mountWorldStage(host: HTMLElement, read: () => StageProps): () => void {
  let destroyed = false;
  let closed = false;
  const cleanups: Array<() => void> = [];

  const fail = () => {
    host.dataset.stage = "error";
  };

  void (async () => {
    try {
      if (destroyed) return;
      const first = read();
      const palette = paletteFor(first.worldId, first.artStyle);
      const box = host.getBoundingClientRect();
      const app = new Application();
      await app.init({
        width: Math.max(1, Math.floor(box.width) || 640),
        height: Math.max(1, Math.floor(box.height) || 360),
        resolution: pixelRatio(),
        autoDensity: true,
        antialias: true,
        background: palette.ground,
        preference: "webgl",
        preserveDrawingBuffer: host.closest("[data-capture]") != null,
        hello: false,
      });
      if (destroyed) {
        app.destroy({ removeView: true }, { children: true });
        return;
      }

      const canvas = app.canvas;
      if ("style" in canvas) {
        canvas.style.position = "absolute";
        canvas.style.inset = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
      }
      host.appendChild(canvas);
      app.stage.eventMode = "none";

      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reduced = motion.matches;
      const onMotion = () => {
        reduced = motion.matches;
      };
      motion.addEventListener("change", onMotion);

      let scene: Scene | null = null;
      let sceneKey = "";
      let clock = 0;
      let lastW = 0;
      let lastH = 0;
      let lastDpr = 0;

      const fit = () => {
        const rect = host.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        const dpr = pixelRatio();
        if (width === lastW && height === lastH && dpr === lastDpr) return;
        lastW = width;
        lastH = height;
        lastDpr = dpr;
        app.renderer.resize(width, height, dpr);
        if ("style" in canvas) {
          canvas.style.width = "100%";
          canvas.style.height = "100%";
        }
      };

      const observer = new ResizeObserver(() => fit());
      observer.observe(host);
      fit();

      const onVisibility = () => {
        if (document.hidden) app.ticker.stop();
        else app.ticker.start();
      };
      document.addEventListener("visibilitychange", onVisibility);
      if (document.hidden) app.ticker.stop();

      let announced = false;
      const markReady = () => {
        if (announced || destroyed || closed) return;
        announced = true;
        host.dataset.stage = "ready";
      };
      const teardown = () => {
        if (closed) return;
        closed = true;
        canvas.removeEventListener("webglcontextlost", onLost);
        document.removeEventListener("visibilitychange", onVisibility);
        motion.removeEventListener("change", onMotion);
        observer.disconnect();
        app.ticker.stop();
        scene?.destroy();
        scene = null;
        app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
      };
      const onLost = (event: Event) => {
        event.preventDefault();
        host.dataset.stage = "lost";
        teardown();
      };
      canvas.addEventListener("webglcontextlost", onLost);

      const tick = (ticker: Ticker) => {
        clock += Math.min(ticker.deltaMS, 50);
        const props = read();
        const paletteNow = paletteFor(props.worldId, props.artStyle);
        app.renderer.background.color = paletteNow.ground;
        const key = `${props.archetype}:${props.worldId}`;
        if (key !== sceneKey || !scene) {
          scene?.destroy();
          scene = createScene(props.archetype);
          sceneKey = key;
          app.stage.addChild(scene.root);
        }
        const frame: Frame = {
          ...props,
          view: asWorldView(props.view, props.archetype),
          time: clock,
          reducedMotion: reduced,
          width: app.screen.width,
          height: app.screen.height,
          palette: paletteNow,
        };
        scene.update(frame);
        markReady();
      };
      app.ticker.add(tick);
      cleanups.push(teardown);
      if (destroyed) teardown();
    } catch {
      fail();
    }
  })();

  return () => {
    destroyed = true;
    while (cleanups.length) cleanups.pop()?.();
  };
}

function createScene(archetype: StageProps["archetype"]): Scene {
  if (archetype === "population") return createPopulationScene();
  if (archetype === "bodies") return createBodiesScene();
  if (archetype === "pipeline") return createPipelineScene();
  return createFieldScene();
}
