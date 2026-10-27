"use client";

import { useEffect, useRef } from "react";
import { compileRules, type RulesModule } from "@/engine/rules";
import { WorldSession } from "@/engine/runtime";
import type { PublicWorldSpec } from "@/engine/spec";
import { bodyFacing, cssHex, figureTint, flockFacing, heightSilhouette, softenRidge, thumbBodyPx, thumbJamHalo, thumbJamInk, thumbSteps } from "@/engine/render/helpers";
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
        await session.tick(thumbSteps(spec.id));
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
        const pad = 0.12;
        const at = (x: number, y: number) => [w * (pad + x * (1 - 2 * pad)), h * (pad * 0.6 + y * (1 - 2 * pad))] as const;
        if (view.kind === "population") {
          const agents = view.agents.slice(0, 400);
          const size = Math.min(w, h) * Math.min(0.2, 0.85 / Math.sqrt(Math.max(1, agents.length)));
          for (const agent of agents) {
            const [x, y] = at(agent.x, agent.y);
            const image = sprites.size > 0 ? spriteOf(String(agent.sprite ?? "")) : undefined;
            if (image) {
              const heading = agent.heading;
              const headed = typeof heading === "number" && Number.isFinite(heading);
              const turn = headed ? flockFacing(heading) : 0;
              const alpha = headed ? 0.92 : 0.55 + Math.max(0, Math.min(1, agent.tint)) * 0.45;
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
          for (const body of bodies.slice(0, 400)) {
            const [x, y] = at((body.x - bx) / bw, (body.y - by) / bh);
            const speed = (body as { vx?: number }).vx;
            const tint = figureTint(spec.id, speed);
            const size = thumbBodyPx(spec.id, speed) * dpr;
            const halo = thumbJamHalo(spec.id, speed) * dpr;
            if (halo > 0) {
              ctx.fillStyle = cssHex(tint);
              ctx.beginPath();
              ctx.arc(x, y, halo, 0, Math.PI * 2);
              ctx.fill();
            }
            const image = sprites.size > 0 ? spriteOf(String(body.id ?? "").replace(/[-_]?\d+$/, "")) : undefined;
            if (image) {
              const face = bodyFacing(speed, image.height > image.width * 1.25);
              const ink = thumbJamInk(spec.id, speed);
              if (ink) drawStuck(image, x, y, size, ink, face.turn, face.flip);
              else drawSprite(image, x, y, size, 1, face.turn, face.flip);
              continue;
            }
            ctx.fillStyle = typeof body.color === "string" ? body.color : "#fafafa";
            ctx.beginPath();
            ctx.arc(x, y, 3.2 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (view.kind === "field") {
          const dune = heightSilhouette(view.grid);
          if (dune) {
            const ridge = softenRidge(dune.heights);
            const count = ridge.length;
            const peak = Math.max(...ridge, 0.001);
            const base = h * 0.86;
            const rise = h * 0.62;
            ctx.beginPath();
            ridge.forEach((value, index) => {
              const x = count === 1 ? w / 2 : (index / (count - 1)) * w;
              const y = base - (Math.max(0, value) / peak) * rise;
              if (index === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.lineTo(w, base);
            ctx.lineTo(0, base);
            ctx.closePath();
            ctx.fillStyle = "#e0b15a";
            ctx.globalAlpha = painting ? 0.9 : 0.95;
            ctx.fill();
            ctx.globalAlpha = 1;
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
          ctx.drawImage(plate, w * pad, h * 0.08, w * (1 - 2 * pad), h * 0.72);
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
