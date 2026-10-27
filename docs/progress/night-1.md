# Night 1

Started Tue 27 Oct 2026, about 10:15 PM IST. This checkout had no `.spend/ledger.json` and no API keys in the environment, so no live spend was read and none was made.

## W1 · Readings and the dune

Shipped in `b377b1e`.

- A chart under the stage during Experiment, for every archetype except pipeline and every world except Rumour Town. Up to three numbers. Counts that move are drawn first. The previous run stays as a faint line on the same scale.
- The stage readout stays hidden until the first run. Tiny values print as 0, so `-0.00` is gone. Shares print as percents. Units like `m/s` and `(m/s)²` become plain words or drop out.
- The seven generated worlds now name what you can see ("Hares alive", "Hottest spot", "Traffic jams"). The designer prompt asks for the same on the next worlds, and for amounts that move during a run.
- A field that is filled under a ridge is drawn as one sand shape. A heat field is sampled smoothly. On a painting, the hard frame around that field is left off.

Checked with `pnpm check` (206 tests). Screenshots after one run, production server on port 3300, headed Chrome with SwiftShader, in `docs/progress/night-1/`:

| World | 1440×900 | 390×844 | What the picture showed |
|---|---|---|---|
| predator-prey-valley | yes | yes | 87 hares, 8 lynx. The hare line rises. |
| dune-march | yes | yes | A smooth sand pile on the painting. The crest line rises; the readout is still 0 dune widths because one run barely moves it. |
| heat-diffusion-plate | yes | yes | A soft hot spot. The lines fall. 63.9 degrees. |
| firefly-sync-kuramoto | yes | yes | 100 fireflies. Flashing together as a percent. |
| hallway-lanes | yes | yes | Lanes, 0 head-on bumps, a moving chart. The wide shot was taken while Fire was still in motion. |
| murmuration-sky | yes | yes | 61% facing the same way. |
| phantom-jam-ring-road | yes | yes | 1 jam, −3.57 metres per second, cars each hour. The wide shot was taken while Fire was still in motion. |

Dev mode on this machine never hydrated (the HMR socket failed), so the shots are from `next start`, not `pnpm dev`.

Judgement: the dune's numbers stay near zero for a short run. The chart shows the creep. I did not speed the dune up, because the checks depend on the slow rate.

## W2 · Playtester, started (`92da6c0`)

`look()` calls Muse Spark 1.3 on the Meta API with image parts. It does not go through `think()`, so an open-weights reasoning setting cannot turn the pictures into text.

`POST /api/playtest` takes a world id and 1–6 JPEG data URLs. It loads the full spec, asks whether the frames match the law and whether the picture is broken, then runs the reply through the judge's scrub. Notes are saved at `data/playtests/<worldId>.json`. With no key it returns `source: "sample"`, verdict `concern`, and the sentence "No key, so Spark did not watch this world." It does not say the world looked right.

`a4aacd5`: `/w/<id>?playtest=1` runs the world twice (starting controls, then one slider moved), grabs three JPEG frames of each, and posts them. The stage says "Looked right", "Spotted something: …", or, with no key, that Spark did not watch.

`caa7d84`: the build screen shows each painting as it arrives and each cut-out with a short glow, then runs the new world and posts the frames. Sample builds use the pictures already on the shelf. The $0.60 batch over the 12 worlds was not run. This checkout has no `MODEL_API_KEY`.

## W4 · A miss, and the wait (`15daeb4`)

A question that cannot become a world gets one sentence, three questions already on the shelf, and a button to play the closest world. Word overlap picks them. While a build runs, the clock says it usually takes 2–5 minutes, Rumour Town is there to play, and the page says the build continues if the tab is closed. When the world is ready the tab title changes and a chime plays.

## W5 · The study (`51c7aee`)

`/study` assigns each visitor, with `crypto.randomUUID` kept in the URL, to read a hand-written explanation or to play Peppered Forest for six minutes. Both then answer the same four new-situation questions and one confidence mark. Replies go to `data/study/responses.jsonl`. `?test=1` goes to a separate file and is excluded. `/study/results` shows the real count, accuracy, and confidence, and says the group is too small when fewer than 10 people have finished. There are no real replies yet. None were invented.

A finished play writes one anonymous line to `data/plays/plays.jsonl`. Nothing from that file is shown on screen.

## W3 · The eval (`74b93e9`)

`pnpm eval` is `scripts/eval-generate.ts`. Run here on Tue 27 Oct 2026, about 11:05 PM IST, with no key. It wrote `docs/eval-results.md` and exited 0. The eight questions were not sent to a model. No fraction, median time, or median cost. The README was not given a number. Failed questions were not re-run, and nothing new was painted.

The study pages are ink on the cream page. A first pass had drawn them in white, which disappeared. Checked on the production server: the read arm, the empty results table, and a question with no mechanism ("Why is the sky blue on a clear day?") which offered three shelf questions and Newton's Cannon.

The README test count was still 200. It is 223. `pnpm eval` is listed, and `/study` is described as built with no finished replies yet. A typed question, “Why does SQL injection work?”, on the production server matched The Gatekeeper’s Ledger, 4 of 4 checks, and offered Enter.

On a phone the forest drew all 120 moths, each about 19 pixels, so the flock was a field of specks. Commit `0bca0a1` draws 36 of them, keeps the bird, and holds each moth at least half a figure. A desk still draws the whole flock. `pnpm check` is 225 tests. Checked on the production server at 390 pixels wide: pale moths, dark moths, and the bird are readable on the birch.

The valley drew 111 hares and 7 lynx at about 20 pixels, so the lynx looked like more hares. Commit `3602b13` keeps every predator and draws that crowd large enough to tell apart. A firefly's brightness follows its own phase, so a dark one shrinks. Checked on the production server after one run: the meadow shows spotted lynx among the hares, and only a few fireflies are bright, which matches "flashing in step" at 2%. `pnpm check` is 226 tests.

Marching Dunes used the same short run as a fire. Commit `3cc291e`. At the default wind the crest moved a fraction of a cell, the picture sat still, and the distance read as 0. One gesture now walks the crest about 0.23 dune widths, in about ten seconds, and the shape ends further downwind. A speed of one half stays "0.5" instead of rounding to 1. The four dune checks still pass. Checked on the production server.

Murmuration Sky's readings were a formula of the knobs. Commit `8400980`. Letting time pass did not change them, and the birds did not separate or copy a heading. The flight is now real: birds keep a gap, copy neighbors, and stay with the flock. All six checks pass on seeds 1, 2 and 3. On the production server one run ends at 0 birds bumping, 17% facing the same way, and the flock spread at 15.7, with three lines on the chart.

The meadow used the same thirty steps as a short population run. Commit `202b7d4`. The fireflies had not locked: flashing in step stayed near 2%. One gesture now runs the two thousand steps the science needs. On the production server it finishes in about seven seconds at 88% flashing in step, and the chart climbs from the bottom of the frame to the top.

The valley's thirty steps were only the start of the hare boom. Commit `a9a06f9`. One gesture now runs the four hundred steps of a swing. On the production server it finishes in about twelve seconds: 112 hares, 26 lynx, the swing at 0.99, and the lynx peak 42 steps after the hares. The chart rises, falls, and the lynx line follows the hare line.

The ring road reported the jam's speed from a formula of the knobs, `-3.57` metres per second, even when the cars said otherwise. Commit `d656a88`. The speed is now the slope of the jam's own position along the ring. All five checks still pass. On the production server one run finishes in about eight seconds at `-3.79` metres per second, which is the measured slope, and the Fire button comes back.

`/api/worlds` listed only the five heroes. Commit `1a6aaa1`. It now lists all twelve playable worlds, and the body has no hidden law and no answer key. Checked on the production server. The ledger was also walked through to the receipt: the discovered sentence is the plain one, the hidden law is not on the page, and the card says the law is not printed. `pnpm check` is 227 tests.

The gallery card for Marching Dunes drew the sand as a staircase of cells. Commit `b6f45f0`. It now draws one smooth ridge, gentler on the windward side and steeper on the slip face, over the desert painting. The ember plate's hot spot is a soft glow. Checked on the production server.

The stage drew that same ridge from a few rows, so the slope was still a stair. Commit `af4317f`. The play view now blurs the ridge and keeps the crest where the sand put it. On the production server the dune is a smooth shape, gentler upwind and steeper on the slip face. `pnpm check` is 228 tests.

## Still blocked on a key

The playtester batch of 12 worlds, capped at $0.60 of Meta, was not run. There is no `MODEL_API_KEY` and no ledger in this checkout. A live `pnpm eval` would stop if the Baseten total reached $4.30. Painting new worlds stays capped at $1.00 of Meta, and was not started.
