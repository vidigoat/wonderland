import { Container, Graphics, Text } from "pixi.js";
import { clamp01, injectionHighlightRange, lerp, readBoolean, smoothstep } from "./helpers";
import { pixelRatio, stageFont } from "./fonts";
import type { WorldPalette } from "./palette";
import type { Frame, Scene } from "./scene";
import { createFigure, destroyChildren, type Figure } from "./sprites";

const DEFAULT_STAGES = ["scroll", "scribe", "ledger", "vault"];

export function createPipelineScene(): Scene {
  const root = new Container();
  const backdrop = new Graphics();
  const route = new Graphics();
  const stations = new Container();
  const traveler = new Container();
  const spell = new Container();
  root.addChild(backdrop, route, stations, traveler, spell);

  const travelerFigure = createFigure();
  traveler.addChild(travelerFigure.view);
  const seal = new Graphics();
  traveler.addChild(seal);

  let layoutKey = "";
  let points: { x: number; y: number }[] = [];
  let stationFigures: Figure[] = [];
  let alive = true;

  const update = (frame: Frame) => {
    if (!alive) return;
    const view = frame.view?.kind === "pipeline" ? frame.view : null;
    const stages = view?.stages?.length ? view.stages : DEFAULT_STAGES;
    const query = view?.query ?? "";
    const error = view?.error ?? null;
    const rows = view?.rows ?? [];
    const sealed = query.includes("-- sealed") || readBoolean(frame.params, "sealed");
    const key = [
      frame.width,
      frame.height,
      frame.worldId,
      frame.palette.ground,
      stages.join("|"),
      query,
      error ?? "",
      rows.map(summarize).join("~"),
      sealed ? "sealed" : "open",
    ].join("§");

    if (key !== layoutKey) {
      layoutKey = key;
      points = stationPoints(stages.length, frame.width, frame.height);
      paintArchive(backdrop, frame);
      paintRoute(route, points, frame.palette);
      for (const figure of stationFigures) figure.cancel();
      stationFigures = layStations(stations, stages, points, frame, rows.length > 0, Boolean(error));
      laySpell(spell, frame, query, error, rows, sealed);
      drawSeal(seal, sealed, frame.palette);
    }

    travelerFigure.show(frame.worldId, "scroll", frame.palette.parchment);
    const travel = travelAmount(frame);
    const at = along(points, travel);
    const bob = frame.playing || frame.reducedMotion ? 0 : Math.sin(frame.time / 700) * 5;
    traveler.position.set(at.x, at.y + bob);
    traveler.rotation = frame.reducedMotion ? 0 : at.angle * 0.18;
    const unit = Math.min(frame.width, frame.height);
    traveler.scale.set(Math.max(0.85, Math.min(1.45, unit / 560)));
  };

  return {
    root,
    update,
    destroy() {
      alive = false;
      travelerFigure.cancel();
      for (const figure of stationFigures) figure.cancel();
      root.destroy({ children: true });
    },
  };
}

function travelAmount(frame: Frame): number {
  if (!frame.playing) return 0;
  if (frame.reducedMotion) return 0.33;
  const cycle = 6800;
  const u = (frame.time % cycle) / cycle;
  if (u < 0.82) return smoothstep(u / 0.82);
  return 1;
}

function stationPoints(count: number, width: number, height: number): { x: number; y: number }[] {
  const y = height * 0.34;
  const inset = Math.max(56, width * 0.12);
  return Array.from({ length: Math.max(count, 1) }, (_, index) => ({
    x: count <= 1 ? width / 2 : inset + ((width - inset * 2) * index) / (count - 1),
    y,
  }));
}

function along(points: { x: number; y: number }[], t: number): { x: number; y: number; angle: number } {
  if (points.length === 0) return { x: 0, y: 0, angle: 0 };
  if (points.length === 1) return { x: points[0]!.x, y: points[0]!.y, angle: 0 };
  const scaled = clamp01(t) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const u = scaled - index;
  const a = points[index]!;
  const b = points[index + 1]!;
  return {
    x: lerp(a.x, b.x, u),
    y: lerp(a.y, b.y, u) - Math.sin(u * Math.PI) * 22,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

function paintArchive(g: Graphics, frame: Frame): void {
  g.clear();
  const { width, height, palette } = frame;
  g.rect(0, 0, width, height).fill({ color: palette.ground });
  for (let i = 0; i < 8; i++) {
    const x = width * (0.08 + i * 0.11);
    g.roundRect(x, height * 0.08, 10, height * 0.22, 2).fill({ color: palette.mist, alpha: 0.55 });
    for (let shelf = 0; shelf < 3; shelf++) {
      g.rect(x - 4, height * 0.12 + shelf * height * 0.06, 18, 2).fill({ color: palette.brass, alpha: 0.35 });
    }
  }
  g.ellipse(width * 0.5, height * 0.95, width * 0.55, height * 0.12).fill({ color: 0x000000, alpha: 0.18 });
  g.circle(width * 0.12, height * 0.2, 7).fill({ color: palette.glow });
  g.circle(width * 0.12, height * 0.2, 28).fill({ color: palette.accent, alpha: 0.16 });
}

function paintRoute(g: Graphics, points: { x: number; y: number }[], palette: WorldPalette): void {
  g.clear();
  if (points.length < 2) return;
  g.moveTo(points[0]!.x, points[0]!.y + 36);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i]!.x, points[i]!.y + 36);
  g.stroke({ width: 2, color: palette.accent, alpha: 0.35, cap: "round" });
  for (let i = 0; i < points.length - 1; i++) {
    for (let step = 1; step < 5; step++) {
      const u = step / 5;
      const x = lerp(points[i]!.x, points[i + 1]!.x, u);
      const y = lerp(points[i]!.y, points[i + 1]!.y, u) + 36;
      g.circle(x, y, 2.2).fill({ color: palette.accent, alpha: 0.7 });
    }
  }
}

function layStations(
  layer: Container,
  stages: string[],
  points: { x: number; y: number }[],
  frame: Frame,
  open: boolean,
  error: boolean,
): Figure[] {
  destroyChildren(layer);
  const figures: Figure[] = [];
  const unit = Math.min(frame.width, frame.height);
  const scale = Math.max(0.9, Math.min(1.5, unit / 560));
  stages.forEach((stage, index) => {
    const at = points[index];
    if (!at) return;
    const figure = createFigure();
    const tint = stationTint(stage, frame.palette);
    figure.show(frame.worldId, stage, tint);
    figure.view.position.set(at.x, at.y);
    figure.view.scale.set(scale);
    layer.addChild(figure.view);
    figures.push(figure);

    if (open && /vault|door/i.test(stage)) {
      const glow = new Graphics();
      glow.ellipse(at.x, at.y, 34 * scale, 40 * scale).fill({ color: frame.palette.glow, alpha: 0.35 });
      layer.addChildAt(glow, 0);
    }
    if (error && /scribe/i.test(stage)) {
      const blot = new Graphics();
      blot.circle(at.x + 16 * scale, at.y - 18 * scale, 5).fill({ color: frame.palette.deep, alpha: 0.9 });
      layer.addChild(blot);
    }

    const caption = new Text({
      text: stage.replace(/[-_]/g, " "),
      resolution: pixelRatio(),
      style: {
        fontFamily: stageFont("story"),
        fontSize: 15,
        fill: readableOn(frame.palette),
        align: "center",
      },
    });
    caption.anchor = 0.5;
    caption.position.set(at.x, at.y + 46 * scale);
    layer.addChild(caption);
  });
  return figures;
}

function readableOn(palette: WorldPalette): number {
  const ground = palette.ground;
  const lum = ((ground >> 16) & 255) * 0.2126 + ((ground >> 8) & 255) * 0.7152 + (ground & 255) * 0.0722;
  return lum > 150 ? palette.ink : palette.parchment;
}

function stationTint(stage: string, palette: WorldPalette): number {
  if (/scroll/i.test(stage)) return palette.parchment;
  if (/scribe/i.test(stage)) return palette.deep;
  if (/ledger|book/i.test(stage)) return palette.brass;
  if (/vault|door/i.test(stage)) return palette.ink;
  return palette.parchment;
}

function laySpell(layer: Container, frame: Frame, query: string, error: string | null, rows: unknown[], sealed: boolean): void {
  destroyChildren(layer);
  const margin = Math.max(20, frame.width * 0.06);
  const cardW = frame.width - margin * 2;
  const cardH = Math.min(210, Math.max(120, frame.height * 0.34));
  const cardX = margin;
  const cardY = frame.height - cardH - Math.max(12, frame.height * 0.04);
  const plate = new Graphics();
  plate.roundRect(cardX, cardY, cardW, cardH, 16).fill({ color: frame.palette.parchment });
  plate.roundRect(cardX, cardY, cardW, cardH, 16).stroke({ width: 2, color: frame.palette.accent, alpha: 0.9 });
  layer.addChild(plate);

  if (!query) {
    const waiting = new Text({
      text: "The scribe's desk is clear.",
      resolution: pixelRatio(),
      style: { fontFamily: stageFont("story"), fontSize: 18, fill: frame.palette.ink },
    });
    waiting.position.set(cardX + 22, cardY + cardH / 2 - 12);
    layer.addChild(waiting);
    return;
  }

  const fontSize = cardW < 520 ? 13 : 15;
  const family = stageFont("mono");
  const maxWidth = cardW - 36;
  const measure = measurer(`500 ${fontSize}px ${family}`);
  const range = sealed ? null : injectionHighlightRange(query);
  const lines = wrapLines(query, maxWidth, measure).slice(0, 5);
  const lineHeight = fontSize * 1.45;
  let y = cardY + 16;
  for (const line of lines) {
    y = drawLine(layer, line, y, cardX + 18, lineHeight, fontSize, family, range, frame.palette);
  }

  if (error) {
    const note = new Text({
      text: error.replace(/\s+/g, " ").slice(0, 110),
      resolution: pixelRatio(),
      style: {
        fontFamily: family,
        fontSize: 12,
        fill: frame.palette.deep,
        wordWrap: true,
        wordWrapWidth: maxWidth,
      },
    });
    note.position.set(cardX + 18, cardY + cardH - 28 - Math.min(32, note.height));
    layer.addChild(note);
  } else if (rows.length > 0) {
    const linesOut = rows.map(summarize).filter(Boolean).slice(0, 3);
    const ledger = new Text({
      text: linesOut.length ? linesOut.join("\n") : `${rows.length} entries revealed`,
      resolution: pixelRatio(),
      style: { fontFamily: stageFont("story"), fontSize: 14, fill: frame.palette.deep },
    });
    ledger.position.set(cardX + 18, cardY + cardH - 18 - ledger.height);
    layer.addChild(ledger);
  }
}

function drawLine(
  layer: Container,
  line: { text: string; start: number },
  y: number,
  x: number,
  lineHeight: number,
  fontSize: number,
  family: string,
  range: { start: number; end: number } | null,
  palette: WorldPalette,
): number {
  const lineEnd = line.start + line.text.length;
  const from = range ? Math.max(range.start, line.start) : line.start;
  const to = range ? Math.min(range.end, lineEnd) : line.start;
  const has = range != null && from < to;
  const before = line.text.slice(0, has ? from - line.start : line.text.length);
  const mid = has ? line.text.slice(from - line.start, to - line.start) : "";
  const after = has ? line.text.slice(to - line.start) : "";
  const style = {
    fontFamily: family,
    fontSize,
    fontWeight: "500" as const,
  };
  const resolution = pixelRatio();
  let cursor = x;
  const chunks: Text[] = [];
  const push = (value: string, color: number) => {
    if (!value) return null;
    const node = new Text({ text: value, resolution, style: { ...style, fill: color } });
    node.position.set(cursor, y);
    cursor += node.width;
    chunks.push(node);
    return node;
  };
  push(before, palette.ink);
  const marked = push(mid, palette.parchment);
  push(after, palette.ink);
  if (marked) {
    const wash = new Graphics();
    wash.roundRect(marked.x - 3, y - 2, marked.width + 6, lineHeight - 2, 4).fill({ color: palette.deep, alpha: 0.92 });
    layer.addChild(wash);
  }
  for (const chunk of chunks) layer.addChild(chunk);
  return y + lineHeight;
}

function drawSeal(g: Graphics, sealed: boolean, palette: WorldPalette): void {
  g.clear();
  if (!sealed) return;
  g.circle(16, 8, 8).fill({ color: palette.deep });
  g.circle(16, 8, 3).stroke({ width: 1, color: palette.glow, alpha: 0.8 });
}

function summarize(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const record = row as Record<string, unknown>;
  const name = record.name ?? record.title ?? record.id;
  const kept = record.treasure ?? record.note;
  return [name, kept]
    .filter((part) => part != null && String(part).length > 0)
    .map((part) => String(part))
    .join(" · ");
}

function measurer(font: string): (text: string) => number {
  if (typeof document === "undefined") return (text) => text.length * 8;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return (text) => text.length * 8;
  context.font = font;
  return (text) => context.measureText(text).width;
}

function wrapLines(text: string, maxWidth: number, measure: (text: string) => number): { text: string; start: number }[] {
  const lines: { text: string; start: number }[] = [];
  let start = 0;
  while (start < text.length) {
    const newline = text.indexOf("\n", start);
    const limit = newline === -1 ? text.length : newline;
    if (limit === start) {
      lines.push({ text: "", start });
      start += 1;
      continue;
    }
    let end = start;
    let breakAt = -1;
    while (end < limit) {
      const next = end + 1;
      if (measure(text.slice(start, next)) > maxWidth && end > start) break;
      end = next;
      if (text[end - 1] === " ") breakAt = end;
    }
    if (end < limit && breakAt > start) end = breakAt;
    if (end === start) end = Math.min(limit, start + 1);
    lines.push({ text: text.slice(start, end), start });
    start = end;
    if (start < text.length && text[start] === "\n") start += 1;
  }
  if (lines.length === 0) lines.push({ text: "", start: 0 });
  return lines;
}
