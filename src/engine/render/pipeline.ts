import { Container, Graphics, Text } from "pixi.js";
import { clamp01, clampCenter, injectionHighlightRange, lerp, readBoolean, scrollRest, sealedDataLine, shutVaultNote, splitSealedSpell, stepScroll, type ScrollTrip } from "./helpers";
import { pixelRatio, stageFont } from "./fonts";
import type { WorldPalette } from "./palette";
import type { Frame, Scene } from "./scene";
import { createFigure, destroyChildren, type Figure } from "./sprites";
import { createBackdrop } from "./backdrop";

const DEFAULT_STAGES = ["scroll", "scribe", "ledger", "vault"];

export function createPipelineScene(): Scene {
  const root = new Container();
  const backdrop = new Graphics();
  const painting = createBackdrop();
  const wash = new Graphics();
  const route = new Graphics();
  const stations = new Container();
  const traveler = new Container();
  const spell = new Container();
  // Stations and their names paint after the scroll, so the scribe, the vault, and the labels stay visible.
  root.addChild(backdrop, painting.view, wash, route, traveler, stations, spell);

  const travelerFigure = createFigure();
  traveler.addChild(travelerFigure.view);
  let layoutKey = "";
  let points: { x: number; y: number }[] = [];
  let stationFigures: Figure[] = [];
  let alive = true;
  let trip: ScrollTrip = { started: null, traveled: false };

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
      // Dim the painting so the four stations and the spell read clearly over it.
      wash.clear();
      wash.rect(0, 0, frame.width, frame.height).fill({ color: 0x000000, alpha: 0.38 });
      for (const figure of stationFigures) figure.cancel();
      stationFigures = layStations(stations, stages, points, frame, rows.length > 0, Boolean(error));
      laySpell(spell, frame, query, error, rows, sealed);
    }

    travelerFigure.show(frame.worldId, "scroll", frame.palette.parchment);
    const open = rows.length > 0;
    const destination = scrollRest(stages, { error: Boolean(error), open });
    const now = typeof performance !== "undefined" ? performance.now() : frame.time;
    const stepped = stepScroll(trip, frame.playing, frame.reducedMotion, now, destination);
    trip = stepped.trip;
    const at = along(points, stepped.travel);
    const bob = frame.playing || frame.reducedMotion ? 0 : Math.sin(frame.time / 700) * 5;
    // Sit on the path just before and below the station, so the figure and its name stay clear.
    // The offset grows with the scroll's drawn size; a fixed fraction of the width let a large scroll cover the vault.
    const unit = Math.min(frame.width, frame.height);
    const scale = Math.max(1.25, Math.min(2.15, unit / 420));
    const aside = 44 * scale;
    const drop = 40 * scale;
    traveler.position.set(at.x - aside, at.y + drop + bob);
    traveler.rotation = frame.reducedMotion ? 0 : at.angle * 0.18;
    traveler.scale.set(scale);
    painting.show(frame.worldId, frame.width, frame.height);
  };

  return {
    root,
    update,
    destroy() {
      alive = false;
      travelerFigure.cancel();
      for (const figure of stationFigures) figure.cancel();
      painting.destroy();
      root.destroy({ children: true });
    },
  };
}

function stationPoints(count: number, width: number, height: number): { x: number; y: number }[] {
  const y = height < 520 ? height * 0.32 : height * 0.42;
  const inset = Math.max(height < 520 ? 28 : 56, width * (height < 520 ? 0.08 : 0.12));
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
  const scale = Math.max(1.25, Math.min(2.15, unit / 420));
  stages.forEach((stage, index) => {
    const at = points[index];
    if (!at) return;
    // The traveler is the scroll. A second one on the desk would look like a copy.
    if (!/scroll/i.test(stage)) {
      const figure = createFigure();
      const tint = stationTint(stage, frame.palette);
      figure.show(frame.worldId, stage, tint);
      figure.view.position.set(at.x, at.y);
      figure.view.scale.set(open && /vault|door/i.test(stage) ? scale * 1.35 : scale);
      layer.addChild(figure.view);
      figures.push(figure);
    }

    if (open && /vault|door/i.test(stage)) {
      const glow = new Graphics();
      glow.ellipse(at.x, at.y, 70 * scale, 48 * scale).fill({ color: frame.palette.glow, alpha: 0.28 });
      glow.ellipse(at.x, at.y, 28 * scale, 34 * scale).fill({ color: frame.palette.glow, alpha: 0.7 });
      layer.addChildAt(glow, 0);
    }
    if (error && /scribe/i.test(stage)) {
      const blot = new Graphics();
      blot.circle(at.x + 16 * scale, at.y - 18 * scale, 5).fill({ color: frame.palette.deep, alpha: 0.9 });
      layer.addChild(blot);
    }

    const narrow = frame.width < 520;
    const role = stationRole(stage, open, error, index, narrow);
    const card = stationCard(role, frame.height < 520 || narrow);
    const bounds = card.getLocalBounds();
    // On a phone the scroll travels under the stations. Names go above them, staggered, so they don't sit on the scroll.
    const drop = narrow
      ? -bounds.height - 8 - (index % 2 === 1 ? bounds.height + 4 : 0)
      : (frame.height < 520 ? 30 : 42) * scale;
    card.position.set(clampCenter(at.x, bounds.width, frame.width), at.y + drop);
    layer.addChild(card);
  });
  return figures;
}

/** What each station is called and what it is doing right now, in plain words. */
function stationRole(stage: string, open: boolean, error: boolean, index: number, narrow = false): { title: string; state: string; alert: boolean } {
  const n = `${index + 1}`;
  if (narrow) {
    if (/scroll/i.test(stage)) return { title: `${n} Scroll`, state: "", alert: false };
    if (/scribe/i.test(stage)) return { title: `${n} Scribe`, state: error ? "stopped" : "", alert: error };
    if (/ledger|book/i.test(stage)) return { title: `${n} Ledger`, state: open ? "open" : "", alert: open };
    if (/vault|door/i.test(stage)) return { title: `${n} Vault`, state: open ? "OPEN" : "shut", alert: open };
  }
  if (/scroll/i.test(stage)) return { title: `${n}  Your scroll`, state: "what you write", alert: false };
  if (/scribe/i.test(stage)) return { title: `${n}  The scribe`, state: error ? "stopped: the spell broke" : "pastes it into a spell", alert: error };
  if (/ledger|book/i.test(stage)) return { title: `${n}  The ledger`, state: open ? "gave up its entries" : "runs the spell", alert: open };
  if (/vault|door/i.test(stage)) return { title: `${n}  The vault`, state: open ? "OPEN" : "shut", alert: open };
  return { title: `${n}  ${stage.replace(/[-_]/g, " ")}`, state: "", alert: false };
}

function stationCard(role: { title: string; state: string; alert: boolean }, small: boolean): Container {
  const card = new Container();
  const resolution = pixelRatio();
  const title = new Text({ text: role.title, resolution, style: { fontFamily: stageFont("ui"), fontSize: small ? 12 : 14, fontWeight: "600", fill: 0xfafafa } });
  const state = new Text({
    text: role.state,
    resolution,
    style: { fontFamily: stageFont("ui"), fontSize: small ? 11 : 12, fontWeight: role.alert ? "700" : "400", fill: role.alert ? 0xffd27a : 0xbdbdbd },
  });
  const padX = 10;
  const padY = 6;
  const w = Math.max(title.width, state.width) + padX * 2;
  const h = title.height + state.height + padY * 2 + 1;
  const plate = new Graphics();
  plate.roundRect(-w / 2, 0, w, h, 9).fill({ color: 0x000000, alpha: 0.78 });
  plate.roundRect(-w / 2, 0, w, h, 9).stroke({ width: 1, color: role.alert ? 0xffd27a : 0xffffff, alpha: role.alert ? 0.8 : 0.16 });
  title.position.set(-title.width / 2, padY);
  state.position.set(-state.width / 2, padY + title.height + 1);
  card.addChild(plate, title, state);
  return card;
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
  const short = frame.height < 520;
  const margin = Math.max(short ? 12 : 18, frame.width * 0.04);
  const cardW = frame.width - margin * 2;
  const cardX = margin;
  const resolution = pixelRatio();
  const fontSize = cardW < 420 ? 12 : cardW < 520 ? 13 : 15;
  const family = stageFont("mono");
  const maxWidth = cardW - 36;
  const lineHeight = fontSize * 1.5;
  const heading = new Text({
    text: query
      ? cardW < 480
        ? "The spell from your scroll"
        : "The spell the scribe wrote from your scroll (an SQL query)"
      : "The scribe's desk is clear. Send a scroll to see the spell it writes.",
    resolution,
    style: { fontFamily: stageFont("ui"), fontSize: 12, fill: 0xa3a3a3, wordWrap: true, wordWrapWidth: maxWidth },
  });
  const split = splitSealedSpell(query);
  const measure = measurer(`500 ${fontSize}px ${family}`);
  const wrapped = split.spell ? wrapLines(split.spell, maxWidth, measure) : [];
  const lines = wrapped.slice(0, 6);
  if (wrapped.length > lines.length && lines.length > 0) {
    const last = lines[lines.length - 1]!;
    lines[lines.length - 1] = { text: `${last.text.replace(/\s+$/, "")} …`, start: last.start };
  }
  let dataNote: Text | null = null;
  if (split.data) {
    dataNote = new Text({
      text: sealedDataLine(split.data),
      resolution,
      style: { fontFamily: stageFont("ui"), fontSize: 13, fontWeight: "600", fill: 0xf6e2a8, wordWrap: true, wordWrapWidth: maxWidth },
    });
  }
  let footer: Text | null = null;
  const shutNote = shutVaultNote(query, error, rows.length);
  if (error) {
    footer = new Text({
      text: `The scribe stopped: ${error.replace(/\s+/g, " ").slice(0, 100)}`,
      resolution,
      style: { fontFamily: stageFont("ui"), fontSize: 13, fill: 0xff8a7a, wordWrap: true, wordWrapWidth: maxWidth },
    });
  } else if (rows.length > 0) {
    const shown = rows.map(summarize).filter(Boolean).slice(0, 3);
    footer = new Text({
      text: `The ledger gave up ${rows.length} ${rows.length === 1 ? "entry" : "entries"}${shown.length ? `: ${shown.join(" · ")}` : ""}`,
      resolution,
      style: { fontFamily: stageFont("ui"), fontSize: 13, fontWeight: "600", fill: 0xffd27a, wordWrap: true, wordWrapWidth: maxWidth },
    });
  } else if (shutNote) {
    footer = new Text({
      text: shutNote,
      resolution,
      style: { fontFamily: stageFont("ui"), fontSize: 13, fill: 0xf5f5f5, wordWrap: true, wordWrapWidth: maxWidth },
    });
  }
  const padY = 12;
  const cardH = padY + heading.height + 6 + lines.length * lineHeight + (dataNote ? dataNote.height + 8 : 0) + (footer ? footer.height + 8 : 0) + padY;
  // The spoken line sits in a strip under this card. Leave that strip clear.
  const captionStrip = 58;
  const cardY = Math.max(frame.height * 0.38, frame.height - cardH - Math.max(12, frame.height * 0.03) - captionStrip);
  const plate = new Graphics();
  plate.roundRect(cardX, cardY, cardW, cardH, 12).fill({ color: 0x050505, alpha: 0.86 });
  plate.roundRect(cardX, cardY, cardW, cardH, 12).stroke({ width: 1, color: 0xffffff, alpha: 0.14 });
  layer.addChild(plate);
  heading.position.set(cardX + 18, cardY + padY);
  layer.addChild(heading);
  const range = sealed ? null : injectionHighlightRange(split.spell);
  let y = cardY + padY + heading.height + 6;
  for (const line of lines) {
    y = drawLine(layer, line, y, cardX + 18, lineHeight, fontSize, family, range, frame.palette);
  }
  if (dataNote) {
    dataNote.position.set(cardX + 18, y + 4);
    layer.addChild(dataNote);
    y += dataNote.height + 4;
  }
  if (footer) {
    footer.position.set(cardX + 18, y + 4);
    layer.addChild(footer);
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
  // Your words, where they changed the spell, are marked in amber.
  void palette;
  push(before, 0xf5f5f5);
  const marked = push(mid, 0x1a1205);
  push(after, 0xf5f5f5);
  if (marked) {
    const wash = new Graphics();
    wash.roundRect(marked.x - 3, y - 2, marked.width + 6, lineHeight - 3, 4).fill({ color: 0xffd27a, alpha: 0.95 });
    layer.addChild(wash);
  }
  for (const chunk of chunks) layer.addChild(chunk);
  return y + lineHeight;
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
