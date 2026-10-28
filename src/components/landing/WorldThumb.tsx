"use client";

import { useEffect, useRef } from "react";
import { compileRules, type RulesModule } from "@/engine/rules";
import { WorldSession } from "@/engine/runtime";
import type { PublicWorldSpec } from "@/engine/spec";
import { bodyFacing, cssHex, figureTint, flockFacing, heightSilhouette, ridgeWindow, softenRidge, thumbFigurePx, thumbJamInk, thumbJamQueue, thumbPlace, thumbSample, thumbSky, thumbSpritePx, thumbSteps } from "@/engine/render/helpers";
import { asWorldView, isParticlesView } from "@/engine/view";

/**
 * A still of a generated world, made by actually running it: its own verified rules, its own default knobs,
 * long enough for the picture to show the phenomenon. Drawn over the world's Muse Image painting, so the card shows what that world really looks like.
 */

function lightness(t: number): string {
  const v = Math.round(60 + Math.max(0, Math.min(1, t)) * 195);
  return `rgb(${v}, ${v}, ${v})`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export function WorldThumb({ spec }: { spec: PublicWorldSpec }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || spec.rules.kind !== "js") return;
    let rules: RulesModule;
    try {
      rules = compileRules(spec.rules.source);
    } catch {
      return;
    }
    let alive = true;
    const params = Object.fromEntries(spec.knobs.map((knob) => [knob.id, knob.default]));
    void (async () => {
      try {
        const session = await new WorldSession(rules, params, 11).start();
        const total = thumbSteps(spec.id);
        const chunk = total > 120 ? 50 : total;
        for (let done = 0; done < total; done += chunk) {
          if (!alive) return;
          await session.tick(Math.min(chunk, total - done));
          if (done + chunk < total) await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (!alive) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = (canvas.width = canvas.clientWidth * dpr);
        const h = (canvas.height = canvas.clientHeight * dpr);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, w, h);
        const painting = spec.art.painted?.background;
        if (painting) {
          // The Muse Image painting, covered and dimmed so the world's own motion still reads on top.
          const image = await loadImage(painting);
          if (!alive) return;
          if (image) {
            const scale = Math.max(w / image.width, h / image.height);
            ctx.drawImage(image, (w - image.width * scale) / 2, (h - image.height * scale) / 2, image.width * scale, image.height * scale);
            ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            ctx.fillRect(0, 0, w, h);
          }
        }
        const view = asWorldView(session.view(), spec.archetype);
        if (!view) return;
        // Painted creatures (Muse Image, cut out by SAM 3.1) stand in for the glow dots.
        const spriteUrls = spec.art.painted?.sprites ?? {};
        const names = Object.keys(spriteUrls);
        const sprites = new Map<string, HTMLImageElement>();
        await Promise.all(
          names.map(async (name) => {
            const image = await loadImage(spriteUrls[name]!);
            if (image) sprites.set(name, image);
          }),
        );
        if (!alive) return;
        const spriteOf = (name: string) => sprites.get(name) ?? sprites.get(names[0] ?? "");
        const drawSprite = (image: HTMLImageElement, x: number, y: number, size: number, alpha = 1, turn = 0, flip = false) => {
          const k = size / Math.max(image.width, image.height);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(x, y);
          ctx.rotate(turn);
          if (flip) ctx.scale(-1, 1);
          ctx.drawImage(image, (-image.width * k) / 2, (-image.height * k) / 2, image.width * k, image.height * k);
          ctx.restore();
        };
        // A stopped car keeps the cut-out shape and is filled dark, so the bright mark around it stays visible.
        const drawStuck = (image: HTMLImageElement, x: number, y: number, size: number, ink: string, turn = 0, flip = false) => {
          const k = size / Math.max(image.width, image.height);
          const dw = Math.max(1, Math.ceil(image.width * k));
          const dh = Math.max(1, Math.ceil(image.height * k));
          const plate = document.createElement("canvas");
          plate.width = dw;
          plate.height = dh;
          const bits = plate.getContext("2d");
          if (!bits) {
            drawSprite(image, x, y, size, 1, turn, flip);
            return;
          }
          bits.drawImage(image, 0, 0, dw, dh);
          bits.globalCompositeOperation = "source-atop";
          bits.fillStyle = ink;
          bits.fillRect(0, 0, dw, dh);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(turn);
          if (flip) ctx.scale(-1, 1);
          ctx.drawImage(plate, -dw / 2, -dh / 2);
          ctx.restore();
        };
        const sky = thumbSky(w, h);
        const at = (x: number, y: number) => [sky.x + x * sky.w, sky.y + y * sky.h] as const;
        if (view.kind === "population") {
          const headed = view.agents.some((agent) => typeof agent.heading === "number" && Number.isFinite(agent.heading));
          const agents = [...thumbSample(view.agents, headed)].sort((a, b) => a.y - b.y);
          const airborne = headed || agents.some((agent) => /firefly|starling|bird|moth/i.test(String(agent.sprite ?? "")));
          const band = thumbPlace(airborne);
          const place = (x: number, y: number) => [sky.x + x * sky.w, h * (band.y0 + y * (band.y1 - band.y0))] as const;
          const size = thumbSpritePx(Math.min(sky.w, sky.h), agents.length, headed);
          for (const agent of agents) {
            const [x, y] = place(agent.x, agent.y);
            const image = sprites.size > 0 ? spriteOf(String(agent.sprite ?? "")) : undefined;
            if (image) {
              const heading = agent.heading;
              const hasHeading = typeof heading === "number" && Number.isFinite(heading);
              const turn = hasHeading ? flockFacing(heading) : 0;
              const alpha = hasHeading ? 0.92 : 0.55 + Math.max(0, Math.min(1, agent.tint)) * 0.45;
              drawSprite(image, x, y, size, alpha, turn);
              continue;
            }
            const r = (2.2 + agent.tint * 2.6) * dpr;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
            glow.addColorStop(0, lightness(agent.tint));
            glow.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, r * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (view.kind === "bodies" && isParticlesView(view)) {
          const { x: bx, y: by, w: bw, h: bh } = view.bounds;
          const bodies = [...view.bodies].sort((a, b) => Number(((a as { vx?: number }).vx ?? 1) < 0.5) - Number(((b as { vx?: number }).vx ?? 1) < 0.5));
          const placed = bodies.slice(0, 400).map((body) => ({
            body,
            at: at((body.x - bx) / bw, (body.y - by) / bh),
          }));
          const row = placed.length > 1 && Math.max(...placed.map((item) => item.at[1])) - Math.min(...placed.map((item) => item.at[1])) < 2;
          const skyMin = Math.min(sky.w, sky.h);
          const roadY = h * 0.5;
          const drawBody = (body: (typeof placed)[number]["body"], x: number, y: number, stopped: boolean) => {
            const speed = (body as { vx?: number }).vx;
            const size = thumbFigurePx(skyMin, stopped);
            if (stopped) {
              ctx.fillStyle = cssHex(figureTint(spec.id, speed));
              ctx.beginPath();
              ctx.arc(x, y, size * 0.52, 0, Math.PI * 2);
              ctx.fill();
            }
            const image = sprites.size > 0 ? spriteOf(String(body.id ?? "").replace(/[-_]?\d+$/, "")) : undefined;
            if (image) {
              const face = bodyFacing(speed, image.height > image.width * 1.25);
              const ink = thumbJamInk(spec.id, speed);
              if (ink) drawStuck(image, x, y, size, ink, face.turn, face.flip);
              else drawSprite(image, x, y, size, 1, face.turn, face.flip);
              return;
            }
            ctx.fillStyle = typeof body.color === "string" ? body.color : "#fafafa";
            ctx.beginPath();
            ctx.arc(x, y, 3.2 * dpr, 0, Math.PI * 2);
            ctx.fill();
          };
          const jammed = placed.filter((item) => figureTint(spec.id, (item.body as { vx?: number }).vx) !== 0xffffff);
          const moving = placed.filter((item) => figureTint(spec.id, (item.body as { vx?: number }).vx) === 0xffffff);
          for (const item of moving) {
            const [x, y] = row ? [item.at[0], roadY] : item.at;
            drawBody(item.body, x, y, false);
          }
          if (jammed.length > 0) {
            const size = thumbFigurePx(skyMin, true);
            const queue = thumbJamQueue(jammed.length, size);
            const ordered = [...jammed].sort((a, b) => a.at[0] - b.at[0]);
            const lead = ordered[0]!.at[0];
            for (let i = 0; i < queue.shown; i++) {
              const item = ordered[Math.min(i, ordered.length - 1)]!;
              const [rawX, rawY] = item.at;
              const x = row ? lead + i * queue.gap : rawX;
              const y = row ? roadY : rawY;
              drawBody(item.body, x, y, true);
            }
          }
        } else if (view.kind === "field") {
          const dune = heightSilhouette(view.grid);
          if (dune) {
            const ridge = softenRidge(dune.heights);
            const span = ridgeWindow(ridge);
            const body = ridge.slice(span.start, span.end + 1);
            const count = body.length;
            const peak = Math.max(...body, 0.001);
            // The title gradient covers the lower half of the card, so the whole dune has to sit above it.
            const base = sky.y + sky.h;
            const rise = sky.h * 0.72;
            const pointAt = (index: number) => {
              const x = count === 1 ? w / 2 : (index / (count - 1)) * w;
              const y = base - (Math.max(0, body[index] ?? 0) / peak) * rise;
              return [x, y] as const;
            };
            ctx.beginPath();
            body.forEach((_, index) => {
              const [x, y] = pointAt(index);
              if (index === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.lineTo(w, base);
            ctx.lineTo(0, base);
            ctx.closePath();
            const sand = ctx.createLinearGradient(0, base - rise, 0, base);
            sand.addColorStop(0, "rgba(224, 177, 90, 0.96)");
            sand.addColorStop(0.62, "rgba(224, 177, 90, 0.9)");
            sand.addColorStop(1, "rgba(224, 177, 90, 0)");
            ctx.fillStyle = sand;
            ctx.fill();
            ctx.beginPath();
            body.forEach((_, index) => {
              const [x, y] = pointAt(index);
              if (index === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = "#6a4424";
            ctx.lineWidth = Math.max(2, h * 0.012);
            ctx.stroke();
            return;
          }
          // A heat spot is one soft glow, not a grid of hard cells.
          const rows = view.grid.length;
          const cols = view.grid[0]?.length ?? 1;
          const plate = document.createElement("canvas");
          plate.width = cols;
          plate.height = rows;
          const bits = plate.getContext("2d");
          if (!bits) return;
          const pixels = bits.createImageData(cols, rows);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const value = Math.max(0, Math.min(1, view.grid[r]?.[c] ?? 0));
              const index = (r * cols + c) * 4;
              pixels.data[index] = painting ? 242 : Math.round(60 + value * 195);
              pixels.data[index + 1] = painting ? 180 : Math.round(60 + value * 195);
              pixels.data[index + 2] = painting ? 90 : Math.round(60 + value * 195);
              pixels.data[index + 3] = painting ? Math.round(Math.pow(value, 0.7) * 230) : Math.round(30 + value * 225);
            }
          }
          bits.putImageData(pixels, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(plate, sky.x, sky.y, sky.w, sky.h);
        }
      } catch {
        // A thumbnail is decoration; the card still links to the world.
      }
    })();
    return () => {
      alive = false;
    };
  }, [spec]);

  return <canvas ref={ref} className="scene world-thumb" aria-hidden="true" />;
}
