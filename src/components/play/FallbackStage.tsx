"use client";

import { useEffect, useRef } from "react";
import type { StageProps } from "./stage-props";
import type { BodiesView, FieldView, PipelineView, PopulationView } from "@/engine/view";

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

function FieldPlate({ view }: { view: FieldView }) {
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
      const rows = view.grid.length || 1;
      const cols = view.grid[0]?.length ?? 1;
      const cw = width / cols;
      const ch = height / rows;
      for (let y = 0; y < rows; y++) {
        const row = view.grid[y] ?? [];
        for (let x = 0; x < cols; x++) {
          ctx.fillStyle = fieldColor(row[x] ?? 0);
          ctx.fillRect(x * cw, y * ch, cw + 0.5, ch + 0.5);
        }
      }
    };
    draw();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [view]);
  return <canvas ref={ref} className="field-plate" />;
}

function pointOf(point: [number, number] | { x: number; y: number }): [number, number] {
  return Array.isArray(point) ? [point[0], point[1]] : [point.x, point.y];
}

function BodiesPlate({ view }: { view: BodiesView }) {
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
  return (
    <div className={`population-plate ${worldId === "rumour-town" ? "is-town" : "is-forest"}`}>
      {worldId === "rumour-town" ? <span className="town-lamp" /> : <span className="forest-bark" />}
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
      {view?.kind === "field" ? <FieldPlate view={view} /> : null}
      {view?.kind === "bodies" ? <BodiesPlate view={view} /> : null}
      {view?.kind === "population" ? <PopulationPlate view={view} worldId={worldId} /> : null}
      {view?.kind === "pipeline" ? <PipelinePlate view={view} playing={playing} /> : null}
      {!view ? <div className="scene-wait">The world is settling.</div> : null}
      <p className="stage-caption">{playing ? "In motion" : "At rest"}</p>
    </div>
  );
}
