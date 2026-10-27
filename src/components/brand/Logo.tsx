/**
 * The Wonderland mark: a world with a keyhole, and another world glowing through it.
 * A hidden law is a door; behind it is a whole world you find for yourself.
 * Same geometry as public/brand/wonderland-mark.svg.
 */
export const KEYHOLE = "M32 16.5a8.5 8.5 0 0 1 4.3 15.8l2.6 14.2a1.6 1.6 0 0 1-1.6 1.9H26.7a1.6 1.6 0 0 1-1.6-1.9l2.6-14.2A8.5 8.5 0 0 1 32 16.5Z";
export const DISC = "M32 3a29 29 0 1 1 0 58a29 29 0 1 1 0-58Z";

export function LogoMark({ size = 22, className, disc = "#fafafa" }: { size?: number; className?: string; disc?: string }) {
  // Every copy draws identical definitions, so a shared id is safe and works in server components.
  const id = "wl";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`k${id}`}>
          <path d={KEYHOLE} />
        </clipPath>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.55" stopColor="#f4875a" />
          <stop offset="1" stopColor="#c2456a" />
        </linearGradient>
      </defs>
      <path fill={disc} fillRule="evenodd" d={`${DISC}m0 13.5a8.5 8.5 0 0 0-4.3 15.8l-2.6 14.2a1.6 1.6 0 0 0 1.6 1.9h10.6a1.6 1.6 0 0 0 1.6-1.9l-2.6-14.2A8.5 8.5 0 0 0 32 16.5Z`} />
      <g clipPath={`url(#k${id})`}>
        <rect x="20" y="14" width="24" height="36" fill={`url(#s${id})`} />
        <circle cx="32" cy="27" r="3.6" fill="#fff4d6" />
        <path d="M20 41c4-3.2 7.5-4.2 11-2.6c3.6 1.6 7.4.6 13-2.6V50H20Z" fill="#2c3f8f" />
        <path d="M20 45c5-2.4 9.5-2.6 14-.8c3.4 1.3 6.4.9 10-1.2V50H20Z" fill="#1b2559" />
      </g>
    </svg>
  );
}
