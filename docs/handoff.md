# Handoff

Wonderland plays without API keys. The hidden law never reaches the browser. This note is the stop line for the seven-hour push: what a demo can rely on, how to turn the models on, and what still breaks a showing.

## What works with no keys

Five hero worlds run on the seeded engine. Science checks pass on every seed they declare. The play loop is predict, experiment, hypothesise, transfer, receipt. Knobs stay locked until the first guess is written down. The stage names what changed and does not say why. The card keeps the player's words and says the law is not printed.

- **The Gatekeeper's Ledger.** Real SQLite. `O'Brien` stops the scribe and marks the broken word. A quote attack opens the vault. The scroll is the one you send; it does not hide the scribe, the vault, or their names. Sealed scrolls keep the words as data.
- **Peppered Forest.** Soot recolours the bark at once. Birds eat high-contrast moths. One generation darkens the wings. Turning the birds off removes the hunter before the next run. Birdless drift does not announce a colour change.
- **Newton's Cannon.** The pale arc is the next shot. Speed 1 draws a ring and the stage says it has not come down. The ball stays in front of that preview. Set the scene again clears the ring and puts the ball back in the cannon.
- **Rumour Town.** The bank is on the square. A run boards the door. Insurance keeps it open when the toggle is actually on. Speech is spread across the cobbles.
- **The Firebreak.** The strip is planted when the knob is on, before the burn. A dense planting reaches the far ridge. The strip stops the fire. Margins are hills; trees and sparks are only inside the valley.
- **Landing.** The concept box streams a labeled sample match, lights one station at a time, and shows a check count with no check text. Enter opens that hero world.
- **Judge and voice.** Sample replies do not contain the hidden law (tested). With no key, Hold to speak leaves the typed sentence and says no words came back.

## What is sample-only

A missing key never becomes a made-up model result. `source` is `"sample"` and the page shows `SAMPLE_NOTICE`.

| Call | Sample behaviour |
|---|---|
| `POST /api/generate` | Keyword match to a hero, real `runAllChecks`, or a choice of the five heroes. The notice says the model did not write the world. |
| `POST /api/judge` | Fixed rubric. Warmer replies can pencil knob values. Discovered replies do not include the law. |
| `POST /api/rival` | Ada changes one knob at a time on the real engine. Her sentences are the sample script. |
| `POST /api/citizens` | No citizen lines. The deterministic brain runs the town. Checks never send citizen overrides. |
| `POST /api/transcribe` | `{ source: "sample", text: null, notice }`. |
| Art | Files in `public/art/<worldId>/`. They are not Muse Image output. |

`POST /api/grade` and `POST /api/session` are local. They are not model calls. Grade returns `{ correct }` and never the answer key.

## Switch on real models

1. `cp .env.example .env.local`
2. Set `MODEL_API_KEY` for Muse Wonder, Spark, Image, SAM, and Transcribe (`META_BASE_URL` only if the default `https://api.meta.ai/v1` is wrong).
3. For Ada and Rumour Town citizens, either:
   - leave `OPEN_WEIGHTS_PROVIDER=fireworks` and set `FIREWORKS_API_KEY`, or
   - set `OPEN_WEIGHTS_PROVIDER=baseten` and `BASETEN_API_KEY`.
4. Restart the server. `GET /api/status` returns `{ models: "live", openWeights: "live", notice: null }` when both lanes are live. A missing key keeps that lane on `"sample"` and the ribbon stays up.
5. `pnpm smoke` for one live call each. `pnpm spike` for the ten-concept fraction. Write that fraction in `docs/spike-results.md`. Do not invent it.
6. The same buttons call the models. Sample text is not reused as a live result.

## Known issues, by demo impact

1. **Nothing is deployed.** `docs/demo-script.md` has not been run three times on a public URL. There is no `v0.1-7h` tag. That tag waits on a URL worth pointing at.
2. **No `MODEL_API_KEY`.** The concept box cannot write a new world. It matches a hero or offers the shelf. Judge, voice, and generated art stay on the sample lane.
3. **No open-weights key.** Ada does not think on Glimmer or Spark Open. Town citizens do not speak from that model. The deterministic brain still runs, and the checks use only that brain.
4. **The spike did not run.** `docs/spike-results.md` has no fraction. Do not fill one in without `pnpm spike`.
5. **The sample judge is a keyword rubric.** It is tested not to leak the law. It is not Muse Spark, and a live judge still has to be watched for leaks.
6. **The receipt painting is taller than a phone.** The line "The law is not printed on this card." is in the notebook header. Before, after, and the time sit in the painting and need a scroll on a short window.
7. **A slow cannon shot's preview is a short fall beside the mountain.** It is easy to miss next to the barrel. Raising the speed lengthens the arc.
8. **Headless Chrome does not hydrate this app.** Pixi needs a headed browser. `--headless=new` stays on "The world is settling."
