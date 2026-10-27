<p align="center">
  <img src="public/brand/wonderland-mark.svg" width="88" alt="Wonderland logo: a doorway with a light inside" />
</p>

<h1 align="center">Wonderland</h1>

<p align="center"><b>Don't ask AI for the answer. Ask it for a world.</b></p>

<p align="center">
  Type any <i>why</i> question. Wonderland builds a small living world where the answer is secretly at work,<br />
  checks it against real science, and lets you discover it yourself, while an AI scientist races you to it.
</p>

<p align="center">
  <img alt="Meta Muse Spark Open" src="https://img.shields.io/badge/Muse%20Spark%20Open-reasoning%20%C2%B7%20Ada%20%C2%B7%20judge%20%C2%B7%2040%20citizens-0866FF?style=flat-square&logo=meta&logoColor=white" />
  <img alt="Muse Image + SAM 3.1" src="https://img.shields.io/badge/Muse%20Image%20%2B%20SAM%203.1-every%20world%20painted-0866FF?style=flat-square&logo=meta&logoColor=white" />
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-225%20passing-2ea44f?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" />
</p>

<p align="center">
  <img src="docs/readme/banner.webp" alt="The Wonderland landing page: the headline over a drifting wall of the worlds' paintings" width="100%" />
</p>

---

**Built for the [Meta Global AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) (Oct 26 – Nov 4, 2026) · Indie Developer track · solo.** Everything in this repository was written during the hackathon; see the commit history.

## Contents

- [The idea in thirty seconds](#the-idea-in-thirty-seconds)
- [Why this matters](#why-this-matters)
- [How it plays](#how-it-plays)
- [The worlds](#the-worlds)
- [Under the hood](#under-the-hood)
  - [A team of Meta models](#a-team-of-meta-models)
  - [How a world is built and verified](#how-a-world-is-built-and-verified)
  - [How a world is painted](#how-a-world-is-painted)
  - [The hidden law stays hidden until you find it](#the-hidden-law-stays-hidden-until-you-find-it)
  - [Running AI-written code safely](#running-ai-written-code-safely)
  - [A hard ceiling on spend](#a-hard-ceiling-on-spend)
- [Run it yourself](#run-it-yourself)
- [Repository map](#repository-map)
- [Design](#design)
- [What's next](#whats-next)

## The idea in thirty seconds

<p align="center">
  <img src="docs/readme/try-it.gif" alt="The landing page's playable demo: predict what one false rumour does to a healthy bank, watch it collapse, then find the one change that saves it" width="100%" />
</p>

That's the landing page's playable demo, recorded as is. A perfectly healthy bank, forty neighbours, one false rumour. You predict what happens, watch the bank fall, then go looking for the one change that saves it. Keeping more cash doesn't do it. Hiding the queue doesn't do it. Guaranteeing deposits does, because nobody needs to run first. You just discovered the core of the [Diamond–Dybvig model](https://en.wikipedia.org/wiki/Diamond%E2%80%93Dybvig_model), and nobody told you.

**Every Wonderland world works that way, about anything you ask.** Ask *"Why do fireflies end up flashing in sync?"* and about two minutes later you're standing in a painted mangrove at dusk with a hundred fireflies, three controls and a hidden rule to find.

## Why this matters

> **−17 points** on a test of understanding, for people who learned a new skill with an AI assistant instead of working it out themselves.
> <sub>Randomised trial, 52 engineers. Shen &amp; Tamkin, Anthropic, 2026.</sub>

AI made answers free. Understanding still has to be earned: decades of learning research agree that what you work out yourself sticks, and what you're told fades. Answer engines skip exactly the part that makes you understand.

Wonderland keeps the AI and flips its job. **The models do the building, the science and the art. You do the thinking.** The hidden law never reaches your screen, or even your browser's network traffic, until a judge agrees you've found it. Then, and only then, you get it in plain words. It is never printed on the card you share.

Great interactive simulations exist ([PhET](https://phet.colorado.edu/), [Explorable Explanations](https://explorabl.es/)), but each one takes experts weeks. Wonderland makes a new one, verified, in about two minutes, for any question a learner actually has.

**Who it's for:** learners who want to understand rather than just know; teachers who'd rather send a class a world than a worksheet (everyone gets the same link and the same law, and each student keeps a card showing how long it took); and anyone with a question they've wondered about for years.

## How it plays

| | |
|:--|:--|
| <img src="public/landing/step-ask.webp" alt="The question box" /> | <img src="public/landing/step-build.webp" alt="The build screen" /> |
| **1. Ask why anything works.** Bank runs, camouflage, orbits, SQL injection, traffic jams. Any question about how something works is the seed of a world. | **2. Watch it get built, and checked.** Muse Spark Open finds the real law, designs a world around it and writes its rules as code. The code is run on every seed against the science; the law is shown only as `███`. |
| <img src="public/landing/step-play.webp" alt="Peppered Forest: soot on the bark, pale moths standing out" /> | <img src="public/landing/step-prove.webp" alt="A new situation the player has to predict" /> |
| **3. Experiment until you see it.** Predict, change one thing, run it again. Ada, an AI scientist on the same world, is racing you, and she only moves after you do. | **4. Say it, then prove it.** Put the law into words, typed or spoken. A judge model tells you how close you are without ever saying the answer. Then a situation you haven't seen tests whether you really understood. |

At the end the law you found is shown in plain words (*"What you discovered"*), and you keep a card, shareable with its own preview image, showing your prediction before and after and how long the discovery took. The law itself is not on the card, so sharing it never spoils the world for anyone else.

Every screen says where you are: a bar across the top shows **what you're finding out** and the four steps (Predict, Experiment, Explain, Prove); the panel shows only the current step with a plain instruction written for that world; readings appear **on the stage**, where you're looking (Rumour Town shows the cash in the vault as coins draining away). Ada's notes stay folded until you've proved the law yourself, so she can never give it away.

## The worlds

**Five worlds were built by hand** to set the bar. **Every other world was written, verified and painted by Meta's models on their own**, from a single typed question, and saved only because its science passed on every seed.

| World | The question | What's really running |
|---|---|---|
| **The Gatekeeper's Ledger** | Why does SQL injection work? | A real SQLite engine ([sql.js](https://sql.js.org)) in your browser. The exploit is real, and sandboxed. |
| **Peppered Forest** | How does natural selection make camouflage? | Heritable variation and selective predation over generations; soot changes the bark. |
| **Newton's Cannon** | How do orbits work? | Velocity-Verlet gravity. Fire fast enough and you never land. |
| **Rumour Town** | Why do bank runs happen to healthy banks? | Diamond–Dybvig, with forty citizens whose words are written by Muse Spark Open each round. |
| **The Firebreak** | Why does one spark sometimes take the whole valley? | Site percolation on a grid: fire crosses only when the trees connect. |
| *The Meadow That Blinks As One* | Why do fireflies flash in sync? | Coupled oscillators (Kuramoto; Mirollo & Strogatz). **Written by Muse Spark Open.** |
| *The Valley of the Endless Chase* | Why do predator and prey populations cycle? | Lotka–Volterra dynamics. **Written by Muse Spark Open.** |
| *Ghost Jam Circuit* | Why do traffic jams appear out of nowhere? | Car following on a ring road, after Sugiyama et al. (2008). **Written by Muse Spark Open.** |
| *Hallway Lanes* | Why do crowds form lanes? | The social-force model of pedestrians (Helbing & Molnár). **Written by Muse Spark Open.** |
| *The Ember Plate* | How does heat spread through metal? | Fourier's law: the heat equation on a grid. **Written by Muse Spark Open.** |
| *Marching Dunes* | Why do sand dunes move? | Wind carries sand up one face and it avalanches down the other (barchan migration). **Written by Muse Spark Open.** |
| *Murmuration Sky* | Why do starlings fly in huge flocks without crashing? | Local flocking rules (separation, alignment, cohesion). **Written live by Muse Spark Open while this README was being written.** |

<p align="center">
  <img src="docs/readme/worlds.webp" alt="All twelve worlds, as they look in the game" width="100%" />
</p>

Every painting and every creature above was made by **Muse Image** and cut out by **SAM 3.1**. The moths and townspeople are painted pale on purpose, so the game can still tint them by darkness or worry: the colour *is* the science.

## Under the hood

```mermaid
flowchart LR
  subgraph Browser
    L[Landing<br/>playable demo] --- P[Play screen]
    P --- E[World engine<br/>seeded, deterministic]
    E --- R[PixiJS renderer]
  end
  subgraph Server["Next.js 16 server"]
    G["/api/generate (streamed)"] --> PL[Build pipeline]
    J["/api/judge"]
    A["/api/rival"]
    C["/api/citizens"]
    T["/api/transcribe"]
    GR["/api/grade"]
    PL --> SB["node:vm sandbox<br/>science checks"]
    PL --> ART[Artist]
  end
  subgraph Meta["Meta models"]
    SO[(Muse Spark Open<br/>on Baseten)]
    MI[(Muse Image 1.0)]
    SAM[(SAM 3.1)]
    VT[(Muse Voice<br/>Transcribe)]
  end
  P -- question --> G
  P -- "your sentence" --> J
  P -- "Ada's turn" --> A
  P -- "a citizen round" --> C
  P -- voice --> T
  P -- prediction --> GR
  PL --> SO
  J --> SO
  A --> SO
  C --> SO
  T --> VT
  ART --> MI
  ART --> SAM
```

### A team of Meta models

| Agent | Model | What it does | Where |
|---|---|---|---|
| **Scientist** | Muse Spark Open | Finds the real law behind your question and the evidence a world must show. | `src/agents/pipeline.ts` |
| **Designer** | Muse Spark Open | Invents the world, its controls and mystery, and writes its rules as JavaScript. Repairs them when checks fail. | `src/agents/pipeline.ts` · `prompts/designer.md` |
| **Artist** | Muse Image 1.0 + SAM 3.1 | Paints the scene and each creature, then cuts every creature out by its mask. | `src/agents/artist.ts` |
| **Ada** | Muse Spark Open | An AI scientist racing you on the same world, using tools to run real experiments. You can read her reasoning. | `src/agents/rival.ts` |
| **Judge** | Muse Spark Open | Reads your explanation and says how close you are, without ever saying the law. | `src/agents/judge.ts` |
| **Citizens** | Muse Spark Open | Forty townspeople in Rumour Town, each with their own voice, all written in one batched call per round. | `src/agents/citizens.ts` |
| **Your voice** | Muse Voice Transcribe | Hold to speak your hypothesis. | `src/lib/ai/meta.ts` |

The reasoning roles run on **Muse Spark Open, Meta's open-weights model**, served by Baseten. One environment variable (`REASONING_BACKEND`) moves the scientist and designer to **Muse Spark 1.3 / Muse Wonder 1.0** on the Meta Model API instead; this build spends its Meta credit on art. Model ids live in one file: [`src/lib/ai/models.ts`](src/lib/ai/models.ts).

### How a world is built and verified

```mermaid
flowchart TD
  Q([Your question]) --> S[Scientist<br/>finds the law + the evidence<br/>it must produce]
  S --> D[Designer<br/>writes the world spec<br/>and its rules as code]
  D --> C{Science checks<br/>every check × every seed<br/>in a sandbox}
  C -- a check fails --> R[Repair<br/>the failures go back<br/>to the designer]
  R --> C
  C -- still failing after 3 repairs --> X([Not shipped])
  C -- all pass --> PL{Playability lint<br/>do the controls matter?}
  PL --> A[Artist<br/>Muse Image + SAM 3.1]
  A --> W([Saved world:<br/>yours to enter and share])
```

A world is a typed [`WorldSpec`](src/engine/spec.ts): story, controls, observables, entities, predictions, a transfer question, art direction, **and 2–12 machine-checkable science assertions** (for example *"with insurance on, the bank never collapses"* or *"average moth darkness rises with soot"*). The checks are run by [`src/engine/checks.ts`](src/engine/checks.ts) on many random seeds; a world ships only if every check holds on every seed. While it builds, the page streams each step, with the law redacted to `███`.

### How a world is painted

1. **Muse Image** paints the background and each entity on a flat contrasting background (PNG, 1600px).
2. **SAM 3.1** segments each entity from a short noun phrase. SAM's answer only arrives when streamed, as special tokens with base85-packed, range-coded masks; [`src/lib/ai/sam-parse.ts`](src/lib/ai/sam-parse.ts) decodes them (both the one-bit and the lossless predictive codings) and refuses anything non-canonical. If a long phrase finds nothing, the artist retries with shorter ones (*"person seen from above walking east"* → *"person"*).
3. The largest mask cuts a transparent sprite out of the painting ([`src/agents/artist.ts`](src/agents/artist.ts)); [`art-finish.ts`](src/agents/art-finish.ts) trims it and turns everything into small WebP files (a whole world's art is a few hundred KB).
4. The renderer swaps each drawn silhouette for its painting, keeping the science tint, and the world's share card shows its painting.

A failed painting never throws away a world whose science passed: it simply plays unpainted. `pnpm paint <world-id>` repaints any saved world.

### The hidden law stays hidden until you find it

```mermaid
flowchart LR
  subgraph ServerOnly["Server only"]
    H[science.hiddenLaw]
    K[answer keys]
    CH[checks]
    TW[suggested settings]
  end
  subgraph Browser["Sent to the browser (toPublic)"]
    ST[story, controls, rules code,<br/>art, predictions without answers,<br/>checkCount]
  end
  H -. never .-> ST
  K -. never .-> ST
```

- [`toPublic()`](src/engine/spec.ts) strips the law, the answer keys, the checks and the suggested settings before anything is sent. Predictions are graded on the server ([`/api/grade`](src/app/api/grade/route.ts)).
- The judge's reply is scanned for any 24-character slice of the hidden law and replaced if one appears ([`src/agents/judge.ts`](src/agents/judge.ts)). Error messages are redacted the same way.
- The build stream shows the law only as `███`.
- The plain-words law is returned by `/api/judge` **only** together with a `discovered` verdict, and the play screen shows it as *"What you discovered"* on the final step. Before that moment it does not exist in the browser.

### Running AI-written code safely

The designer writes each world's rules as code, so that code is treated as untrusted:

- **On the server**, rules run in a `node:vm` context ([`sandbox.server.ts`](src/engine/sandbox.server.ts)) with no `process`, `require`, `fetch`, `Buffer` or `global`; `Math.random` throws (rules must use the seeded RNG, so every run is reproducible). Each call is capped at **250 ms**, and each world has a **20 s total budget**: a world too slow to play fails its checks instead of holding the server. Long check runs yield to the event loop every 100 steps.
- **In the browser**, the same source is compiled with `Math.random` blocked.
- If the visitor closes the tab mid-build, the build still finishes and saves, since the model calls are already paid for.

### A hard ceiling on spend

Every request to Meta or Baseten passes through [`guardedFetch`](src/lib/ai/spend.ts). It refuses the call once a provider's ledger reaches its cap (`SPEND_CAP_META_USD`, `SPEND_CAP_BASETEN_USD`), records the real cost from each response's `usage`, and re-reads the ledger on every check so parallel processes can't overspend. With no keys at all, every model call takes a clearly labelled sample path and all five hand-built worlds still play.

## Run it yourself

```bash
pnpm install
cp .env.example .env.local     # add your keys (see below)
pnpm dev                       # http://localhost:3000
```

| Variable | What it does |
|---|---|
| `BASETEN_API_KEY` | Muse Spark Open on Baseten: scientist, designer, judge, Ada, citizens. |
| `MODEL_API_KEY` | Meta Model API: Muse Image, SAM 3.1, Muse Voice Transcribe (and Muse Spark / Wonder if you choose). |
| `REASONING_BACKEND` | `open-weights` keeps reasoning on Muse Spark Open even when a Meta key is present. |
| `SPEND_CAP_META_USD`, `SPEND_CAP_BASETEN_USD` | Hard caps; calls are refused beyond them. |
| `OPEN_WEIGHTS_PROVIDER` | `baseten` (default) or `fireworks`. |

| Command | |
|---|---|
| `pnpm check` | Typecheck, lint and the full test suite (225 tests, including every world's science checks). |
| `pnpm build && pnpm start` | Production build. |
| `pnpm paint <id> \| --all` | Paint saved worlds with Muse Image + SAM 3.1. |
| `pnpm smoke` | One live call to each model. |
| `pnpm spike` | Generate a batch of worlds from scratch and report how many verify. |
| `pnpm eval` | Eight fresh questions. Writes `docs/eval-results.md`. With no key it records that it did not run. |

No keys? Everything still runs: the hand-built worlds play fully and every model step is visibly marked as a sample.

## Repository map

```
src/
  app/                Next.js 16 App Router: landing, /w/[id], /gallery, /study, API routes, share images
  components/
    landing/          TryIt (the playable demo), PaintedWall, Pipeline, WorldThumb
    play/             PlayLoop (the game), AdaNote, ReceiptCard, Landing
    brand/            The logo
  engine/             WorldSpec contract, seeded RNG, runtime, science checks, sandbox, PixiJS renderers
  worlds/             The five hand-built worlds (spec + rules) and their paintings
  agents/             Pipeline, artist, judge, rival (Ada), citizens + their prompts
  lib/ai/             Model ids, clients, spend guard, SAM mask decoder
data/worlds/          Worlds written by Muse Spark Open (verified, saved as JSON)
public/art/           Every world's Muse Image paintings and SAM cut-outs
public/brand/         Logo files (SVG)
scripts/              paint-world, smoke test, generation spike, eight-question eval
docs/                 Design system, architecture notes, research
```

## Design

The interface is black, white and [Geist](https://vercel.com/font), so the only colour on screen is the worlds' own paintings. Components are [shadcn/ui](https://ui.shadcn.com); icons are [Lucide](https://lucide.dev).

<img src="public/brand/wonderland-mark.svg" width="44" align="left" alt="" />

**The mark** is a doorway with a light inside: every question is a door, and behind it is a world you find for yourself. It is drawn in code on a 32-unit grid ([`src/components/brand/Logo.tsx`](src/components/brand/Logo.tsx)); files in [`public/brand/`](public/brand). Design rules for contributors: [`docs/design/system.md`](docs/design/system.md).

<br clear="left" />

## What's next

- **Classrooms.** A teacher link that collects every student's card, so a class can see who found the law and how.
- **Faster builds.** Stream the world onto the stage while it's being painted, so the first minute is watchable.
- **Your own data.** Let a world start from a dataset or a paper, not only a question.
- **Run the study with real learners.** `/study` is built: read or play Peppered Forest, then the same four new questions. `/study/results` counts only finished replies. There are none yet.

---

<p align="center"><sub>Made by <a href="https://github.com/vidigoat">Vidit Patankar</a> for the Meta Global AI Developer Hackathon, 2026. MIT licensed.</sub></p>
