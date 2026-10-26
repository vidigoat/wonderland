import { Container, Graphics } from "pixi.js";
import type { BodiesView } from "@/engine/view";
import {
  CANNON_STEP_DT,
  launchPreview,
  onSurface,
  phaseOffset,
  readNumber,
  readPoint,
  trailGhostPoints,
  type Point2,
  type TrailSample,
} from "./helpers";
import type { Frame, Scene } from "./scene";
import type { WorldPalette } from "./palette";
import { createBackdrop } from "./backdrop";

const MAX_STEP = 2.5 * CANNON_STEP_DT * 1.6;

export function createBodiesScene(): Scene {
  const root = new Container();
  const sky = new Graphics();
  const painting = createBackdrop();
  const planet = new Graphics();
  const trail = new Graphics();
  const ghost = new Graphics();
  const cannon = new Graphics();
  const ball = new Graphics();
  root.addChild(sky, painting.view, planet, trail, ghost, cannon, ball);

  const samples: Point2[] = [];
  let viewRadius = 3.2;
  let planetKey = "";
  let ballReady = false;
  let alive = true;

  const update = (frame: Frame) => {
    if (!alive) return;
    const view = frame.view?.kind === "bodies" ? frame.view : null;
    paintSky(sky, frame);
    painting.show(frame.worldId, frame.width, frame.height);
    const palette = frame.palette;

    if (!ballReady) {
      drawBall(ball, palette);
      drawCannon(cannon, palette);
      ballReady = true;
    }

    if (!view) {
      samples.length = 0;
      const idleGhost = trailGhostPoints(
        [
          [-0.55 * CANNON_STEP_DT, 1.02],
          [0, 1.02],
        ],
        42,
      );
      const camera = cameraFor(frame, viewRadius, 3.1, (next) => {
        viewRadius = next;
      });
      drawPlanet(planet, camera, 1, palette, planetKey, (next) => {
        planetKey = next;
      });
      placeCannon(cannon, camera, 1);
      const muzzle = camera.toScreen(0.15, 1.08);
      ball.position.set(muzzle.x, muzzle.y);
      ball.visible = true;
      drawTrail(trail, [], camera, palette);
      drawGhost(ghost, idleGhost, camera, palette);
      return;
    }

    const worldTrail = view.trail.map((sample) => readPoint(sample));
    remember(samples, view.ball);
    const path = worldTrail.length >= 2 ? worldTrail : samples;
    const radius = view.planet.r || 1;
    const last = path[path.length - 1];
    const buried = last != null && Math.hypot(last.x, last.y) < radius;
    const preview = buried || path.length >= 8 ? (buried ? [] : ghostFrom(path)) : launchPreview(readNumber(frame.params, "speed", 0.5));
    const drawn = path.map((point) => onSurface(point.x, point.y, radius));
    const focus = Math.max(1.72, targetRadius(view, preview));
    const camera = cameraFor(frame, viewRadius, focus, (next) => {
      viewRadius = next;
    });

    drawPlanet(planet, camera, view.planet.r || 1, palette, planetKey, (next) => {
      planetKey = next;
    });
    placeCannon(cannon, camera, view.planet.r || 1);
    drawTrail(trail, drawn, camera, palette);
    drawGhost(ghost, preview, camera, palette);
    const landed = onSurface(view.ball.x, view.ball.y, radius);
    const at = camera.toScreen(landed.x, landed.y);
    ball.position.set(at.x, at.y);
    ball.visible = true;
  };

  return {
    root,
    update,
    destroy() {
      alive = false;
      painting.destroy();
      root.destroy({ children: true });
    },
  };
}

type Camera = {
  scale: number;
  toScreen(x: number, y: number): Point2;
};

function cameraFor(frame: Frame, current: number, focus: number, commit: (next: number) => void): Camera {
  const follow = frame.reducedMotion ? 1 : 0.08;
  const radius = current + (focus - current) * follow;
  commit(radius);
  const scale = (Math.min(frame.width, frame.height) * 0.46) / Math.max(radius, 0.5);
  const cx = frame.width / 2;
  const cy = frame.height / 2 + frame.height * 0.02;
  return {
    scale,
    toScreen(x, y) {
      return { x: cx + x * scale, y: cy - y * scale };
    },
  };
}

function targetRadius(view: BodiesView, ghost: Point2[]): number {
  let maxR = 1.72;
  const consider = (x: number, y: number) => {
    const radius = Math.hypot(x, y);
    if (Number.isFinite(radius)) maxR = Math.max(maxR, radius * 1.18);
  };
  consider(view.ball.x, view.ball.y);
  for (const sample of view.trail) {
    const point = readPoint(sample as TrailSample);
    consider(point.x, point.y);
  }
  for (const point of ghost) consider(point.x, point.y);
  return Math.min(maxR, 10);
}

function remember(samples: Point2[], ball: { x: number; y: number }): void {
  const next = { x: ball.x, y: ball.y };
  const last = samples[samples.length - 1];
  if (!last) {
    samples.push(next);
    return;
  }
  const dist = Math.hypot(next.x - last.x, next.y - last.y);
  if (dist < 1e-5) return;
  if (dist > MAX_STEP) {
    samples.length = 0;
    samples.push(next);
    return;
  }
  samples.push(next);
  if (samples.length > 600) samples.shift();
}

function ghostFrom(path: Point2[]): Point2[] {
  if (path.length < 2) return [];
  const a = path[path.length - 2]!;
  const b = path[path.length - 1]!;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  if (dist < 1e-5 || dist > MAX_STEP) return [];
  return trailGhostPoints(path, 36, CANNON_STEP_DT);
}

function paintSky(g: Graphics, frame: Frame): void {
  g.clear();
  g.rect(0, 0, frame.width, frame.height).fill({ color: frame.palette.ground });
  for (let i = 0; i < 46; i++) {
    const x = phaseOffset(`sx-${i}`) * frame.width;
    const y = phaseOffset(`sy-${i}`) * frame.height;
    const twinkle = frame.reducedMotion ? 0.75 : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frame.time / 520 + i));
    const radius = 0.7 + phaseOffset(`sr-${i}`) * 1.5;
    g.circle(x, y, radius).fill({ color: frame.palette.parchment, alpha: 0.28 * twinkle });
  }
}

function drawPlanet(g: Graphics, camera: Camera, radius: number, palette: WorldPalette, previous: string, commit: (next: string) => void): void {
  const center = camera.toScreen(0, 0);
  const screenR = Math.max(8, radius * camera.scale);
  const key = `${center.x.toFixed(1)}:${center.y.toFixed(1)}:${screenR.toFixed(1)}:${palette.deep}`;
  if (key === previous) return;
  commit(key);
  g.clear();
  g.circle(center.x, center.y, screenR * 1.08).fill({ color: palette.accent, alpha: 0.12 });
  g.circle(center.x, center.y, screenR).fill({ color: palette.deep });
  g.ellipse(center.x, center.y - screenR * 0.28, screenR * 0.72, screenR * 0.28).fill({ color: palette.mist, alpha: 0.45 });
  g.circle(center.x, center.y, screenR).stroke({ width: Math.max(1.5, screenR * 0.035), color: palette.brass, alpha: 0.9 });
  g.ellipse(center.x, center.y, screenR * 0.42, screenR).stroke({ width: 1, color: palette.brass, alpha: 0.35 });
  g.ellipse(center.x, center.y, screenR * 0.78, screenR * 0.34).stroke({ width: 1, color: palette.brass, alpha: 0.28 });
  const peak = camera.toScreen(0, radius);
  g.poly([
    peak.x,
    peak.y - screenR * 0.08,
    peak.x + screenR * 0.1,
    peak.y + screenR * 0.05,
    peak.x - screenR * 0.1,
    peak.y + screenR * 0.05,
  ]).fill({ color: palette.mist });
}

function drawCannon(g: Graphics, palette: WorldPalette): void {
  g.clear();
  g.poly([-22, -4, 18, -7, 30, -3, 30, 3, 18, 7, -22, 4]).fill({ color: palette.brass });
  g.poly([-22, -4, 18, -7, 18, -2, -22, 0]).fill({ color: palette.glow, alpha: 0.35 });
  g.circle(-12, 8, 6.5).fill({ color: palette.accent });
  g.circle(2, 8, 6.5).fill({ color: palette.accent });
  g.circle(-12, 8, 2).fill({ color: palette.ink, alpha: 0.35 });
  g.circle(2, 8, 2).fill({ color: palette.ink, alpha: 0.35 });
}

function placeCannon(cannon: Graphics, camera: Camera, planetR: number): void {
  const muzzle = camera.toScreen(0, planetR);
  const scale = Math.max(0.7, Math.min(1.6, camera.scale / 70));
  cannon.position.set(muzzle.x + 8 * scale, muzzle.y - 4 * scale);
  cannon.scale.set(scale);
}

function drawBall(g: Graphics, palette: WorldPalette): void {
  g.clear();
  g.circle(0, 0, 18).fill({ color: palette.glow, alpha: 0.4 });
  g.circle(0, 0, 8).fill({ color: palette.parchment });
  g.circle(0, 0, 8).stroke({ width: 2, color: palette.brass });
}

function drawTrail(g: Graphics, path: Point2[], camera: Camera, palette: WorldPalette): void {
  g.clear();
  if (path.length < 2) return;
  trace(g, path, camera);
  g.stroke({ width: 16, color: palette.glow, alpha: 0.32, cap: "round", join: "round" });
  trace(g, path, camera);
  g.stroke({ width: 4, color: palette.accent, alpha: 0.95, cap: "round", join: "round" });
}

function drawGhost(g: Graphics, path: Point2[], camera: Camera, palette: WorldPalette): void {
  g.clear();
  if (path.length < 2) return;
  const stroke = { width: 2, color: palette.parchment, alpha: 0.55, cap: "round" as const };
  for (let i = 0; i < path.length - 1; i += 2) {
    const a = camera.toScreen(path[i]!.x, path[i]!.y);
    const b = camera.toScreen(path[i + 1]!.x, path[i + 1]!.y);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke(stroke);
  }
}

function trace(g: Graphics, path: Point2[], camera: Camera): void {
  const first = camera.toScreen(path[0]!.x, path[0]!.y);
  g.moveTo(first.x, first.y);
  for (let i = 1; i < path.length; i++) {
    const point = camera.toScreen(path[i]!.x, path[i]!.y);
    g.lineTo(point.x, point.y);
  }
}
