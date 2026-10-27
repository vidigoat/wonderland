# From 6.9 to 9+ — the plan

Written Tue 27 Oct 2026, evening IST. Build freeze: **Mon 2 Nov, 7:30 AM IST**. Deadline: Wed 4 Nov, 9:00 PM EST (Thu 5 Nov, 7:30 AM IST).

## How we're judged
From the participant guide (`docs/research/01-official-guide.md`):
- Pass/fail first: does it fit a theme, and does it really use Meta's models?
- Then a 0–10 score per field: **Impact 30% · Meta tooling 25% · Demo 25% · Technical depth 20%.**
  - Tooling: "go beyond a basic integration… surface capabilities that surprised even us."
  - Demo: "working, impressive… holds up live… video genuinely cool to watch."
- Judges look at the 3-minute video, the public repo and the live product.
- The top 5 per track reach live finals.

The public Indie wording is "creativity, technical ambition, and whether it works." Recent winners shared three things: a concrete problem with stakes, **proof from real people**, and a polished product that works.

## Where we are (27 Oct)
| Field | Now | Target | What closes the gap |
|---|---|---|---|
| Impact | 6 | 9 | Measured learning from real people, against a "just read the answer" control (W5). |
| Meta tooling | 7 | 9 | A model that *looks at* the world it built (W2). The build screen shows Muse Image and SAM 3.1 at work (W2). |
| Demo | 6.5 | 9 | Worlds the models build are as readable as the hand-built ones (W1). Failing and waiting are designed (W4). Live link and video (freeze window). |
| Technical depth | 8 | 9.5 | A published pass rate on fresh questions (W3). The vision check as a verification gate (W2). |

The weighted score goes from 6.9 now to about 9.0. Reaching 9.5 also needs real-world proof that Cursor cannot build: a teacher or a group of real learners using it, plus an outstanding video.

## Workstreams, in priority order
Each workstream ships on its own, in small commits, with `pnpm check` green.

### W1 · Worlds the models build read as clearly as the hand-built ones (Demo)
Problem, seen in screenshots on 27 Oct:
- Readouts like "Hare-lynx synchrony 0" and "Upwind change −0.00" mean nothing to a judge.
- Predator–prey has no picture of the boom and bust.
- Marching Dunes draws a pixel-stepped yellow triangle on top of a painting.

Tasks:
1. **`ReadingChart`**: a live chart of up to 3 numeric observables over time, built from `session.history`.
   - Pure SVG, no new dependency, styled like `night.css`.
   - It sits under the stage in the experiment phase. Use it for every archetype except `pipeline`, and for every world except `rumour-town` (which has its own HUD).
   - **The previous run stays on the chart as a faint line**, so "change one thing, compare" can be seen. This matters most for discovery.
2. **`GenericHud`**:
   - Show nothing until the first run.
   - Format numbers sensibly: no `-0.00`; values near zero show as 0; round to the value's size; integer counts show no decimals.
   - Shares show as %.
   - Units come in plain words.
3. **Designer prompt** (`src/agents/prompts/*`): observable labels and units must be words a 12-year-old understands, and must name something visible ("Hares alive", not "Hare cycle strength"). Change the prompt, not `spec.ts`.
4. **Field drawing on painted worlds** (`src/engine/render/field.ts`): draw the field smoothly instead of as hard cells. Use bilinear smoothing, a soft contour, or a height silhouette for heightfield-like worlds, so Marching Dunes reads as a sand dune on the painting, not a bar chart.
5. **Done when** each of the 7 generated worlds (`data/worlds/*.json`), after one run:
   - shows readable numbers and a chart that visibly changes;
   - draws the painting and the field without obvious mismatch;
   - has headless screenshots at 1440×900 and 390×844 that you have looked at.

### W2 · Muse Spark 1.3 watches the world it built; the build shows the art being made (Tooling)
1. **`look()` in `src/lib/ai/meta.ts`**:
   - Call **Muse Spark 1.3 on the Meta Model API** with `input_image` parts (data URLs) and a JSON schema.
   - It must not go through `think()`: `think()` sends everything to Spark Open when `REASONING_BACKEND=open-weights`, and Spark Open's path turns image input into JSON text.
   - It must go through the existing guarded Meta client, so the spend cap applies.
2. **`/api/playtest`**: POST `{ worldId, frames: [{ dataUrl, caption }] }`, at most 6 frames, each a JPEG of 768px or less.
   - Server side, load the full spec, law included, and ask Spark 1.3 two things: whether the frames show what the law predicts for these settings, and whether anything is visually broken (an empty stage, figures off-screen, unreadable overlap).
   - Return `{ verdict: "looks-right" | "concern", notes: string[] }`. Run the reply through the same law scrub the judge uses: no slice of the law can come back.
   - Store the result in `data/playtests/<worldId>.json`. Do not change `spec.ts`.
3. **Capture in the browser**: after a build reaches `done`, the build screen (Landing `Binding`) mounts the stage, runs the world on default settings and on one changed control, and grabs 3 frames of each with Pixi's extract or `canvas.toDataURL`. It then posts them.
   - This appears as a new build step: "Playtester · Muse Spark 1.3 watched your world run", then "Looked right" or "Spotted something: <note>".
   - Never show the law.
   - `/w/[id]?playtest=1` runs the same capture, so existing worlds can be checked by script.
4. **Make the build screen show the art being made**:
   - Stream the painted background URL as soon as it's saved, and show it fading in.
   - Show each SAM 3.1 cut-out sprite popping out with a brief glowing outline (one orchestrated moment, not confetti).
   - The pipeline already saves to `public/art/<id>/` and serves it through `src/app/art/[world]/[file]/route.ts`. Add the URLs to the client-safe pipeline events.
5. **Budget**: run the playtester on all 12 worlds once, and spend at most **$0.60** of Meta credit in total. Read `.spend/ledger.json` before and after.

### W3 · "Ask anything" holds up: a real pass rate (Technical depth, Demo)
1. Extend `scripts/spike-generate.ts` (or add `scripts/eval-generate.ts` plus a `pnpm eval` script) to run a list of fresh questions through `generateWorld`. For each, record:
   - verified or failed;
   - the failure stage and reason;
   - seconds taken;
   - the cost change on the ledger, for both Baseten and Meta.

   Append the results to `docs/eval-results.md`. Never invent a number.
2. Run these 8. They are new, varied, and none duplicates an existing world:
   - Why do ants find the shortest path to food?
   - Why does sugar dissolve faster in hot water?
   - Why do sand piles suddenly avalanche?
   - Why do penguins huddle in a rotating crowd?
   - Why does the Moon always show us the same face?
   - Why do prices rise when a harvest fails?
   - Why do rumours spread faster than corrections?
   - Why do schools of fish swirl in a circle?
3. Fix the top failure modes in the prompts or the repair loop, then re-run **only the failed questions once**.
4. Keep the verified worlds and paint them (`pnpm paint <id>`). They join the gallery.
5. Put the final fraction, median time and median cost in the README. "N of 8 fresh questions became verified worlds" stays true whatever N is.
6. **Budget, hard:**
   - Baseten: stop when the ledger reaches **$4.30** (cap 4.50; it was at $2.42 on 27 Oct).
   - Meta: painting at most **$1.00**.
   - If the budget runs out, stop and write down what was left.

### W4 · Failing and waiting are designed (Demo)
1. A question that **can't become a world** gets a designed card instead of an error. This covers a banned topic, something that isn't a mechanism, or a build that failed after repairs. The card has:
   - one plain sentence on why;
   - **three questions that will work**, picked from existing worlds by word overlap;
   - a "Play <closest world>" button.
2. **While a world builds** (2–5 minutes):
   - show elapsed time and an honest range ("usually 2–5 minutes");
   - offer the 30-second Rumour Town game (`src/components/landing/TryIt.tsx`) inline;
   - play the chime (`src/components/play/chime.ts`) and change the tab title when the world is ready.
   - The build already survives a closed tab; say so on the screen.

### W5 · Evidence that people learn (Impact, the biggest weight)
1. **`/study`**: a 6-minute, anonymous comparison on **Peppered Forest**.
   - Assign each visitor at random (`crypto.randomUUID`, kept in the URL) to one of two arms:
     - **Read**: a clear, correct 150-word written explanation of natural selection, written by hand in the repo, as an AI assistant would give it;
     - **Play**: the world, Predict → Experiment → Explain, capped at 6 minutes.
   - Both arms then answer the **same 4 new-situation questions** (multiple choice, written by hand; at least two must not appear in the game's transfer cases) and one confidence question (1–5).
   - Store one JSON line per participant in `data/study/responses.jsonl`, behind a small interface so it can move to Blob later. Store nothing personal.
2. **`/study/results`** shows the real N, accuracy per arm, and confidence per arm, with an honest note when N is small.
   - **Never seed, simulate or invent responses.**
   - Add a `?test=1` flag whose responses are stored separately and excluded from results.
3. **Normal play**: record one anonymous line per finished playthrough in `data/plays/*.jsonl`: world, whether the first prediction was right, the judge verdict, whether the new case was right, and minutes. Show nothing from it on screen until there are at least 10 real lines.
4. Vidit runs 5–10 real people through `/study` before the freeze. The numbers go in the README and the video.

## Freeze window (Mon 2 Nov → Wed 4 Nov): Vidit and Claude
- **Deploy**:
  - Vercel, with Blob storage for `data/worlds`, `data/study` and `public/art`;
  - keys set in Vercel;
  - a shared spend ledger.
  - Judges get the live product, and the Community Vote gallery needs it.
- Record the **video** (`docs/demo-script.md`, updated with the study numbers and the playtester).
- An **X thread** for Most Viral, which counts engagement through Nov 8.
- Final README numbers; submit; make the repo public.

## Rules that bind every workstream
See `AGENTS.md`. In short:
- No `Math.random` in rules.
- The law never reaches the browser.
- Meta models only, through `src/lib/ai/*`.
- Spend caps are hard.
- `pnpm check` must pass before every commit.
- Commit straight to `main`: no branches, PRs or merge commits.
