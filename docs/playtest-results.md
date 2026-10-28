# Playtest results

On 28 Oct 2026, Muse Spark 1.3 (Meta Model API, vision) watched each of the twelve worlds run. For each world, the browser plays one press with the starting controls and one with a control moved, and sends six frames: start, middle and end of each run. Spark judges whether the picture shows what the hidden law predicts for those settings, and whether anything looks broken. Its notes stay on the server (`data/playtests/`), because they can describe the law. The page only says whether it looked right.

Cost: about $0.009 per world, under $0.20 of Meta credit in total, including the failed first attempt and the re-runs below.

## First pass

The first attempt, on Peppered Forest, failed: Spark spent its 800-token budget reasoning about six images and never answered. With more room, it flagged that the moths hadn't changed, and it was right. The capture took frames only six steps apart, before anything had happened, and the first one before the painting had loaded. With both fixed:

| World | Verdict | What Spark saw |
|---|---|---|
| The Gatekeeper's Ledger | looked right | |
| Peppered Forest | looked right | |
| Newton's Cannon | looked right | |
| Rumour Town | looked right | |
| The Firebreak | looked right | |
| Ghost Jam Circuit | looked right | |
| Hallway Lanes | looked right | |
| The Ember Plate | looked right | |
| Murmuration Sky | looked right | |
| The Valley of the Endless Chase | **flagged** | "White shapes and fading figures look like broken art, not normal animals." |
| The Meadow That Blinks As One | **flagged** | "All six images look the same." |
| Marching Dunes | **flagged** | "The two sets look identical despite one control being changed." |

All three flags were real bugs, and none of the 256 tests had caught them:

- **The valley.** A hare born mid-run showed a blank outline until its painting loaded. Figures whose art has already arrived now wear it from their first frame.
- **The meadow.** Fireflies only changed opacity, so nothing seemed to happen. A warm halo now swells while a firefly flashes.
- **The dunes.** Every press was sized to walk the crest the same distance, so wind and dune height looked like they did nothing, which hid the law the player is meant to find. A press now runs for the same time and is capped before the dune leaves the stage.

## After the fixes

| World | Verdict |
|---|---|
| The Valley of the Endless Chase | looked right |
| Marching Dunes | looked right |
| The Meadow That Blinks As One | flagged |

The meadow is still flagged. Its last note says the swarm "ends with a single bright insect". Once the fireflies are in step, they flash together and go dark together, and a single still frame catches them between flashes. Six stills can't show flashing in step. Watching a short clip, which Spark also accepts, is the next step for worlds like this. We record it as flagged rather than overrule it.
