# Wonderland design system

**Black and white. Colour comes only from the worlds.** The interface is a quiet frame; the living world inside it is the only thing in colour. This is how Cursor, Vercel and Linear read as premium, and it lets each world's art carry the emotion.

## Tokens
| Role | Value |
|---|---|
| Page | `#000000` |
| Surface (cards, notebook, windows) | `#0a0a0a` |
| Hairline | `rgba(255,255,255,0.08–0.14)` |
| Text | `#fafafa` |
| Secondary text | `#a3a3a3` |
| Tertiary text | `#737373` |
| Primary action | white button, black text (shadcn `Button` default in `.dark`) |
| You / Ada in data | You = white, bold. Ada = grey. Never a hue. |

Defined in `src/app/night.css` (`--wl-*`, play screen) and `src/app/bw.css` (landing, worlds page). shadcn tokens live in `src/app/globals.css`; `<html class="dark">`.

## Type
- **Geist** for everything (`--font-geist-sans`), **Geist Mono** only for small technical labels (step numbers, URLs, the build clock).
- Headlines: weight 600, tight tracking (`-0.045em` to `-0.055em`), line-height ≈ 1.
- Sentence case everywhere. **No all-caps tracked labels.** No serif, no italics.

## Components
Use shadcn/ui from `src/components/ui`: `Button`, `Input`, `Badge`, `Card`, `Separator`. Icons from `lucide-react`, stroke 1.5. Don't hand-roll buttons.

## Radius
14–16px for windows, cards and panels; 999px for pills and chips; 8–10px for buttons inside fields.

## Motion
One orchestrated entrance on the landing (blur-and-rise, staggered). The fireflies drift and slowly synchronise. Everything else moves only in response to the player. Respect `prefers-reduced-motion`.

## Logos
Real marks only: Meta, Next.js and Vercel from Simple Icons (`public/logos`), shown inverted to white. Partners without a mark in Simple Icons (Baseten, Fireworks AI) appear as wordmarks set in Geist.

## Gotcha
Never add unlayered element resets (`button {…}`, `a {…}`) to `globals.css`. Unlayered rules beat every Tailwind/shadcn utility and silently strip component styles. Tailwind preflight already resets these inside `@layer base`.
