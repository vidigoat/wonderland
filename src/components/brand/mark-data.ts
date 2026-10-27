import { DISC, KEYHOLE } from "./Logo";

/** The mark as an SVG data URL, for images drawn on the server (share cards, the Apple icon). */
export function markDataUrl(disc = "#fafafa"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="k"><path d="${KEYHOLE}"/></clipPath><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="0.55" stop-color="#f4875a"/><stop offset="1" stop-color="#c2456a"/></linearGradient></defs><path fill="${disc}" fill-rule="evenodd" d="${DISC}m0 13.5a8.5 8.5 0 0 0-4.3 15.8l-2.6 14.2a1.6 1.6 0 0 0 1.6 1.9h10.6a1.6 1.6 0 0 0 1.6-1.9l-2.6-14.2A8.5 8.5 0 0 0 32 16.5Z"/><g clip-path="url(#k)"><rect x="20" y="14" width="24" height="36" fill="url(#s)"/><circle cx="32" cy="27" r="3.6" fill="#fff4d6"/><path d="M20 41c4-3.2 7.5-4.2 11-2.6c3.6 1.6 7.4.6 13-2.6V50H20Z" fill="#2c3f8f"/><path d="M20 45c5-2.4 9.5-2.6 14-.8c3.4 1.3 6.4.9 10-1.2V50H20Z" fill="#1b2559"/></g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
