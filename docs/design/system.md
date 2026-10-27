# Wonderland design system

**Black and white. Colour comes only from the worlds.** The interface is a quiet frame; the worlds' own paintings (Muse Image, cut out by SAM 3.1) are the colour on every page: the drifting wall behind the hero, the playable demo, the world cards, the share images. Never add a UI accent colour; add more of the worlds instead.

## Tokens
| Role | Value |
|---|---|
| Page | `#000000` |
| Surface (cards, panels, windows) | `#0a0a0a`–`#0b0b0b` |
| Hairline | `rgba(255,255,255,0.08–0.14)` |
| Text | `#fafafa` |
| Secondary text | `#a3a3a3` |
| Tertiary text | `#737373` |
| Primary action | white button, black text (shadcn `Button` default in `.dark`) |
| You / Ada in data | You = white, bold. Ada = grey. Never a hue. |

Landing: `src/app/bw.css` (shared) and `src/app/land.css` (sections). Play screen: `src/app/night.css` (`--wl-*`). shadcn tokens: `src/app/globals.css`; `<html class="dark">`.

## The mark
A world with a keyhole, and another world glowing through it (sky, sun, hills). Source of truth: `src/components/brand/Logo.tsx` (`LogoMark`), mirrored in `public/brand/*.svg`, `src/app/icon.svg` and `src/components/brand/mark-data.ts` (server images). Minimum size 16px. The keyhole scene is the only gradient in the interface. Use `wonderland-mark-mono.svg` where only one colour is possible.

## Type
- **Geist** for everything, **Geist Mono** only for small technical labels (URLs, the build clock, model ids).
- Headlines: weight 600, tight tracking (`-0.04em` to `-0.055em`), line-height ≈ 1.
- Sentence case everywhere. No all-caps labels. No serif, no italics.

## Components
shadcn/ui from `src/components/ui`: `Button`, `Input`, `Badge`, `Card`, `Separator`. Icons from `lucide-react`. Don't hand-roll buttons.

## Radius
14–16px for windows, cards and panels; 999px for pills and chips; 8–12px for controls.

## Motion
One ambient motion on the landing (the painted wall drifts). Everything else moves only in response to the player. Respect `prefers-reduced-motion`.

## Copy
Say what a thing does in plain words. Name actions by what happens ("Start: make a prediction", "Run it again", "Find what saves it"). Never print the hidden law; the build shows it as `███`.

## Gotcha
Never add unlayered element resets (`button {…}`, `a {…}`) to `globals.css`. Unlayered rules beat every Tailwind/shadcn utility and silently strip component styles.
