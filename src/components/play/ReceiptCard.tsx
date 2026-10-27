"use client";

import { useEffect, useRef } from "react";
import { paintReceipt, paletteFor, receiptArtPaths, receiptSummary, type ReceiptModel, type ReceiptPicture } from "./receipt";

function fontStack(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });
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
  const { title, tagline, concept, before, after, afterKind, elapsedMs, seen, beforeWords, afterWords } = model;
  const summary = receiptSummary(model);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const current = { title, tagline, concept, before, after, afterKind, elapsedMs, seen, beforeWords, afterWords };
    let cancel = false;
    const draw = (art: ReceiptPicture | null) => {
      if (cancel) return;
      const display = fontStack("--font-geist-sans", "sans-serif");
      const ui = fontStack("--font-geist-sans", "sans-serif");
      paintReceipt(ctx, canvas.width, canvas.height, current, paletteFor(worldId), display, ui, art);
    };
    const paths = receiptArtPaths(worldId);
    const pictures = paths
      ? Promise.all([loadImage(paths.ground), loadImage(paths.figure)]).then(([ground, figure]) => ({ ground, figure }))
      : Promise.resolve(null);
    const fonts = document.fonts?.ready ?? Promise.resolve();
    void Promise.all([fonts, pictures]).then(([, art]) => draw(art));
    return () => {
      cancel = true;
    };
  }, [worldId, title, tagline, concept, before, after, afterKind, elapsedMs, seen, beforeWords, afterWords]);

  return (
    <figure className="receipt">
      <figcaption className="receipt-caption">
        <button type="button" className="press" onClick={() => ref.current && downloadCanvas(ref.current, `${worldId}-receipt.png`)}>
          Keep this card
        </button>
        <p className="receipt-kept">The law is not printed on this card.</p>
        <p className="sr">{summary}</p>
      </figcaption>
      <canvas ref={ref} width={1280} height={1680} role="img" aria-label={summary} />
    </figure>
  );
}
