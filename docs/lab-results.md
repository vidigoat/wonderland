# Lab results

Each row is one real `pnpm lab` question, run on 2026-10-28 with reasoning on Muse Spark Open (Baseten) and art on Muse Image + SAM 3.1. Every world had to pass its science checks on every seed, the playability lint and the honest-readings check. Nothing here is estimated.

Ran 15 of 15. Verified 11.

| Question | Result | World | Stage | Seconds | Baseten USD | Meta USD |
|---|---|---|---|---:|---:|---:|
| Why does a bouncing ball bounce a little lower every time? | failed |  | error | 213 | 0.2976 | 0.0077 |
| Why does a pendulum take the same time to swing whether you push it gently or hard? | verified | `pendulum-isochronism` | done | 194 | 0.2431 | 0.2135 |
| Why does a sound get quieter the further away you are? | verified | `whispering-field` | done | 160 | 0.2706 | 0.0293 |
| Why does a balloon rubbed on your hair stick to a wall? | verified | `clinging-balloon-world` | done | 127 | 0.1421 | 0.0189 |
| Why does ice float on water? | verified | `frozen-harbor-ice-float` | done | 207 | 0.2186 | 0.0600 |
| Why do we have seasons? | verified | `seasons-tilt-world` | done | 177 | 0.1969 | 0.0500 |
| Why does the Moon change shape over a month? | verified | `moon-phase-geometry` | done | 162 | 0.0907 | 0.1100 |
| How does the water cycle move water around the Earth? | verified | `sky-river-loop` | done | 223 | 0.1029 | 0.1900 |
| How does the greenhouse effect keep the Earth warm? | verified | `sky-furnace` | done | 196 | 0.1408 | 0.1400 |
| Why does a population grow fast and then level off? | verified | `crowded-pond` | done | 159 | 0.1764 | 0.0300 |
| How are traits passed from parents to their offspring? | verified | `mendel-pea-patch` | done | 196 | 0.1416 | 0.0700 |
| Why do species disappear when their habitat shrinks? | failed |  | error | 215 | 0.2988 | 0.0000 |
| Why do flowers and their pollinators depend on each other? | failed |  | error | 189 | 0.3157 | 0.0000 |
| Why do invasive species take over a new place so quickly? | verified | `green-tide-cove` | done | 278 | 0.3109 | 0.0500 |
| Why does a checkout queue suddenly get very long when the shop is only a little busier? | failed |  | error | 290 | 0.3663 | 0.0000 |

Failed, and not re-run in this pass:

- Why does a bouncing ball bounce a little lower every time? — error: Couldn't produce a world that passes its science checks, playability lint and honest-readings check. Try rephrasing the concept.
- Why do species disappear when their habitat shrinks? — error: Couldn't produce a world that passes its science checks, playability lint and honest-readings check. Try rephrasing the concept.
- Why do flowers and their pollinators depend on each other? — error: Couldn't produce a world that passes its science checks, playability lint and honest-readings check. Try rephrasing the concept.
- Why does a checkout queue suddenly get very long when the shop is only a little busier? — error: Couldn't produce a world that passes its science checks, playability lint and honest-readings check. Try rephrasing the concept.

## Spark's eye, and the repair loop

The 11 verified worlds were then watched by Muse Spark 1.3. Any world it flagged went back to the designer automatically, at most twice, and had to pass every gate again before it was re-watched.

| World | First watch | After the repair loop | In the gallery |
|---|---|---|---|
| `seasons-tilt-world` (Tilted Seasons) | looked right | | yes |
| `sky-furnace` (Sky Furnace) | looked right | | yes |
| `crowded-pond` (Crowded Pond) | looked right | | yes |
| `mendel-pea-patch` (The Pea Garden) | looked right | | yes |
| `green-tide-cove` (Green Tide Cove) | looked right | | yes |
| `pendulum-isochronism` (Clockmaker's Pendulum) | flagged: the bob barely seemed to move | looked right after 1 repair | yes |
| `sky-river-loop` (Sky River Loop) | flagged | looked right after 1 repair | yes |
| `frozen-harbor-ice-float` (Frozen Harbor) | flagged | looked right after 2 repairs | yes |
| `whispering-field` | flagged | still flagged after 2 repairs | held back |
| `clinging-balloon-world` | flagged: no balloon visible | still flagged after 2 repairs | held back |
| `moon-phase-geometry` | flagged: the Moon looked the same | still flagged after 2 repairs | held back |

**Of 15 curriculum questions, 11 became verified worlds and 8 passed all four gates, which puts them in the gallery.** Three of those eight got there through the automatic repair loop. The median verified world took 194 seconds. The run cost $3.31 on Baseten (reasoning) and $0.97 on Meta (art). The repair rounds added $0.74 and the watching $0.35: about $5.40 for the whole Lab. Held-back worlds stay in `data/held/`, out of the gallery.
