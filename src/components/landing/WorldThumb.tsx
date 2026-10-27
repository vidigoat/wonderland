"use client";

import { useEffect, useRef } from "react";
import { compileRules, type RulesModule } from "@/engine/rules";
import { WorldSession } from "@/engine/runtime";
import type { PublicWorldSpec } from "@/engine/spec";
import { asWorldView, isParticlesView } from "@/engine/view";

/**
 * A still of a generated world, made by actually running it: its own verified rules, its own default knobs,
 * a few dozen steps in. Drawn in white on black, so the card shows what that world really looks like.
 */
const STEPS = 40;

function lightness(t: number): string {
  const v = Math.round(60 + Math.max(0, Math.min(1, t)) * 195);
  return `rgb(${v}, ${v}, ${v})`;
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
        await session.tick(STEPS);
        if (!alive) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = (canvas.width = canvas.clientWidth * dpr);
        const h = (canvas.height = canvas.clientHeight * dpr);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, w, h);
        const view = asWorldView(session.view(), spec.archetype);
        if (!view) return;
        const pad = 0.12;
        const at = (x: number, y: number) => [w * (pad + x * (1 - 2 * pad)), h * (pad * 0.6 + y * (1 - 2 * pad))] as const;
        if (view.kind === "population") {
          for (const agent of view.agents.slice(0, 400)) {
            const [x, y] = at(agent.x, agent.y);
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
          for (const body of view.bodies.slice(0, 400)) {
            const [x, y] = at((body.x - bx) / bw, (body.y - by) / bh);
            ctx.fillStyle = typeof body.color === "string" ? body.color : "#fafafa";
            ctx.beginPath();
            ctx.arc(x, y, 3.2 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (view.kind === "field") {
          // Crop to where something is happening, so a small dune or a hot spot fills the card.
          let top = Infinity, bottom = -1, left = Infinity, right = -1;
          view.grid.forEach((row, r) =>
            row.forEach((value, c) => {
              if (value > 0.05) {
                top = Math.min(top, r);
                bottom = Math.max(bottom, r);
                left = Math.min(left, c);
                right = Math.max(right, c);
              }
            }),
          );
          if (bottom < 0) return;
          const margin = 2;
          top = Math.max(0, top - margin);
          left = Math.max(0, left - margin);
          bottom = Math.min(view.grid.length - 1, bottom + margin);
          right = Math.min((view.grid[0]?.length ?? 1) - 1, right + margin);
          const rows = bottom - top + 1;
          const cols = right - left + 1;
          const size = Math.min((w * (1 - 2 * pad)) / cols, (h * 0.62) / rows);
          const ox = (w - cols * size) / 2;
          const oy = h * 0.08 + (h * 0.62 - rows * size) / 2;
          for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
              const value = view.grid[r]?.[c] ?? 0;
              ctx.fillStyle = lightness(value);
              ctx.globalAlpha = 0.12 + Math.max(0, Math.min(1, value)) * 0.88;
              ctx.fillRect(ox + (c - left) * size, oy + (r - top) * size, Math.ceil(size), Math.ceil(size));
            }
          }
          ctx.globalAlpha = 1;
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
