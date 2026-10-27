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

## W5 · The study

`/study` assigns each visitor, with `crypto.randomUUID` kept in the URL, to read a hand-written explanation or to play Peppered Forest for six minutes. Both then answer the same four new-situation questions and one confidence mark. Replies go to `data/study/responses.jsonl`. `?test=1` goes to a separate file and is excluded. `/study/results` shows the real count, accuracy, and confidence, and says the group is too small when fewer than 10 people have finished. There are no real replies yet. None were invented.

A finished play writes one anonymous line to `data/plays/plays.jsonl`. Nothing from that file is shown on screen.

## Not done

W3. The eight fresh questions have not been run. There is no `MODEL_API_KEY` and no ledger, so no fraction, time, or cost is written. The playtester batch of 12 worlds, capped at $0.60, was not run for the same reason.

## Not started

W3, W4, W5. The rest of W2.
