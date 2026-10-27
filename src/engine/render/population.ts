import { Container, Graphics, Text } from "pixi.js";
import type { PopulationAgent } from "@/engine/view";
import { clamp01, landedApart, phaseOffset, readNumber, smoothstep, spokenIds, townFoot } from "./helpers";
import { pixelRatio, stageFont } from "./fonts";
import { barkColor, isHeroWorld, populationTint } from "./palette";
import type { Scene, Frame } from "./scene";
import { createBackdrop } from "./backdrop";
import { createFigure, isPaintedWorld, type Figure } from "./sprites";

const BLEND_MS = 260;

const IDLE_MOTHS: PopulationAgent[] = [
  { id: "idle-m1", x: 0.22, y: 0.36, tint: 0.12, sprite: "moth" },
  { id: "idle-m2", x: 0.4, y: 0.58, tint: 0.28, sprite: "moth" },
  { id: "idle-m3", x: 0.62, y: 0.32, tint: 0.55, sprite: "moth" },
  { id: "idle-m4", x: 0.78, y: 0.64, tint: 0.18, sprite: "moth" },
  { id: "idle-m5", x: 0.3, y: 0.74, tint: 0.82, sprite: "moth" },
  { id: "idle-m6", x: 0.52, y: 0.46, tint: 0.34, sprite: "moth" },
];

const IDLE_TOWN: PopulationAgent[] = [
  { id: "idle-c1", x: 0.26, y: 0.62, tint: 0.08, sprite: "citizen" },
  { id: "idle-c2", x: 0.42, y: 0.7, tint: 0.16, sprite: "citizen", bubble: "Evening market's open." },
  { id: "idle-c3", x: 0.58, y: 0.58, tint: 0.12, sprite: "citizen" },
  { id: "idle-c4", x: 0.74, y: 0.68, tint: 0.34, sprite: "citizen-queue", bubble: "Just a short queue." },
];

type Node = {
  figure: Figure;
  bubble: Container | null;
  bubbleText: string;
  bubbleBelow: boolean;
  fromX: number;
  fromY: number;
  fromTint: number;
  toX: number;
  toY: number;
  toTint: number;
  drawX: number;
  drawY: number;
  drawTint: number;
  started: number;
};

export function createPopulationScene(): Scene {
  const root = new Container();
  const backdrop = new Graphics();
  const painting = createBackdrop();
  const bank = createFigure();
  const shutters = new Graphics();
  const figures = new Container();
  const bubbles = new Container();
  figures.sortableChildren = true;
  bank.view.visible = false;
  figures.addChild(bank.view, shutters);
  root.addChild(backdrop, painting.view, figures, bubbles);

  const nodes = new Map<string, Node>();
  let backdropKey = "";
  let alive = true;

  const update = (frame: Frame) => {
    if (!alive) return;
    const agents = shownAgents(frame);
    let painted: boolean;
    if (frame.worldId === "peppered-forest") {
      // The bark's colour is the science: the painted birch takes the soot knob as a tint, the drawn bark stays beneath.
      painted = false;
      if (isPaintedWorld(frame.worldId)) {
        painting.show(frame.worldId, frame.width, frame.height);
        painting.tint(barkColor(readNumber(frame.params, "barkDarkness", frame.view ? 0.2 : 0.25)));
      }
    } else {
      painted = painting.show(frame.worldId, frame.width, frame.height);
    }
    paintBackdrop(backdrop, frame, backdropKey, painted, (next) => {
      backdropKey = next;
    });

    const seen = new Set<string>();
    const speakers = spokenIds(agents);
    const unit = Math.min(frame.width, frame.height);
    // Painted worlds can hold a hundred creatures: shrink each so the crowd reads as a crowd, not a wall.
    const crowd = isPaintedWorld(frame.worldId) && !isHeroWorld(frame.worldId) ? Math.min(1, Math.sqrt((frame.width * frame.height) / Math.max(1, agents.length)) / 230) : 1;
    const figureScale = Math.max(0.85, Math.min(1.55, unit / 640)) * crowd;
    placeBank(bank, shutters, frame, figureScale);

    for (const agent of agents.slice(0, 600)) {
      const id = String(agent.id);
      seen.add(id);
      let node = nodes.get(id);
      if (!node) {
        const figure = createFigure();
        figures.addChild(figure.view);
        node = {
          figure,
          bubble: null,
          bubbleText: "",
          bubbleBelow: false,
          fromX: agent.x,
          fromY: agent.y,
          fromTint: agent.tint,
          toX: agent.x,
          toY: agent.y,
          toTint: agent.tint,
          drawX: agent.x,
          drawY: agent.y,
          drawTint: agent.tint,
          started: frame.time,
        };
        nodes.set(id, node);
      }

      const moved = Math.abs(node.toX - agent.x) > 1e-5 || Math.abs(node.toY - agent.y) > 1e-5 || Math.abs(node.toTint - agent.tint) > 1e-4;
      if (landedApart(node.toX, node.toY, agent.x, agent.y)) {
        node.fromX = node.toX = node.drawX = agent.x;
        node.fromY = node.toY = node.drawY = agent.y;
        node.fromTint = node.toTint = node.drawTint = agent.tint;
        node.started = frame.time;
      } else if (moved) {
        node.fromX = node.drawX;
        node.fromY = node.drawY;
        node.fromTint = node.drawTint;
        node.toX = agent.x;
        node.toY = agent.y;
        node.toTint = agent.tint;
        node.started = frame.time;
      }

      const u = frame.reducedMotion ? 1 : smoothstep(Math.min(1, Math.max(0, (frame.time - node.started) / BLEND_MS)));
      node.drawX = node.fromX + (node.toX - node.fromX) * u;
      node.drawY = node.fromY + (node.toY - node.fromY) * u;
      node.drawTint = node.fromTint + (node.toTint - node.fromTint) * u;

      const phase = phaseOffset(id);
      const bob = frame.reducedMotion ? 0 : Math.sin(frame.time / 720 + phase * Math.PI * 2) * 4.5;
      const wobble = frame.reducedMotion ? 0 : Math.sin(frame.time / 980 + phase * 4) * 0.1;
      const footY = frame.worldId === "rumour-town" ? townFoot(node.drawY) : node.drawY;
      const at = place(node.drawX, footY, frame.width, frame.height);
      const sprite = agent.sprite || "figure";
      const hunting = sprite === "bird";
      const drop = hunting ? Math.min(42, frame.height * 0.07) : 0;
      node.figure.view.position.set(at.x, at.y + bob + drop);
      node.figure.view.rotation = wobble;
      node.figure.view.scale.set(hunting ? figureScale * 2.05 : figureScale * (0.86 + phase * 0.28));
      node.figure.view.zIndex = hunting ? frame.height + 20 : at.y;
      const keepsOwnColor = hunting;
      node.figure.show(
        frame.worldId,
        sprite,
        keepsOwnColor ? 0xffffff : populationTint(frame.worldId, node.drawTint, frame.palette, sprite),
        !keepsOwnColor,
      );
      syncBubble(node, speakers.has(id) ? agent.bubble : null, at.x, at.y + bob, frame, bubbles, id);
    }

    for (const [id, node] of nodes) {
      if (seen.has(id)) continue;
      node.figure.destroy();
      node.bubble?.destroy({ children: true });
      nodes.delete(id);
    }
  };

  return {
    root,
    update,
    destroy() {
      alive = false;
      for (const node of nodes.values()) node.figure.cancel();
      bank.cancel();
      painting.destroy();
      nodes.clear();
      root.destroy({ children: true });
    },
  };
}

const BANK_SCALE = 1.9;
const BANK_FIGURE = 86;

function placeBank(bank: Figure, shutters: Graphics, frame: Frame, figureScale: number): void {
  if (frame.worldId !== "rumour-town") {
    bank.view.visible = false;
    shutters.clear();
    return;
  }
  const scale = figureScale * BANK_SCALE;
  const half = (BANK_FIGURE * scale) / 2;
  const x = frame.width * 0.5;
  const y = Math.max(half * 0.72, frame.height * 0.58 - half);
  const feet = y + half;
  bank.view.visible = true;
  bank.view.scale.set(scale);
  bank.view.position.set(x, y);
  bank.view.zIndex = feet;
  shutters.zIndex = feet + 1;
  bank.show(frame.worldId, "bank", 0xffffff, false);
  const shut = frame.view?.kind === "population" && frame.view.doors === "shut";
  paintDoors(shutters, x, y + 22 * scale, 15 * scale, scale, shut);
}

function paintDoors(g: Graphics, x: number, y: number, width: number, scale: number, shut: boolean): void {
  g.clear();
  if (shut) {
    g.roundRect(x - width * 1.15, y - width * 0.55, width * 2.3, width * 1.35, 2).fill({ color: 0x2a211c, alpha: 0.55 });
    g.roundRect(x - width * 1.35, y - width * 0.15, width * 2.7, Math.max(3, 5 * scale), 1).fill({ color: 0x3a2c28 });
    g.roundRect(x - width * 1.2, y + width * 0.45, width * 2.4, Math.max(3, 4 * scale), 1).fill({ color: 0x5c4638 });
    return;
  }
  g.ellipse(x, y + width * 0.15, width * 0.55, width * 0.85).fill({ color: 0xf6d48a, alpha: 0.42 });
}

function shownAgents(frame: Frame): PopulationAgent[] {
  const view = frame.view;
  if (view && view.kind === "population") return view.agents;
  if (frame.worldId === "rumour-town") return IDLE_TOWN;
  return IDLE_MOTHS;
}

function place(x: number, y: number, width: number, height: number): { x: number; y: number } {
  const padX = Math.max(36, width * 0.07);
  const padY = Math.max(36, height * 0.1);
  return {
    x: padX + clamp01(x) * Math.max(1, width - padX * 2),
    y: padY + clamp01(y) * Math.max(1, height - padY * 2),
  };
}

function paintBackdrop(g: Graphics, frame: Frame, previous: string, painted: boolean, commit: (next: string) => void): void {
  const bark = frame.worldId === "peppered-forest" ? readNumber(frame.params, "barkDarkness", frame.view ? 0.2 : 0.25) : -1;
  const key = `${frame.width}x${frame.height}|${frame.worldId}|${bark.toFixed(3)}|${painted ? "art" : "draw"}|${frame.palette.ground}`;
  if (key === previous) return;
  commit(key);
  g.clear();
  const { width, height, palette, worldId } = frame;

  if (worldId === "peppered-forest") {
    const paper = barkColor(bark);
    g.rect(0, 0, width, height).fill({ color: paper });
    for (let i = 0; i < 7; i++) {
      const x = width * (0.08 + phaseOffset(`bark-${i}`) * 0.84);
      g.moveTo(x, 0).lineTo(x + 8, height).stroke({
        width: 10 + (i % 3) * 6,
        color: lerpShade(paper, i % 2 === 0 ? 1 : -1),
        alpha: 0.18,
        cap: "round",
      });
    }
    for (let i = 0; i < 5; i++) {
      const x = width * (0.15 + phaseOffset(`knot-${i}`) * 0.7);
      const y = height * (0.2 + phaseOffset(`knot-y-${i}`) * 0.6);
      g.ellipse(x, y, 7, 4).stroke({ width: 2, color: 0x2a2622, alpha: 0.2 });
    }
    return;
  }

  if (painted) return;

  g.rect(0, 0, width, height).fill({ color: palette.ground });
  if (worldId === "rumour-town") {
    g.ellipse(width * 0.5, height * 0.92, width * 0.46, height * 0.12).fill({ color: palette.mist, alpha: 0.45 });
    drawBankScenery(g, width * 0.5, height * 0.28, Math.min(width, height));
    g.circle(width * 0.18, height * 0.22, 18).fill({ color: palette.glow, alpha: 0.85 });
    g.circle(width * 0.18, height * 0.22, 46).fill({ color: palette.accent, alpha: 0.18 });
    return;
  }

  g.ellipse(width * 0.5, height * 0.5, width * 0.42, height * 0.36).fill({ color: palette.mist, alpha: 0.35 });
}

function lerpShade(color: number, direction: number): number {
  const channel = (shift: number) => {
    const value = (color >> shift) & 255;
    return Math.max(0, Math.min(255, value + direction * 28));
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function drawBankScenery(g: Graphics, x: number, y: number, unit: number): void {
  const s = Math.max(0.8, unit / 640);
  g.poly([x - 46 * s, y, x, y - 36 * s, x + 46 * s, y]).fill({ color: 0x6e5a4e });
  g.roundRect(x - 36 * s, y, 72 * s, 48 * s, 3).fill({ color: 0xcbb59a });
  g.roundRect(x - 8 * s, y + 18 * s, 16 * s, 30 * s, 2).fill({ color: 0x3a2a32 });
  g.rect(x - 28 * s, y + 10 * s, 6 * s, 34 * s).fill({ color: 0xefe4d4 });
  g.rect(x + 22 * s, y + 10 * s, 6 * s, 34 * s).fill({ color: 0xefe4d4 });
}

function syncBubble(node: Node, bubble: string | null | undefined, x: number, y: number, frame: Frame, layer: Container, id: string): void {
  // A bubble must hold words; symbol-only markers (e.g. "✦" for a flash) are not speech.
  const text = bubble?.trim() && /\p{L}/u.test(bubble) ? bubble.trim().slice(0, 90) : "";
  if (!text) {
    node.bubble?.destroy({ children: true });
    node.bubble = null;
    node.bubbleText = "";
    return;
  }
  const below = y < 78;
  if (!node.bubble || node.bubbleText !== text || node.bubbleBelow !== below) {
    node.bubble?.destroy({ children: true });
    node.bubble = makeBubble(text, below, frame.palette.ink, frame.palette.parchment, frame.palette.accent);
    node.bubbleText = text;
    node.bubbleBelow = below;
    layer.addChild(node.bubble);
  }
  const lift = (phaseOffset(id) - 0.5) * 28;
  node.bubble.position.set(x, (below ? y + 30 : y - 34) + lift);
}

function makeBubble(text: string, below: boolean, ink: number, parchment: number, accent: number): Container {
  const root = new Container();
  const label = new Text({
    text,
    resolution: pixelRatio(),
    style: {
      fontFamily: stageFont("story"),
      fontSize: 14,
      fill: ink,
      align: "center",
      wordWrap: true,
      wordWrapWidth: 156,
    },
  });
  const padX = 10;
  const padY = 7;
  const w = label.width + padX * 2;
  const h = label.height + padY * 2;
  const plate = new Graphics();
  if (below) {
    plate.poly([-7, 0, 7, 0, 0, -8]).fill({ color: parchment, alpha: 0.96 });
    plate.roundRect(-w / 2, 0, w, h, 12).fill({ color: parchment, alpha: 0.96 });
    plate.roundRect(-w / 2, 0, w, h, 12).stroke({ width: 1.5, color: accent, alpha: 0.8 });
    label.position.set(-label.width / 2, padY);
  } else {
    plate.roundRect(-w / 2, -h, w, h, 12).fill({ color: parchment, alpha: 0.96 });
    plate.roundRect(-w / 2, -h, w, h, 12).stroke({ width: 1.5, color: accent, alpha: 0.8 });
    plate.poly([-7, 0, 7, 0, 0, 8]).fill({ color: parchment, alpha: 0.96 });
    label.position.set(-label.width / 2, -h + padY);
  }
  root.addChild(plate, label);
  return root;
}
