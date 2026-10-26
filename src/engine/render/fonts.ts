/** Fonts already on the page (Geist) with a storybook serif before them. */
export function stageFont(kind: "ui" | "mono" | "story"): string {
  const serif = "Georgia, 'Iowan Old Style', Palatino, serif";
  const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  if (typeof document === "undefined") {
    if (kind === "mono") return mono;
    return kind === "story" ? `Fraunces, ${serif}` : serif;
  }
  const variable = kind === "mono" ? "--font-geist-mono" : "--font-geist-sans";
  const loaded = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  if (kind === "mono") return loaded ? `${loaded}, ${mono}` : mono;
  if (kind === "story") return loaded ? `Fraunces, ${loaded}, ${serif}` : `Fraunces, ${serif}`;
  return loaded ? `${loaded}, ${serif}` : serif;
}

export function pixelRatio(): number {
  if (typeof window === "undefined") return 1;
  const ratio = window.devicePixelRatio || 1;
  return Math.min(2, ratio);
}
