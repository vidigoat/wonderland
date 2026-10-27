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
A doorway with a light inside: every question is a door, and behind it is a world you find for yourself. Drawn in code on a 32-unit grid: `src/components/brand/Logo.tsx` (`LogoMark`, `markSvg`), mirrored in `src/app/icon.svg` (on a black tile), `public/brand/*.svg` and `src/components/brand/mark-data.ts` (server images). One colour only; never add gradients or effects to it.

## Play screen
- The goal bar is always visible: *You're finding out* + the question, and the four steps (Predict, Experiment, Explain, Prove).
- The panel shows one step at a time: a step label, one plain instruction (written per world in `src/components/play/guide.ts`), then the controls. The run button is pinned to the foot of the panel.
- Readings sit on the stage (`StageHud`), not in a list. Colour-coded worlds get a legend.
- Ada's notes and settings stay folded until the player has proved the law; before that she shows only how many experiments she has run and two readings.
- The law appears in plain words only after the judge's *discovered* verdict, on the final step.

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
