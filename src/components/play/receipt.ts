import { formatElapsed } from "./phase";
import { heroArtUrl } from "@/worlds/hero-art";

export type ReceiptModel = {
  title: string;
  tagline: string;
  concept: string;
  before: boolean;
  after: boolean;
  afterKind: "prediction" | "transfer";
  elapsedMs: number | null;
  /** Witness lines the stage already said. Never a mechanism. */
  seen?: string | null;
  /** What the player themselves wrote beside each mark. */
  beforeWords?: string | null;
  afterWords?: string | null;
};

export type ReceiptPalette = {
  paper: string;
  ink: string;
  accent: string;
  brass: string;
};

/** Every card is black and white; the world's painting is the only colour on it. */
export function paletteFor(worldId: string): ReceiptPalette {
  void worldId;
  return { paper: "#0a0a0a", ink: "#fafafa", accent: "#a3a3a3", brass: "#262626" };
}

const FIGURES: Record<string, string> = {
  gatekeeper: "scribe.svg",
  "peppered-forest": "moth.svg",
  "newtons-cannon": "planet.svg",
  "rumour-town": "citizen.svg",
  firebreak: "flame.svg",
};

/** Shelf paintings for the card. Unknown worlds stay type only. */
export function receiptArtPaths(worldId: string): { ground: string; figure: string } | null {
  const figure = FIGURES[worldId];
  if (!figure) return null;
  return {
    ground: heroArtUrl(worldId, "background", `/art/${worldId}/background.svg`),
    figure: heroArtUrl(worldId, figure.replace(/\.svg$/, ""), `/art/${worldId}/${figure}`),
  };
}

export type ReceiptPicture = {
  ground: CanvasImageSource | null;
  figure: CanvasImageSource | null;
};

/** A desk card is the wide painting. A phone card is taller than it is wide, so the type survives the narrow column. */
export function receiptCanvasSize(cssWidth: number, dpr: number, narrow: boolean): { width: number; height: number } {
  if (!narrow) return { width: 1200, height: 640 };
  const width = Math.max(280, Math.round(Math.max(1, cssWidth) * Math.min(2, Math.max(1, dpr))));
  return { width, height: Math.round(width * 1.55) };
}

/** Where the painting sits, and where the words begin. A wide card puts the painting on the left. */
export function pictureFrame(
  width: number,
  hasPicture: boolean,
  height = 1680,
): { x: number; y: number; w: number; h: number; textTop: number; textX: number } {
  if (!hasPicture) return { x: 0, y: 0, w: 0, h: 0, textTop: 160, textX: 92 };
  if (width > height) {
    const x = 36;
    const y = 36;
    const h = Math.max(0, height - 72);
    const w = Math.round(width * 0.38);
    return { x, y, w, h, textTop: 78, textX: x + w + 40 };
  }
  const x = 80;
  const y = 80;
  const w = Math.max(0, width - 160);
  const h = 340;
  return { x, y, w, h, textTop: y + h + 72, textX: 92 };
}

export function receiptCopy(model: ReceiptModel) {
  return {
    before: model.before ? "Held" : "Missed",
    after: model.after ? "Held" : "Missed",
    afterKind: model.afterKind === "prediction" ? "Second prediction" : "Transfer",
    elapsed: model.elapsedMs == null ? "—" : formatElapsed(model.elapsedMs),
  };
}

/** The card's spoken name. Same facts as the painting, including that the law is absent. */
export function receiptSummary(model: ReceiptModel): string {
  const copy = receiptCopy(model);
  const beforeWords = model.beforeWords ? `: ${model.beforeWords}` : "";
  const afterWords = model.afterWords ? `: ${model.afterWords}` : "";
  const seen = model.seen ? ` You saw: ${model.seen}` : "";
  return `${model.title}. First prediction ${copy.before}${beforeWords}. ${copy.afterKind} ${copy.after}${afterWords}. Time ${copy.elapsed}.${seen} The law is not printed on this card.`;
}

/** Lines that fit a width. A sentence that still has more words ends with an ellipsis, not a cut word. */
export function clippedLines(text: string, maxWidth: number, measure: (value: string) => number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  let index = 0;
  while (index < words.length && rows.length < maxLines) {
    let line = words[index] ?? "";
    let next = index + 1;
    while (next < words.length && measure(`${line} ${words[next]}`) <= maxWidth) {
      line = `${line} ${words[next]}`;
      next += 1;
    }
    const last = rows.length === maxLines - 1;
    if (last && next < words.length) {
      let cut = words.slice(index).join(" ");
      if (measure(cut) > maxWidth) {
        while (cut.length > 1 && measure(`${cut}…`) > maxWidth) cut = cut.slice(0, -1).trimEnd();
        cut = `${cut}…`;
      }
      rows.push(cut);
      break;
    }
    if (measure(line) > maxWidth) {
      let cut = line;
      while (cut.length > 1 && measure(`${cut}…`) > maxWidth) cut = cut.slice(0, -1).trimEnd();
      rows.push(`${cut}…`);
      break;
    }
    rows.push(line);
    index = next;
  }
  return rows;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): number {
  for (const line of clippedLines(text, maxWidth, (value) => ctx.measureText(value).width, maxLines)) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function sourceSize(image: CanvasImageSource): { w: number; h: number } {
  if (image instanceof HTMLImageElement) return { w: image.naturalWidth, h: image.naturalHeight };
  if ("width" in image && "height" in image) return { w: Number(image.width) || 0, h: Number(image.height) || 0 };
  return { w: 0, h: 0 };
}

function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, frame: { x: number; y: number; w: number; h: number }) {
  const { w: iw, h: ih } = sourceSize(image);
  if (iw <= 0 || ih <= 0 || frame.w <= 0 || frame.h <= 0) return;
  const scale = Math.max(frame.w / iw, frame.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();
  ctx.drawImage(image, frame.x + (frame.w - dw) / 2, frame.y + (frame.h - dh) / 2, dw, dh);
  ctx.restore();
}

function drawFigure(ctx: CanvasRenderingContext2D, image: CanvasImageSource, frame: { x: number; y: number; w: number; h: number }) {
  const { w: iw, h: ih } = sourceSize(image);
  if (iw <= 0 || ih <= 0) return;
  const scale = Math.min((frame.w * 0.46) / iw, (frame.h * 0.82) / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, frame.x + (frame.w - dw) / 2, frame.y + frame.h - dh - 16, dw, dh);
}

function paintWideReceipt(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: ReceiptModel,
  palette: ReceiptPalette,
  displayFont: string,
  uiFont: string,
  art: ReceiptPicture | null,
  frame: { x: number; y: number; w: number; h: number; textTop: number; textX: number },
  copy: ReturnType<typeof receiptCopy>,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = palette.brass;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  if (art?.ground) {
    drawCover(ctx, art.ground, frame);
    if (art.figure) drawFigure(ctx, art.figure, frame);
    ctx.strokeStyle = palette.brass;
    ctx.lineWidth = 3;
    ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
  }

  const x = frame.textX;
  const max = width - x - 40;
  ctx.fillStyle = palette.accent;
  ctx.font = `500 22px ${uiFont}`;
  ctx.fillText("Wonderland", x, frame.textTop);

  ctx.font = `600 46px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  const titleBottom = wrap(ctx, model.title, x, frame.textTop + 62, max, 52, 2);

  ctx.strokeStyle = palette.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, titleBottom + 8);
  ctx.lineTo(width - 40, titleBottom + 8);
  ctx.stroke();

  const columnY = titleBottom + 48;
  ctx.font = `500 20px ${uiFont}`;
  ctx.fillStyle = palette.accent;
  ctx.fillText("Before", x, columnY);
  ctx.fillText("After", x + max * 0.48, columnY);

  ctx.font = `600 42px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.before, x, columnY + 48);
  ctx.fillText(copy.after, x + max * 0.48, columnY + 48);

  ctx.font = `400 20px ${uiFont}`;
  const wordsY = columnY + 84;
  if (model.beforeWords) wrap(ctx, model.beforeWords, x, wordsY, max * 0.46, 24, 3);
  ctx.fillText(copy.afterKind, x + max * 0.48, wordsY);
  if (model.afterWords) wrap(ctx, model.afterWords, x + max * 0.48, wordsY + 28, max * 0.5, 24, 3);

  ctx.font = `500 20px ${uiFont}`;
  ctx.fillStyle = palette.accent;
  ctx.fillText("Time you spent", x, height - 118);
  ctx.font = `600 40px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.elapsed, x + 250, height - 118);
  ctx.font = `400 22px ${uiFont}`;
  ctx.fillText("The law is not printed on this card.", x, height - 64);
}

/** A narrow column. The painting sits on top and the words use the full width at a size you can read. */
function paintCompactReceipt(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: ReceiptModel,
  palette: ReceiptPalette,
  displayFont: string,
  uiFont: string,
  art: ReceiptPicture | null,
  copy: ReturnType<typeof receiptCopy>,
) {
  const pad = Math.round(width * 0.05);
  const px = (share: number) => Math.max(12, Math.round(width * share));
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = palette.brass;
  ctx.lineWidth = Math.max(2, Math.round(width * 0.004));
  ctx.strokeRect(pad * 0.45, pad * 0.45, width - pad * 0.9, height - pad * 0.9);

  const pictureH = Math.round(height * 0.3);
  if (art?.ground) {
    const frame = { x: pad, y: pad, w: width - pad * 2, h: pictureH - pad };
    drawCover(ctx, art.ground, frame);
    if (art.figure) drawFigure(ctx, art.figure, frame);
    ctx.strokeStyle = palette.brass;
    ctx.lineWidth = Math.max(2, Math.round(width * 0.005));
    ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
  }

  let y = pad + pictureH + px(0.08);
  const textW = width - pad * 2;
  ctx.fillStyle = palette.accent;
  ctx.font = `500 ${px(0.034)}px ${uiFont}`;
  ctx.fillText("Wonderland", pad, y);
  y += px(0.08);

  ctx.fillStyle = palette.ink;
  ctx.font = `600 ${px(0.062)}px ${displayFont}`;
  y = wrap(ctx, model.title, pad, y, textW, px(0.072), 2);
  y += px(0.03);
  ctx.strokeStyle = palette.brass;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(width - pad, y);
  ctx.stroke();
  y += px(0.07);

  ctx.font = `500 ${px(0.032)}px ${uiFont}`;
  ctx.fillStyle = palette.accent;
  ctx.fillText("Before", pad, y);
  ctx.fillText("After", pad + textW * 0.52, y);
  y += px(0.075);

  ctx.font = `600 ${px(0.056)}px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.before, pad, y);
  ctx.fillText(copy.after, pad + textW * 0.52, y);
  y += px(0.055);

  ctx.font = `400 ${px(0.04)}px ${uiFont}`;
  const leftBottom = model.beforeWords ? wrap(ctx, model.beforeWords, pad, y, textW * 0.48, px(0.05), 4) : y;
  let rightY = y;
  ctx.fillText(copy.afterKind, pad + textW * 0.52, rightY);
  rightY += px(0.05);
  if (model.afterWords) rightY = wrap(ctx, model.afterWords, pad + textW * 0.52, rightY, textW * 0.46, px(0.05), 4);
  y = Math.max(leftBottom, rightY) + px(0.07);

  ctx.font = `500 ${px(0.032)}px ${uiFont}`;
  ctx.fillStyle = palette.accent;
  ctx.fillText("Time you spent", pad, y);
  ctx.font = `600 ${px(0.05)}px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.elapsed, pad + textW * 0.58, y);
  y += px(0.08);

  ctx.font = `400 ${px(0.038)}px ${uiFont}`;
  wrap(ctx, "The law is not printed on this card.", pad, y, textW, px(0.048), 2);
}

export function paintReceipt(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: ReceiptModel,
  palette: ReceiptPalette,
  displayFont: string,
  uiFont: string,
  art: ReceiptPicture | null = null,
) {
  const copy = receiptCopy(model);
  const frame = pictureFrame(width, Boolean(art?.ground), height);
  if (height > width && width < 900) {
    paintCompactReceipt(ctx, width, height, model, palette, displayFont, uiFont, art, copy);
    return;
  }
  if (width > height) {
    paintWideReceipt(ctx, width, height, model, palette, displayFont, uiFont, art, frame, copy);
    return;
  }
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);

  // One hairline frame, nothing else: the card is quiet so the words and the painting carry it.
  ctx.strokeStyle = palette.brass;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  if (art?.ground) {
    drawCover(ctx, art.ground, frame);
    if (art.figure) drawFigure(ctx, art.figure, frame);
    ctx.strokeStyle = palette.brass;
    ctx.lineWidth = 3;
    ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
  }

  const tracking = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  ctx.fillStyle = palette.accent;
  ctx.font = `500 28px ${uiFont}`;
  ctx.fillText("Wonderland", 92, frame.textTop);

  tracking.letterSpacing = "-2px";
  ctx.font = `600 ${art?.ground ? 64 : 76}px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  const titleBottom = wrap(ctx, model.title, 92, frame.textTop + (art?.ground ? 88 : 110), width - 184, art?.ground ? 72 : 84, 2);

  ctx.strokeStyle = palette.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(92, titleBottom + 10);
  ctx.lineTo(width - 92, titleBottom + 10);
  ctx.stroke();

  const tight = Boolean(art?.ground);
  const columnY = titleBottom + (tight ? 72 : 120);
  tracking.letterSpacing = "0px";
  ctx.font = `500 26px ${uiFont}`;
  ctx.fillStyle = palette.accent;
  ctx.fillText("Before", 92, columnY);
  ctx.fillText("After", width / 2 + 20, columnY);

  ctx.font = `600 ${tight ? 68 : 84}px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.before, 92, columnY + (tight ? 78 : 100));
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.after, width / 2 + 20, columnY + (tight ? 78 : 100));

  const wordsY = columnY + (tight ? 124 : 156);
  ctx.font = `400 28px ${uiFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.afterKind, width / 2 + 20, wordsY);
  ctx.font = `400 30px ${uiFont}`;
  if (model.beforeWords) wrap(ctx, model.beforeWords, 92, wordsY, width / 2 - 150, 32, 2);
  if (model.afterWords) wrap(ctx, model.afterWords, width / 2 + 20, wordsY + 40, width / 2 - 150, 32, 2);

  const timeLabelY = wordsY + (model.beforeWords || model.afterWords ? 108 : 70);
  ctx.font = `500 26px ${uiFont}`;
  ctx.fillStyle = palette.accent;
  ctx.fillText("Time you spent", 92, timeLabelY);
  ctx.font = `600 ${tight ? 72 : 92}px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.elapsed, 92, timeLabelY + (tight ? 78 : 100));

  ctx.font = `400 34px ${uiFont}`;
  const taglineY = timeLabelY + (tight ? 150 : 190);
  wrap(ctx, model.tagline, 92, taglineY, width - 184, tight ? 42 : 46, 2);

  const seenY = taglineY + (tight ? 110 : 180);
  if (model.seen && seenY < height - 340) {
    ctx.font = `400 32px ${uiFont}`;
    ctx.fillStyle = palette.ink;
    wrap(ctx, model.seen, 92, seenY, width - 184, 42, 2);
  }

  ctx.font = `400 24px ${uiFont}`;
  ctx.fillStyle = palette.ink;
  wrap(ctx, model.concept, 92, height - 220, width - 184, 34, 2);
  ctx.font = `400 22px ${uiFont}`;
  ctx.fillText("The law is not printed on this card.", 92, height - 130);
}
