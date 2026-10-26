"use client";

import { useEffect, useRef } from "react";
import { paintReceipt, paletteFor, receiptCopy, type ReceiptModel } from "./receipt";

function fontStack(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  const finish = (href: string) => {
    link.href = href;
    link.click();
    if (href.startsWith("blob:")) URL.revokeObjectURL(href);
  };
  canvas.toBlob((blob) => {
    if (!blob) {
      finish(canvas.toDataURL("image/png"));
      return;
    }
    finish(URL.createObjectURL(blob));
  }, "image/png");
}

export function ReceiptCard({ model, worldId }: { model: ReceiptModel; worldId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const copy = receiptCopy(model);
  const summary = `${model.title}. First prediction ${copy.before}. ${copy.afterKind} ${copy.after}. Time ${copy.elapsed}.`;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let cancel = false;
    const draw = () => {
      if (cancel) return;
      const display = fontStack("--font-fraunces", "Palatino, serif");
      const ui = fontStack("--font-geist-sans", "sans-serif");
      paintReceipt(ctx, canvas.width, canvas.height, model, paletteFor(worldId), display, ui);
    };
    const fonts = document.fonts;
    if (fonts?.ready) void fonts.ready.then(draw);
    else draw();
    return () => {
      cancel = true;
    };
  }, [model, worldId]);

  return (
    <figure className="receipt">
      <canvas ref={ref} width={1280} height={1680} role="img" aria-label={summary} />
      <figcaption className="receipt-caption">
        <p>{summary}</p>
        <button type="button" className="press" onClick={() => ref.current && downloadCanvas(ref.current, `${worldId}-receipt.png`)}>
          Keep this card
        </button>
      </figcaption>
    </figure>
  );
}
