import { markSvg } from "./Logo";

/** The mark as an SVG data URL, for images drawn on the server (share cards, the Apple icon). */
export function markDataUrl(options?: { tile?: boolean; color?: string }): string {
  return `data:image/svg+xml;base64,${Buffer.from(markSvg(options)).toString("base64")}`;
}
