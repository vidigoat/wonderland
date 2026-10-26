# Architecture

```
concept ──► /api/generate (SSE) ──► agents/pipeline.ts
                                     1 scientist  (Spark 1.3)  → law, misconceptions, archetype, checks
                                     2 designer   (Wonder 1.0) → WorldSpec + JS rules
                                     3 checker    (engine, node:vm, multi-seed) → pass/fail
                                     4 repair ≤3  (Wonder)     ← failures
                                     5 artist     (Muse Image → SAM 3.1 → PNG sprites)
                                     6 playtester (open weights) → winnable?
                                     ──► stored spec + art ──► /w/<id>

/w/<id>  (browser)
  Stage (PixiJS) ◄── rules.view(state)       WorldSession (engine/runtime.ts) runs builtin rules in-browser;
  Play loop UI   ◄── observations            AI-written rules run in a Web Worker (never main thread)
  Rival panel    ◄── /api/rival  (Glimmer/Spark Open, tools over runHeadless on the server)
  Hypothesis     ──► /api/transcribe (Voice) ──► /api/judge (Spark) → discovered | warmer | colder
```

## Key contracts
- **`WorldSpec`** (`src/engine/spec.ts`): the only thing the AI writes. Validated with zod. `toPublic()` strips `science`, `answerKey`s.
- **`RulesModule`** (`src/engine/rules.ts`): `init / step / observe / view`. Pure, deterministic given `(seed, params)`, JSON state. Only the seeded `rng` — `Math.random` throws.
- **Checks** (`src/engine/checks.ts`): assertions over observables (`gt lt eq approx trendUp trendDown flat`), must pass on **every** seed.
- **View shapes** by archetype (renderer input): `population {agents[{id,x,y,tint,sprite,bubble?}]}`, `bodies {planet, ball, trail}`, `pipeline {stages, query, rows, error}`, `field {grid,w,h}` — x/y normalised to [0,1] (bodies in planet radii).

## Providers (all OpenAI-wire-compatible, one SDK)
- Meta Model API `https://api.meta.ai/v1` (Responses + Chat Completions), key `MODEL_API_KEY`.
- Fireworks (Glimmer) `https://api.fireworks.ai/inference/v1`.
- Baseten (Spark Open) model `meta-models/muse-spark-open-1026` — **not** `muse-spark-open`.

## Costs (pay-as-you-go)
Wonder $4/$20 per 1M · Spark 1.3 $1.25/$4.25 · Image $0.01/img · SAM $2.50/1k images · Transcribe $0.18/h. ≈ $0.75 per generated world.
Rate limits are per team: Spark/Wonder 3,000 RPM; Image 150 RPM.

## Docs
Models https://dev.meta.ai/docs/models · Quickstart /docs/quickstart · Images /docs/image-generation · SAM /docs/media-segmentation, /docs/sam/reading-segmentation · Speech /docs/speech-to-text · Video /docs/video-understanding · Pricing /docs/pricing-rate-limits
