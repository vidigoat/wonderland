# Eval results

Each row is one real `pnpm eval` question, run on 28 Oct 2026 with reasoning on Muse Spark Open (Baseten) and art on Muse Image + SAM 3.1. Every world had to pass its science checks on every seed, the playability lint and the honest-readings check. Nothing here is estimated.

Ran 8 of 8. Verified 6.

| Question | Result | Stage | Seconds | Baseten USD | Meta USD |
|---|---|---|---:|---:|---:|
| Why do ants find the shortest path to food? | failed | error | 298 | 0.3897 | 0.0289 |
| Why does sugar dissolve faster in hot water? | verified | done | 322 | 0.4163 | 0.0353 |
| Why do sand piles suddenly avalanche? | verified | done | 195 | 0.2366 | 0.0100 |
| Why do penguins huddle in a rotating crowd? | verified | done | 215 | 0.2206 | 0.0300 |
| Why does the Moon always show us the same face? | verified | done | 295 | 0.1690 | 0.1300 |
| Why do prices rise when a harvest fails? | verified | done | 188 | 0.1798 | 0.0700 |
| Why do rumours spread faster than corrections? | verified, not saved | error | 248 | 0.1569 | 0.1600 |
| Why do schools of fish swirl in a circle? | failed | error | 296 | 0.3562 | 0.0000 |

Failed, and not re-run in this pass:

- Why do ants find the shortest path to food? — error: Couldn't produce a world that passes its science checks and playability lint. Try rephrasing the concept.
- Why do schools of fish swirl in a circle? — error: Couldn't produce a world that passes its science checks and playability lint. Try rephrasing the concept.

The rumour world passed every gate, then failed to save: its sprite files were named after entity ids with underscores (`rumour_spreader`), which the art URL pattern did not allow. The pattern now allows underscores, and a test covers it.

The five saved worlds wait in `data/eval-worlds/` for a review and a playtest before they join the gallery.

Median time for the six verified: about 4 minutes (232 seconds). Median model cost per verified world: $0.28 (Baseten reasoning plus Meta art).
