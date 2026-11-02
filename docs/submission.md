# Submission: Wonderland

Text for the Cerebral Valley submission form. Every number here can be checked in this repository.

**Name:** Wonderland

**Tagline:** Don't ask AI for the answer. Ask it for a world.

**Track:** Indie Developer (solo)

**Live:** https://wonderland-omega-fawn.vercel.app

**Repo:** https://github.com/vidigoat/wonderland

**Video:** *(add the link after recording)*

## What it is (short)
Type any "why" question. A team of Meta models builds a small, living, painted world where the answer is secretly at work. They check the world's science on every random seed, inspect their own code for faked readings, and watch the world run with Muse Spark 1.3's eyes, repairing whatever looks wrong, all before you see it. Then you discover the law yourself: predict, experiment, say it in your own words, and prove it on a situation you haven't seen, while Ada, an AI scientist on Meta's open weights, races you to it. The AI never tells you the answer.

## Why
People who learn with an AI assistant score 17 points lower on understanding ([Shen & Tamkin, 2026](https://arxiv.org/abs/2601.20245)). Discovery beats explanation, and great interactive simulations work, but each takes experts months: [PhET](https://phet.colorado.edu/) has built about 150 in twenty years. Wonderland builds a verified one in about three minutes, for about thirty cents, for the question a learner actually has.

## What it does, with numbers
- **The Lab:** fifteen phenomena from a middle-school science curriculum, fixed before the run. 11 became verified worlds and 8 passed all four gates, three of them through the automatic repair loop (`docs/lab-results.md`).
- **Fresh questions:** 6 of 8 became verified worlds (`docs/eval-results.md`).
- **The playtester** (Muse Spark 1.3 vision) caught three real visual bugs that 256 tests had missed, and now sends what it sees back to the designer automatically (`docs/playtest-results.md`).
- **Honest readings:** we caught our own models writing readings as formulas of the sliders, a fake the science checks couldn't see. We built a check for it, and we repaired and labelled every affected world (`docs/repairs.md`).
- **28 worlds live,** 23 of them written by the models from one typed question, one of them asked in Hindi. The live site grows as visitors build.
- **Ask in any language:** the world answers in the language of the question. Asked in Hindi, the whole play, every step, button and the card you keep, is in Hindi too.
- **For teachers:** every world has a printable lesson guide matched to an NGSS middle-school standard, with the wrong ideas to listen for and questions for afterwards. A class link with a QR code needs no accounts or names, and the results page shows how many students predicted wrong at first and still got the new case right at the end.

## How we use Meta's models
| Model | Job |
|---|---|
| **Muse Spark Open** (open weights, on Baseten) | Scientist (finds the law and the evidence it must produce), designer (writes the world and its rules as code), repairer, judge (never says the law), Ada the AI rival, and forty citizens with their own words |
| **Muse Spark 1.3** (vision, Meta Model API) | The playtester: watches each new world run with a control moved and without, and judges whether the picture shows what the law predicts |
| **Muse Image 1.0** | Paints every world and every creature |
| **SAM 3.1** | Cuts every creature out of its painting (we decode its streamed, range-coded masks ourselves), and counts figures in the playtest frames as a second opinion |
| **Muse Voice Transcribe** | Hold to speak your hypothesis |

## Technical depth
- Model-written rules run in a `node:vm` sandbox (250 ms per call, 20 s per world, seeded RNG only).
- **Four gates** before a world ships: science checks on every seed, a playability lint, the honest-readings check, and Spark's eyes. Any failure goes back to the designer with notes.
- The hidden law never reaches the browser until the judge agrees you've found it.
- A shared, conditional-write spend ledger enforces hard caps across serverless instances. Fair-use limits apply on the public site.
- 283 tests. `pnpm verify-worlds`, `pnpm eval` and `pnpm lab` reproduce every claim.

## Bonus prizes this fits
- **Best Build on Meta Open Weights:** all reasoning, the judge, Ada and the citizens run on Muse Spark Open.
- **Best Agentic Use-Case:** scientist, designer, checker, playtester and repairer verify one another.
- **Best Creative Build:** every world is painted by Muse Image and cut out by SAM 3.1.
- **Community Vote:** a public gallery of worlds anyone can play, and grow.
