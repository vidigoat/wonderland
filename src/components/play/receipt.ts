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

export function paintReceipt(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: ReceiptModel,
  palette: ReceiptPalette,
  displayFont: string,
  uiFont: string,
) {
  const copy = receiptCopy(model);
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

  const tracking = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  tracking.letterSpacing = "8px";
  ctx.fillStyle = palette.ink;
  ctx.font = `500 28px ${uiFont}`;
  ctx.fillText("WONDERLAND", 92, 160);
  tracking.letterSpacing = "0px";

  ctx.font = `560 76px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  const titleBottom = wrap(ctx, model.title, 92, 270, width - 184, 84, 3);

  ctx.strokeStyle = palette.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(92, titleBottom + 10);
  ctx.lineTo(width - 92, titleBottom + 10);
  ctx.stroke();

  const columnY = titleBottom + 120;
  ctx.font = `500 26px ${uiFont}`;
  tracking.letterSpacing = "4px";
  ctx.fillStyle = palette.accent;
  ctx.fillText("BEFORE", 92, columnY);
  ctx.fillText("AFTER", width / 2 + 20, columnY);
  tracking.letterSpacing = "0px";

  ctx.font = `560 84px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.before, 92, columnY + 100);
  ctx.fillStyle = model.after ? palette.accent : palette.ink;
  ctx.fillText(copy.after, width / 2 + 20, columnY + 100);

  ctx.font = `italic 32px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.afterKind, width / 2 + 20, columnY + 156);

  ctx.font = `500 26px ${uiFont}`;
  tracking.letterSpacing = "4px";
  ctx.fillStyle = palette.accent;
  ctx.fillText("TIME UNTIL IT HELD", 92, columnY + 280);
  tracking.letterSpacing = "0px";
  ctx.font = `560 92px ${displayFont}`;
  ctx.fillStyle = palette.ink;
  ctx.fillText(copy.elapsed, 92, columnY + 390);

  ctx.font = `italic 34px ${displayFont}`;
  wrap(ctx, model.tagline, 92, columnY + 480, width - 184, 46, 3);

  if (model.seen) {
    ctx.font = `italic 36px ${displayFont}`;
    ctx.fillStyle = palette.ink;
    wrap(ctx, model.seen, 92, columnY + 660, width - 184, 48, 2);
  }

  ctx.font = `400 24px ${uiFont}`;
  ctx.fillStyle = palette.ink;
  wrap(ctx, model.concept, 92, height - 220, width - 184, 34, 2);
  ctx.font = `400 22px ${uiFont}`;
  ctx.fillText("The law is not printed on this card.", 92, height - 130);
}
