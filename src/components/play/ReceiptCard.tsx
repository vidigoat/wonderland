"use client";

import { useEffect, useRef } from "react";
import { paintReceipt, paletteFor, receiptArtPaths, receiptCanvasSize, receiptSummary, type ReceiptModel, type ReceiptPicture } from "./receipt";
import { useUiText } from "./ui-text";

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
  const { title, tagline, concept, before, after, afterKind, elapsedMs, seen, beforeWords, afterWords, labels } = model;
  const t = useUiText();
  const summary = receiptSummary(model);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const narrow = window.matchMedia("(max-width: 720px)").matches;
    const size = receiptCanvasSize(canvas.clientWidth || 320, window.devicePixelRatio || 1, narrow);
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const current = { title, tagline, concept, before, after, afterKind, elapsedMs, seen, beforeWords, afterWords, labels };
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
  }, [worldId, title, tagline, concept, before, after, afterKind, elapsedMs, seen, beforeWords, afterWords, labels]);

  return (
    <figure className="receipt">
      <figcaption className="receipt-caption">
        <button type="button" className="press" onClick={() => ref.current && downloadCanvas(ref.current, `${worldId}-receipt.png`)}>
          {t.keepCard}
        </button>
        <p className="receipt-kept">{t.card.lawAbsent}</p>
        <p className="sr">{summary}</p>
      </figcaption>
      <canvas ref={ref} width={1200} height={640} role="img" aria-label={summary} />
    </figure>
  );
}
