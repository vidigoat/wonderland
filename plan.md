# Wonderland — 7-hour build plan for the agent team

> **Read first:** `README.md` → `docs/design.md` → `docs/architecture.md` → this file. Then `AGENTS.md` for house rules.
> Deadline for the whole hackathon: **Wed Nov 4, 9:00 PM EST** (Thu Nov 5, 7:30 AM IST; US clocks fall back on Sun Nov 1). This plan covers the first 7-hour push.

## The remaining schedule (set Tue Oct 27)
| Window | IST | ET | What happens |
|---|---|---|---|
| **Build** | now → **Mon Nov 2, 7:30 AM** | → Sun Nov 1, 9:00 PM | New features, the public deploy, anything that changes how the product works. |
| **Freeze + polish** | Mon Nov 2, 7:30 AM → Wed Nov 4, 7:30 PM | → Wed Nov 4, 9:00 AM | No new features. Bug fixes, copy, README, screenshots, demo video, submission form, repo goes public. |
| **Submitted** | by **Wed Nov 4, 7:30 PM** | by Wed Nov 4, 9:00 AM | Twelve hours of slack before the real deadline. |

### Build window, in order (set Tue Oct 27 evening)
1. **Generated worlds as clear as the hand-built ones.** A live chart of every reading over time under the stage; plain-word readouts that only appear once something has happened; fix crude field drawing (the dune triangle).
2. **The playtester sees the world.** After a build, the browser films the world running and Muse Spark 1.3 (vision, Meta Model API) checks the picture shows the law it claims. Shown as a build step; a failed look is reported, not hidden.
3. **Ask-anything holds up.** Ten fresh questions through the live pipeline; fix what breaks; publish the real pass rate, time and cost.
4. **Failure and waiting land well.** A question that can't become a world gets a clear answer and three that can; play a hand-built world while yours builds.
5. **Evidence people learn.** Anonymous playthrough record (first prediction right? law discovered? new case right?); Vidit runs 3-5 real players; numbers go in the README and video.

### Freeze window
Deploy (Vercel + Blob storage, keys in Vercel, shared spend ledger) for the live product and the Community Vote gallery; record the video; X thread for Most Viral; submit; repo public.

## The one-sentence product
Type any "why/how" → a team of Meta-model agents builds a **playable, scientifically verified world** with a **hidden law** → you **discover** it by predicting and experimenting (the AI never tells you) → you **prove** it on a new situation, racing an **AI rival** that runs on Meta open weights.

## What already exists (don't rebuild it)
| Area | State |
|---|---|
| `src/engine/spec.ts` | Zod `WorldSpec` — the contract. `toPublic()` strips answers. **Change only via the Lead.** |
| `src/engine/{rng,rules,runtime,checks,load}.ts` | Seeded RNG, rules interface, headless + interactive runtime, multi-seed science checks. Working. |
| `src/worlds/*` | 4 hero worlds — **Gatekeeper** (real SQLite injection), **Peppered Forest** (selection), **Newton's Cannon** (orbits), **Rumour Town** (bank run). **All 13 checks pass** (`pnpm test`). |
| `src/lib/ai/*` | Model ids, OpenAI-SDK clients for Meta / Fireworks / Baseten, wrappers `think/paint/segment/transcribe`, SAM output parser (mask decode TODO). |
| `src/agents/*` | Prompts (scientist, designer, judge, rival) + `generateWorld()` pipeline with repair loop. |
| `src/app/*` | Scaffold home, `/w/[id]` plain player, `/api/generate` (SSE), `/api/worlds`, `/api/transcribe`; `/api/judge` + `/api/rival` are 501 stubs. |
| `scripts/` | `pnpm smoke` (1 call per model), `pnpm spike` (10-concept generation eval). |

Verify before starting: `pnpm install && pnpm check && pnpm build` must be green. Keep it green — **every merge runs `pnpm check`**.

## Team & file ownership (no two agents edit the same files)
| Agent | Owns | Mission |
|---|---|---|
| **Lead / Integrator** | `src/engine/spec.ts`, `plan.md`, `docs/`, merges | Unblocks, owns the contract, merges every hour, keeps `main` green. |
| **A — Renderer** | `src/engine/render/**`, `src/components/stage/**` | Gorgeous PixiJS v8 stage for all 4 archetypes, driven by `rules.view()`. |
| **B — Play loop & UX** | `src/components/play/**`, `src/app/w/**`, `src/app/page.tsx`, `src/app/globals.css` | Predict → experiment → hypothesise → transfer → learning receipt. Landing page. Design system. |
| **C — Generator** | `src/agents/pipeline.ts`, `src/agents/prompts/{scientist,designer}.md`, `src/engine/sandbox.server.ts`, `scripts/spike-generate.ts` | Concept → verified world. Structured outputs. Sandboxed rules. Run the spike. |
| **D — Art pipeline** | `src/agents/artist.ts`, `src/lib/ai/sam-parse.ts`, `src/lib/storage/**` | Muse Image renders → SAM 3.1 cutouts → transparent sprites + backgrounds, one consistent style per world. |
| **E — Rival, judge & voice** | `src/app/api/{rival,judge,transcribe}/**`, `src/agents/{rival,judge,citizens}.ts`, `src/agents/prompts/{rival,judge}.md` | AI rival on **open weights**, never-leaks judge, voice hypotheses, Glimmer-powered Rumour Town citizens. |

If you need a file you don't own: write the request in `docs/handoffs.md` and keep going.

## Hour-by-hour

### Hour 0 — Setup & truth (everyone, 30 min, then split)
1. Lead: `cp .env.example .env.local` with the keys Vidit provides. Run **`pnpm smoke`**. Every line must be ✅ — if a request shape is wrong, fix it **in `src/lib/ai/meta.ts` only** using the docs links in that file.
2. C: kick off **`pnpm spike`** in the background immediately after smoke passes — it's the most important unknown.
3. Everyone: read `docs/design.md` §"The four moments" — that is what we are building toward.

### Hours 1–2 — Make each piece real in isolation
- **A:** `render/` with one `Stage` component + 4 archetype renderers (`population`, `bodies`, `pipeline`, `field`). Population: sprites with tint, gentle idle motion, smooth interpolation between ticks. Bodies: planet, glowing trail, ghost trajectory preview. Pipeline: the scroll physically travelling scroll → scribe → ledger → vault, with the live query typeset and the injected part highlighted. 60 fps, devicePixelRatio aware, resizes, dark-mode friendly. Use placeholder shapes until D delivers sprites (same sprite keys as `entities[].id`).
- **B:** design system (type scale, colour tokens per world from `spec.art.style`, motion). Play loop as a state machine: `intro → predict → experiment → hypothesise → (warmer/colder loop) → transfer → receipt`. Predictions are answered **before** the knobs unlock. Learning receipt = prediction accuracy before vs after + time to discovery, as a shareable card (PNG via `html-to-image` or canvas).
- **C:** give the scientist and designer **JSON-schema structured output** (`z.toJSONSchema(WorldSpec)`), move rule execution into `node:vm` with a 1 s timeout and no globals (`sandbox.server.ts`), and add a "playability lint" (every knob changes some observable; every prediction's `tryWith` produces a visible difference). Report the spike number in `docs/spike-results.md`.
- **D:** `artist.ts`: for each entity → `paint()` on a flat background → `segment()` with `segmentPrompt` → decode mask (Meta client lib) → transparent PNG; background via `paint()`. Style lock: generate one "style key" image per world and pass it as a reference to every subsequent render. Cache by hash. Store under `public/art/<worldId>/` for hero worlds; Vercel Blob (or Supabase storage) for generated worlds. Produce final art for all 4 hero worlds.
- **E:** `/api/judge` (Spark 1.3 + judge.md) with a **leak test** (verdict text must not contain the law's key phrases). `/api/rival`: tool-calling loop on `openWeights()` (Glimmer on Fireworks by default) with tools `set_knob / run / observe / hypothesise` executed via `runHeadless`; stream thoughts. Hidden params randomised per session and shared by human + rival. Voice: push-to-talk → WAV → `/api/transcribe` → judge.

### Hour 3 — First integration (Lead merges; everyone fixes their breakage)
- `/w/gatekeeper` playable end-to-end with real stage, real loop, judge working. Rival visible in a side panel.
- Demo-able checkpoint: record a 30 s screen capture and drop it in `docs/progress/`.

### Hours 4–5 — Generation goes live + polish
- **C + B:** the landing concept box calls `/api/generate`; the **build montage** UI shows each pipeline stage live: scientist's law redacted as ███, checks ticking ✅, SAM masks glowing over the paintings as sprites are cut out, playtester result. Then drops you into the new world.
- **Spike decision:** if ≥ 6/10 verified → "type anything" is the headline. If < 6 → curate: hero worlds + generate **variations** (new setting/params, same archetype) — still live, still impressive.
- **E:** Rumour Town citizens powered by Glimmer (`citizens.ts`): each round, each citizen sees its neighbours' bubbles and returns `{ worried, withdraw, says }`; batch all 40 in parallel; fall back to the deterministic brain on any error. **Checks always use the deterministic brain.**
- **A:** juice: easing, particles on discovery, screen-shake on vault opening, sound hooks (optional).
- **D:** art for every generated world within the build montage time budget (≤ 60 s for art).

### Hour 6 — Gallery, sharing, deploy
- B/E: `/gallery` of hero + generated worlds (public specs only), share links `/w/<id>`, OG images per world.
- Lead: deploy to Vercel (`vercel` CLI), env vars set, smoke the deployed URL. All 4 hero worlds must work with **every API down** (pre-rendered art, deterministic rules).

### Hour 7 — Hardening & the demo path
- Run the full demo script in `docs/demo-script.md` 3 times on the deployed URL. Fix anything that stutters.
- Everyone: delete dead code, make TODOs real or remove them, README screenshots.
- Lead: tag `v0.1-7h`, write `docs/progress/7h.md` (what works, what doesn't, what's next).

## Definition of done for this push
- [ ] `pnpm check && pnpm build` green on `main`; deployed URL live
- [ ] 4 hero worlds: real art, real stage, full loop, transfer challenge, receipt
- [ ] Concept box → verified new world live (or variations, per spike)
- [ ] AI rival on open weights racing in every world
- [ ] Judge never leaks (test proves it); voice hypotheses work
- [ ] Spike result recorded; demo script runs clean 3× in a row

## Non-negotiables
- The AI **never reveals** the hidden law. `science`, `answerKey`s, and check details never reach the browser (`toPublic`, `toClientPipelineEvent`).
- **No keys yet.** Every model call stays real and switches to clearly marked sample data (`docs/sample-mode.md`). Never pretend a sample is a model.
- Every world ships only if its **checks pass on every seed**.
- No medical advice, nothing political/war, no sports coaching (hackathon anti-project list).
- Only Meta models for intelligence (Muse Spark/Wonder/Image/SAM/Transcribe + Glimmer/Spark Open). No other LLM vendors in product code.
- Everything built during the hackathon, public repo, commit often with clear messages.
