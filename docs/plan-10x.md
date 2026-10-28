# Wonderland, 10x: the plan to win

Written Wed 28 Oct 2026, 4:15 PM IST. Build freeze: **Mon 2 Nov, 7:30 AM IST** (about 111 hours from now). Deadline: Thu 5 Nov, 7:30 AM IST.

## What the judges score
From the participant guide (`docs/research/01-official-guide.md`):
- Pass/fail first: the project fits a theme and genuinely uses Meta's models.
- Then 0–10 per field: **Impact 30% · Meta tooling 25% · Demo 25% · Technical depth 20%.**
  - Tooling: "go beyond a basic integration… surface capabilities that surprised even us."
  - Demo: "working, impressive… holds up live… video genuinely cool to watch."
- Judges look at the video, the code and the live product.
- The top 5 per track go to live finals, ranked on the same rubric.
- Stackable bonus prizes:
  - Most Viral on X ($20K)
  - Best Build on Meta Open Weights ($10K)
  - Community Vote ($10K)
  - Best Agentic ($5K)
  - Best Creative with Muse Image ($5K)

Nothing in the rules asks for user studies.

## The 10x idea, in one line
**Wonderland is a lab that builds itself and checks its own work.** You ask any "why", and a team of Meta models writes a world, tests its science, inspects its own code for cheating, *watches* its own world run, and repairs whatever it gets wrong, before you ever see it. Then the AI refuses to tell you the answer.

Today we have three of those safeguards, and they run separately:
- science checks on every seed;
- the honest-readings check (`src/agents/honesty.ts`);
- Muse Spark 1.3 watching the world (`docs/playtest-results.md`).

The 10x is to close the loop: what any of them catches goes back to the designer automatically. Then we prove the result at scale.

### Why this wins each field
| Field | Now | Target | What gets it there |
|---|---|---|---|
| Impact (30%) | 7 | 9 | **The Infinite Lab:** a curriculum's worth of phenomena run through the pipeline, with a published coverage number (`N of 30 became verified, honest, watched worlds`). PhET built about 150 simulations in 20 years; we show a library built in an afternoon, at a few cents a world. That's impact you can measure without a user study. |
| Meta tooling (25%) | 8 | 9.5 | **A model that watches its own world and fixes it.** Muse Spark 1.3 vision sits inside the repair loop. **SAM 3.1 becomes a measuring instrument:** it counts the figures in the rendered frames and checks that the picture agrees with the numbers. Five Meta models doing distinct jobs, with reasoning on open weights. |
| Demo (25%) | 7.5 | 9 | A live link that holds up. A build screen worth watching: the law redacted, the painting arriving, SAM cutting sprites out, Spark watching, a repair happening on screen. And one honest, dramatic story for the video: *"our AI faked its science; here's how it catches itself now."* |
| Technical depth (20%) | 8.5 | 9.5 | Four independent gates (numbers, code, picture, pixel counts), a sandbox, a SAM mask decoder, published pass rates and costs, and every claim reproducible from `pnpm verify-worlds` and `pnpm eval`. |

That's a weighted **≈ 9.1**. Reaching 9.5 also needs an outstanding video, which only Vidit can record. No plan can promise 9.5; this one makes it reachable.

## Build window: four workstreams, in order

### 1 · Close the loop: worlds that repair what Spark sees (about 1 day)
- On the build screen, the browser already runs the new world and posts frames to `/api/playtest`. Make the build wait for that verdict.
  - If the verdict is a concern, the server sends Spark's notes (law included; they never reach the browser) back to the designer as a repair round.
  - The repaired world is checked again by all gates, then watched again. At most 2 vision repairs.
- Shown on the build screen as steps:
  - "Spark watched it: the picture didn't show what the numbers said. Repairing."
  - Then: "Watched again: looks right."
- Capture more of the run: 4 frames per run instead of 3, and a short strip so stills can show flashing.
- Record every repair the loop makes (before and after) in `data/playtests/` and summarise it in the README.

### 2 · SAM 3.1 as a measuring instrument (about half a day)
- For population and bodies worlds, ask SAM 3.1 to segment the entity phrase (`segmentPrompt`) in the captured frames and count the masks.
- Compare the count with the simulation's reading at that frame ("hares alive 112"). Where they disagree beyond a tolerance, the picture is lying about the numbers: treat it as a concern and send it to the repair loop.
- About $0.0025 per frame. Shown on the build screen as "SAM 3.1 counted 108 hares in the picture; the world says 112. ✓".

### 3 · The Infinite Lab (about 1 day, mostly unattended runs)
- A fixed list of 30 phenomena drawn from a real middle-school science curriculum (physical, life, earth and space science, plus 3 everyday-economics ones). It lives in `scripts/lab-questions.ts`, chosen before any run so it can't be cherry-picked.
- `pnpm lab` runs each through the full pipeline with all four gates, and writes `docs/lab-results.md`:
  - verified or not;
  - the failure stage;
  - repairs per gate;
  - time and cost.
- Every verified world joins the gallery. The gallery becomes **the Lab**: worlds grouped by subject, each card showing its gates (checks passed, honest readings, watched by Spark, counted by SAM).
- The README and video lead with the coverage number, whatever it turns out to be.
- **Budget:** about $0.35 per question, so about $11 for 30. This needs Vidit to raise the caps (see below).

### 4 · The demo surface (about 1 day)
- **Build screen as theatre.** The steps light up as each gate works:
  - the law shown as `███`;
  - the painting fading in;
  - SAM's cut-outs glowing;
  - Spark's verdict, and any repair it triggers.
- **Speed.** Paint while the checks run, so a world is ready sooner.
- **Visual misses:**
  - the dune slider hidden under the button;
  - Ada's readings truncated;
  - `/study` styled like the rest of the app (or removed from navigation).
- **Review the five eval worlds** (sugar, sand pile, penguins, Moon, harvest prices) and playtest them; drop any that look bad.
- **Landing section:** "It checks its own work." Four gates, with real numbers, and the faked-readings story told plainly.

## Freeze window (Mon 2 Nov → Wed 4 Nov)
- **Deploy:** Vercel, Blob for worlds and art, keys in Vercel, a shared spend ledger, and a per-visitor build limit so the public link can't drain credit. Judges get the live product, and Community Vote needs it.
- **Video:** 3 minutes, built around the self-checking build and one discovery (script in `docs/demo-script.md`, to be updated).
- **X thread** for Most Viral (counts through Nov 8): "We asked AI to build science worlds. It faked the science. So we made it catch itself." Short clips of the build and a discovery.
- **Submit;** make the repo public.

## Decision needed from Vidit
The current caps are Meta $7 (spent $1.51) and Baseten $5 (spent $4.20, stop line $4.30). Workstreams 1–3 need about **$15–20 more of model credit**, on Meta or Baseten:
- the Lab run: about $11;
- vision repairs and SAM counts: about $3;
- re-runs: about $3.

Without it, the Lab shrinks to about 10 questions and the README says so.
