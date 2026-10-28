"use client";

import { useEffect, useRef } from "react";
import type { StageProps } from "./stage-props";
import { fieldScale, heightSilhouette, ridgeWindow, softenRidge } from "@/engine/render/helpers";
import { isParticlesView, type BodiesView, type CannonView, type FieldView, type ParticlesView, type PipelineView, type PopulationView } from "@/engine/view";

function mix(from: string, to: string, t: number): string {
  const parse = (hex: string) => {
    const n = hex.replace("#", "");
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  };
  const a = parse(from);
  const b = parse(to);
  const u = Math.min(1, Math.max(0, t));
  const channel = (i: number) => Math.round((a[i] ?? 0) + ((b[i] ?? 0) - (a[i] ?? 0)) * u);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

function fieldColor(value: number): string {
  if (value >= 0.97) return "#e07a3d";
  if (Math.abs(value - 0.35) < 0.03) return "#5f7d52";
  if (Math.abs(value - 0.12) < 0.03) return "#9a8f80";
  if (value <= 0.01) return "#101426";
  return mix("#14110e", "#d4b36a", value);
}

function FieldPlate({ view, worldId }: { view: FieldView; worldId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const width = parent.clientWidth || 640;
      const height = parent.clientHeight || 480;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dune = heightSilhouette(view.grid);
      if (dune) {
        ctx.fillStyle = "#cbb892";
        ctx.fillRect(0, 0, width, height);
        const ridge = softenRidge(dune.heights);
        const span = ridgeWindow(ridge);
        const body = ridge.slice(span.start, span.end + 1);
        const count = body.length;
        const peak = Math.max(...body, 0.001);
        const base = height * 0.78;
        const rise = height * 0.46;
        const at = (index: number) => {
          const x = count === 1 ? width / 2 : (index / (count - 1)) * width;
          const y = base - (Math.max(0, body[index] ?? 0) / peak) * rise;
          return [x, y] as const;
        };
        ctx.beginPath();
        body.forEach((_, index) => {
          const [x, y] = at(index);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(width, base);
        ctx.lineTo(0, base);
        ctx.closePath();
        const sand = ctx.createLinearGradient(0, base - rise, 0, base);
        sand.addColorStop(0, "rgba(224, 177, 90, 0.98)");
        sand.addColorStop(0.7, "rgba(224, 177, 90, 0.9)");
        sand.addColorStop(1, "rgba(224, 177, 90, 0)");
        ctx.fillStyle = sand;
        ctx.fill();
        ctx.beginPath();
        body.forEach((_, index) => {
          const [x, y] = at(index);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = "#6a4424";
        ctx.lineWidth = Math.max(2, height * 0.012);
        ctx.stroke();
        return;
      }
      const rows = view.grid.length || 1;
      const cols = view.grid[0]?.length ?? 1;
      if (fieldScale(worldId, view.grid.flat()) === "firebreak") {
        const cw = width / cols;
        const ch = height / rows;
        for (let y = 0; y < rows; y++) {
          const row = view.grid[y] ?? [];
          for (let x = 0; x < cols; x++) {
            ctx.fillStyle = fieldColor(row[x] ?? 0);
            ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5);
          }
        }
        return;
      }
      const plate = document.createElement("canvas");
      plate.width = cols;
      plate.height = rows;
      const bits = plate.getContext("2d");
      if (!bits) return;
      const pixels = bits.createImageData(cols, rows);
      for (let y = 0; y < rows; y++) {
        const row = view.grid[y] ?? [];
        for (let x = 0; x < cols; x++) {
          const value = Math.max(0, Math.min(1, row[x] ?? 0));
          const index = (y * cols + x) * 4;
          const ink = fieldColor(value);
          const parts = ink.startsWith("#")
            ? [parseInt(ink.slice(1, 3), 16), parseInt(ink.slice(3, 5), 16), parseInt(ink.slice(5, 7), 16)]
            : ink.replace(/[^\d ]/g, " ").trim().split(/\s+/).map(Number);
          pixels.data[index] = parts[0] ?? 0;
          pixels.data[index + 1] = parts[1] ?? 0;
          pixels.data[index + 2] = parts[2] ?? 0;
          pixels.data[index + 3] = 255;
        }
      }
      bits.putImageData(pixels, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(plate, 0, 0, width, height);
    };
    draw();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [view, worldId]);
  return <canvas ref={ref} className="field-plate" />;
}

function pointOf(point: [number, number] | { x: number; y: number }): [number, number] {
  return Array.isArray(point) ? [point[0], point[1]] : [point.x, point.y];
}

function BodiesPlate({ view }: { view: BodiesView }) {
  if (isParticlesView(view)) return <ParticlesPlate view={view} />;
  return <CannonPlate view={view} />;
}

function ParticlesPlate({ view }: { view: ParticlesView }) {
  const { x, y, w, h } = view.bounds;
  return (
    <div className="bodies-plate">
      <svg viewBox={`${x} ${y} ${w} ${h}`} className="bodies-svg" role="presentation">
        {view.bodies.slice(0, 600).map((body, index) => (
          <circle key={String(body.id ?? index)} cx={body.x} cy={body.y} r={Math.max(w, h) * 0.012 * (body.radius ?? 1)} fill={typeof body.color === "string" ? body.color : "currentColor"} />
        ))}
      </svg>
    </div>
  );
}

function CannonPlate({ view }: { view: CannonView }) {
  const trail = view.trail.length > 180 ? view.trail.filter((_, index) => index % Math.ceil(view.trail.length / 180) === 0) : view.trail;
  const points = trail.map(pointOf);
  const last = points[points.length - 1];
  const drawn = last && (last[0] !== view.ball.x || last[1] !== view.ball.y) ? points : points.slice(0, -1);
  const poly = drawn.map(([x, y]) => `${x.toFixed(3)},${(-y).toFixed(3)}`).join(" ");
  const left = ((view.ball.x + 3.2) / 6.4) * 100;
  const top = ((-view.ball.y + 3.2) / 6.4) * 100;
  return (
    <div className="bodies-plate">
      <svg viewBox="-3.2 -3.2 6.4 6.4" className="bodies-svg" role="presentation">
        <circle className="engraved" cx="0" cy="0" r="2.4" />
        <circle className="engraved" cx="0" cy="0" r="1.7" />
        <circle className="planet-body" cx="0" cy="0" r={view.planet.r} />
        <rect className="cannon-body" x="-0.08" y="-1.55" width="0.55" height="0.12" rx="0.04" />
        {poly ? <polyline className="trail" points={poly} /> : null}
      </svg>
      <i className="shot" style={{ left: `${left}%`, top: `${top}%` }} />
    </div>
  );
}

function PopulationPlate({ view, worldId }: { view: PopulationView; worldId: string }) {
  const bubbles = view.agents.filter((agent) => agent.bubble).slice(0, 3);
  const shut = worldId === "rumour-town" && view.doors === "shut";
  return (
    <div className={`population-plate ${worldId === "rumour-town" ? "is-town" : "is-forest"}`}>
      {worldId === "rumour-town" ? (
        <>
          <span className={shut ? "town-bank is-shut" : "town-bank"} />
          <span className="town-lamp" />
        </>
      ) : (
        <span className="forest-bark" />
      )}
      {view.agents.map((agent) => {
        const worry = worldId === "rumour-town";
        const color = worry ? mix("#f2d7c4", "#c2410c", agent.tint) : mix("#f4efe4", "#1a1814", agent.tint);
        return (
          <i
            key={agent.id}
            className={worry ? "citizen" : "live-moth"}
            style={{ left: `${agent.x * 100}%`, top: `${agent.y * 100}%`, color }}
          />
        );
      })}
      {bubbles.map((agent) => (
        <span key={`b-${agent.id}`} className="bubble" style={{ left: `${agent.x * 100}%`, top: `${agent.y * 100}%` }}>
          {agent.bubble}
        </span>
      ))}
    </div>
  );
}

function PipelinePlate({ view, playing }: { view: PipelineView; playing: boolean }) {
  const open = view.rows.length > 0;
  const choked = Boolean(view.error);
  return (
    <div className={`pipeline-plate ${playing ? "is-playing" : "is-still"} ${open ? "is-open" : ""} ${choked ? "is-choked" : ""}`}>
      <ol className="stations">
        {view.stages.map((stage) => (
          <li key={stage}>{stage}</li>
        ))}
      </ol>
      <i className="token" />
      {view.query ? <p className="spell">{view.query}</p> : <p className="spell quiet">The scribe’s desk is clear.</p>}
    </div>
  );
}

export function FallbackStage({ view, archetype, worldId, playing }: StageProps) {
  return (
    <div className={`stage-fallback ${playing ? "is-playing" : "is-still"} archetype-${archetype}`} data-world={worldId}>
      {view?.kind === "field" ? <FieldPlate view={view} worldId={worldId} /> : null}
      {view?.kind === "bodies" ? <BodiesPlate view={view} /> : null}
      {view?.kind === "population" ? <PopulationPlate view={view} worldId={worldId} /> : null}
      {view?.kind === "pipeline" ? <PipelinePlate view={view} playing={playing} /> : null}
      {!view && worldId === "rumour-town" ? (
        <div className="population-plate is-town">
          <span className="town-bank" />
          <span className="town-lamp" />
        </div>
      ) : null}
      {!view ? <div className="scene-wait">The world is settling.</div> : null}
      <p className="stage-caption">{playing ? "In motion" : "At rest"}</p>
    </div>
  );
}
