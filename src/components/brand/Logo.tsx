/**
 * The Wonderland mark: a doorway with a light inside. Every question is a door; behind it is a world you find for yourself.
 * Drawn in code on a 32-unit grid. Mirrored in src/app/icon.svg, public/brand/*.svg and mark-data.ts.
 */
export const DOOR = "M8.5 27.5V14a7.5 7.5 0 0 1 15 0v13.5Z";
export const LIGHT = { cx: 16, cy: 18.5, r: 2.7 };

export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path d={DOOR} fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinejoin="round" />
      <circle {...LIGHT} fill="currentColor" />
    </svg>
  );
}

/** The mark as standalone SVG markup: white on transparent, or on a rounded black tile for icons. */
export function markSvg({ tile = false, color = "#fafafa" }: { tile?: boolean; color?: string } = {}): string {
  const plate = tile ? `<rect width="32" height="32" rx="7" fill="#000"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${plate}<path d="${DOOR}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linejoin="round"/><circle cx="${LIGHT.cx}" cy="${LIGHT.cy}" r="${LIGHT.r}" fill="${color}"/></svg>`;
}
