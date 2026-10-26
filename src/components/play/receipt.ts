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
};

export type ReceiptPalette = {
  paper: string;
  ink: string;
  accent: string;
  brass: string;
};

export function paletteFor(worldId: string): ReceiptPalette {
  switch (worldId) {
    case "gatekeeper":
      return { paper: "#f7f0df", ink: "#241816", accent: "#6e1d24", brass: "#b8923a" };
    case "peppered-forest":
      return { paper: "#f6f3e8", ink: "#1c2418", accent: "#3f6b45", brass: "#a56b3c" };
    case "newtons-cannon":
      return { paper: "#f3ead7", ink: "#14110e", accent: "#8d6230", brass: "#c4a36a" };
    case "rumour-town":
      return { paper: "#fff8ee", ink: "#3a2a22", accent: "#c46a32", brass: "#d98a4a" };
    case "firebreak":
      return { paper: "#f3ead7", ink: "#14110e", accent: "#b85a28", brass: "#e07a3d" };
    default:
      return { paper: "#f3ead7", ink: "#14110e", accent: "#a56b3c", brass: "#a56b3c" };
  }
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

  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, width - 80, height - 80);
  ctx.lineWidth = 2;
  ctx.strokeRect(58, 58, width - 116, height - 116);

  ctx.fillStyle = palette.accent;
  ctx.fillRect(58, 58, width - 116, 22);

  ctx.fillStyle = palette.brass;
  ctx.fillRect(58, height - 80, width - 116, 22);

  if (art?.ground) {
    drawCover(ctx, art.ground, frame);
    if (art.figure) drawFigure(ctx, art.figure, frame);
    ctx.strokeStyle = palette.brass;
    ctx.lineWidth = 3;
    ctx.strokeRect(frame.x, frame.y, frame.w, frame.h);
  }

  const tracking = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  tracking.letterSpacing = "8px";
  ctx.fillStyle = palette.ink;
  ctx.font = `500 28px ${uiFont}`;
  ctx.fillText("WONDERLAND", 92, frame.textTop);
  tracking.letterSpacing = "0px";

  ctx.font = `560 ${art?.ground ? 64 : 76}px ${displayFont}`;
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
  ctx.font = `500 26px ${uiFont}`;
  tracking.letterSpacing = "4px";
  ctx.fillStyle = palette.accent;
  ctx.fillText("BEFORE", 92, columnY);
  ctx.fillText("AFTER", width / 2 + 20, columnY);
  tracking.letterSpacing = "0px";

  ctx.font = `560 ${tight ? 68 : 84}px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.before, 92, columnY + (tight ? 78 : 100));
  ctx.fillStyle = model.after ? palette.accent : palette.ink;
  ctx.fillText(copy.after, width / 2 + 20, columnY + (tight ? 78 : 100));

  ctx.font = `italic 32px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.afterKind, width / 2 + 20, columnY + (tight ? 128 : 156));

  ctx.font = `500 26px ${uiFont}`;
  tracking.letterSpacing = "4px";
  ctx.fillStyle = palette.accent;
  ctx.fillText("TIME UNTIL IT HELD", 92, columnY + (tight ? 210 : 280));
  tracking.letterSpacing = "0px";
  ctx.font = `560 ${tight ? 72 : 92}px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.elapsed, 92, columnY + (tight ? 292 : 390));

  ctx.font = `italic 34px ${displayFont}`;
  const taglineY = columnY + (tight ? 360 : 480);
  wrap(ctx, model.tagline, 92, taglineY, width - 184, tight ? 42 : 46, 2);

  const seenY = taglineY + (tight ? 110 : 180);
  if (model.seen && seenY < height - 340) {
    ctx.font = `italic 32px ${displayFont}`;
    ctx.fillStyle = palette.ink;
    wrap(ctx, model.seen, 92, seenY, width - 184, 42, 2);
  }

  ctx.font = `400 24px ${uiFont}`;
  ctx.fillStyle = palette.ink;
  wrap(ctx, model.concept, 92, height - 220, width - 184, 34, 2);
  ctx.font = `400 22px ${uiFont}`;
  ctx.fillText("The law is not printed on this card.", 92, height - 130);
}
