import { formatElapsed } from "./phase";

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
  return { ground: `/art/${worldId}/background.svg`, figure: `/art/${worldId}/${figure}` };
}

export type ReceiptPicture = {
  ground: CanvasImageSource | null;
  figure: CanvasImageSource | null;
};

/** Where the painting sits, and where the words begin under it. */
export function pictureFrame(width: number, hasPicture: boolean): { x: number; y: number; w: number; h: number; textTop: number } {
  if (!hasPicture) return { x: 0, y: 0, w: 0, h: 0, textTop: 160 };
  const x = 80;
  const y = 80;
  const w = Math.max(0, width - 160);
  const h = 340;
  return { x, y, w, h, textTop: y + h + 72 };
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

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): number {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = word;
      if (lines >= maxLines - 1) break;
    } else {
      line = next;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y);
  return y + lineHeight;
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
  const frame = pictureFrame(width, Boolean(art?.ground));
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
  ctx.fillText("Time until it held", 92, timeLabelY);
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
