# Ideation — Oct 26, 2026 (10-min floor brainstorm, 21:58 → 22:09+ IST)

## The thesis the research hands us
- **AI is eroding human learning.** Shen & Tamkin RCT (Feb 2026, arXiv 2601.20245): AI assistance cut mastery ~17%; full delegation worst; *engaged* use preserved learning.
- **AI is breaking apprenticeship.** Ide/Talamas-style OLG model (arXiv 2507.16078): entry-level automation can lower growth by cutting novices off from experts' tacit knowledge. Stanford payroll data: 22–25 y/o in AI-exposed jobs employed 19% below peers.
- **Active learning works.** Freeman et al. 2014 PNAS (225 studies): lecture students 1.5× more likely to fail; +0.47 SD on exams.
- **Interactive sims work but are scarce.** PhET: each sim takes *months*, 10–20k LOC; only ~130–150 exist, yet 45M+ runs/yr.
- **Prior art gap:** prompt-to-game tools (Rosebud, GamED.AI) make arcade/quiz toys; "simulation depth, accurate physics/ecology, is less established."

→ Opportunity: **AI that builds the world, not the answer.**

## Self-made rubric (1–10 each, weighted to 100)
Impact 15 · Meta tooling 15 · Demo 15 · Tech depth 10 · Uniqueness among 20k 15 · Fun 10 · Bonus-prize stack 10 · Solo 9-day feasibility 10

| # | Idea | Imp | Tool | Demo | Tech | Uniq | Fun | Bonus | Feas | **Score** |
|---|------|-----|------|------|------|------|-----|-------|------|-----------|
| A | **Concept → verified playable world; you rediscover the law yourself** | 9 | 10 | 10 | 8 | 8 | 10 | 10 | 6 | **8.95** |
| B | Ghost Apprentice — master's video → hands-on coaching for tacit crafts | 9 | 9 | 9 | 8 | 8 | 8 | 7 | 6 | 8.15 |
| G | Laplace — phone video → physics law + future prediction *(vetoed)* | 8 | 9 | 9 | 9 | 8 | 6 | 8 | 7 | 8.10 |
| J | Robot learns a task from one human video | 8 | 8 | 10 | 9 | 6 | 9 | 7 | 3 | 7.60 |
| L | Relive history of science (be Kepler with Tycho's data) | 6 | 8 | 9 | 6 | 8 | 9 | 8 | 6 | 7.55 |
| C | 1,000-agent society that stress-tests an economics paper | 7 | 7 | 8 | 9 | 6 | 8 | 8 | 6 | 7.30 |
| E | Citizen-science agent swarm on real data (TESS, cell atlases) | 9 | 7 | 7 | 8 | 8 | 6 | 7 | 5 | 7.25 |
| D | Infinite cyber range with adaptive AI opponent | 8 | 6 | 8 | 8 | 6 | 9 | 6 | 7 | 7.20 |
| I | Lab-bench witness that writes reproducible protocols | 9 | 9 | 6 | 8 | 8 | 4 | 6 | 4 | 7.00 |
| F | Paper replication agent | 9 | 6 | 5 | 9 | 6 | 4 | 5 | 6 | 6.30 |
| K | Anti-cognitive-debt coding copilot | 8 | 5 | 5 | 7 | 6 | 5 | 5 | 8 | 6.10 |

L folds into A as its core mechanic (discovery, not explanation). D folds into A as the cybersecurity world type.

## Why A wins the bonus stack
- Most Viral ($20K): every generated world is a 10-second clip ("I typed CRISPR and got a game").
- Best Open Weights ($10K): Muse Glimmer (30B, Apache-2.0, vision) as the playtester / in-world NPC on Modal or Baseten.
- Community Vote ($10K): public gallery of worlds people made.
- Best Agentic ($5K): scientist → designer → artist → engineer → playtester loop that verifies itself.
- Best Creative ($5K): Muse Image art + Muse Wonder orchestration.

## Model roles (each one load-bearing)
- Muse Wonder 1.0 — orchestrator + long-horizon coder; computer use to playtest
- Muse Spark 1.3 — scientist agent (grounded mechanism + checks), vision QA on screenshots
- Muse Image 1.0 — art, characters, scenes ($0.01/img; agentic web search for accuracy)
- SAM 3.1 — cuts sprites out of Muse Image renders (Muse Image has no transparent bg!)
- Muse Voice Transcribe — think-aloud: you say your hypothesis, world tests it
- Muse Glimmer / Spark Open — playtester / NPC on partner inference (open-weights bonus)

## Stress-test of A (22:03–22:08)
- **Risk: generated games are janky.** Early Muse Wonder reviews: playable games but visual glitches, 429s. → Don't let the LLM freestyle the whole game. We hand-build a gorgeous **world runtime** (renderer + simulation kernel: agents, particles, fields, networks, state machines). The model writes a **world spec** (entities, rules/equations, a hidden law to discover, art prompts, scientific checks). Polish comes from our engine; variety comes from the model.
- **Risk: "AI for education" anti-project.** The banned item is *simple education chatbots*. A is not a chat interface at all. Pitch it as the antidote to cognitive debt (Meta's own "personal superintelligence, not automation" mission), not as an edtech chatbot.
- **Risk: scientific wrongness.** Scientist agent writes machine-checkable invariants (e.g. Mendel F2 ≈ 3:1, energy conserved, packet must traverse handshake states in order); the world only ships if the sim passes them. Gravitas (arXiv 2609.19327) does exactly this by hand: 243 checks.
- **Evidence for the core mechanic:** productive failure meta-analysis (Sinha & Kapur 2021, 53 studies): problem-solving *before* instruction ≈ 2× the effect of a year with a good teacher; up to 3× when done well. Predict-test-measure-revise loop (Gravitas).
- **Mission fit:** Zuckerberg's personal superintelligence letter explicitly rejects "automating all valuable work" in favour of helping people "grow to become the person you aspire to be."

## Magic moment
Type any idea → ~90s later you're *inside* it, the AI refuses to tell you the answer, and you discover it yourself; the world proves you did.

## Competitive check — recent Cerebral Valley winners (22:04)
- Gemini 4 Argon SF (Oct 25): 1st **LabTwin** (protocol + bench photo → verified physics twin, "re-runs to prove the fix", visual match 54→88); 2nd **Morf** (interactive 3D assemblies for students/makers).
- GPT-6 Astra NYC: 2nd **Counterfactual Worlds** (readings → teacher-guided 3D humanities worlds). Closest prior art. It's humanities and discussion-based; ours is mechanism-based, with a hidden law to discover and checked science.
- Crusoe: 1st **Etch** (one sentence → real circuit board); 2nd SPARKLETEAM ("learned one law of physics and one superstition, we measured which").
- **Pattern:** one input → a real, *verified* artifact + hard numbers on screen. Learning/sim projects DO place.

## Sharpened concept (working title: Wonderland)
1. **Type any "why/how"** (SQL injection, natural selection, orbits, bank runs, CRISPR targeting).
2. **Agent team builds a world** with a *hidden real law*: scientist (Spark 1.3) → world spec + machine-checked invariants; artist (Muse Image) → art; SAM 3.1 → cut sprites; Wonder → assembles + playtests; ships only if checks pass.
3. **You discover, the AI never tells.** Predict → act → observe → revise. Say your law out loud (Voice Transcribe); the world tests it on a *new* situation (a transfer challenge).
4. **AI rival scientist** (Muse Glimmer / Spark Open via Baseten/Modal) plays the same world beside you, thinking aloud, racing you. Hidden parameters are randomized, so neither side can memorize.
5. **Learning receipt:** prediction accuracy before vs after, shareable card + world link (Viral + Community Vote loop).

## Feasibility (22:05)
- Cost per generated world ≈ $0.75 (≈20 Muse Image @ $0.01, ≈20 SAM images @ $0.0025, a few Wonder calls). $150 credit ≈ 150+ worlds. Muse Image 150 RPM is the bottleneck, fine for a demo.
- Open-weights rival: Muse Glimmer 30B serverless on Fireworks ($0.35/$1.50 per 1M) or Muse Spark Open on Baseten (`meta-models/muse-spark-open-1026`).

## 3-minute video storyboard (draft)
- 0:00–0:12 **Hook.** "A 2026 randomized trial: people who learned with AI understood 17% less. We built the opposite." Type: *"Why does SQL injection work?"*
- 0:12–0:40 **Build montage.** The agent team on screen: scientist writes the hidden law + checks ✓, Muse Image paints, SAM 3.1 cuts sprites out live (glowing masks), Wonder assembles, playtester finds a bug and it gets fixed, "6/6 science checks passed."
- 0:40–1:30 **Play.** You're inside a database castle; inputs become characters marching into a query. You try things, predict, fail, and *discover* the quote-escape yourself. Meanwhile the AI rival thinks aloud in a side panel, a step behind you, then ahead.
- 1:30–1:50 **Prove it.** You say the law out loud; the world throws a *new* situation (a transfer challenge); you pass. Learning receipt: prediction accuracy 30% → 90%.
- 1:50–2:30 **Breadth montage.** Natural selection (moths on bark), orbits (Newton's cannon), a bank run (Glimmer-powered citizens spreading rumours), Mendel's peas. Each made in about 90 seconds.
- 2:30–2:50 **Evidence.** Mini user study: N people, "read the AI explanation" vs "play the world", transfer-test scores.
- 2:50–3:00 **Close.** "AI that builds the world, not the answer." Gallery link.

## Lesson from Snap Sim (22:05)
Snap Sim (homework problem → live 3D sim) did **not** place yesterday. Turning a problem into a simulation, on its own, isn't enough. What sets us apart has to show in the first 10 seconds: the AI *withholds* the answer, the science is *checked*, an AI rival races you, and learning is *measured*.

## Fallback if Vidit rejects A
B — Ghost Apprentice: a master craftsperson records themselves once (Spark video + Voice Transcribe + SAM 3.1 hand/tool tracking); a novice practises on camera and sees the master's "ghost hands" overlaid with step-level corrections. Thesis: AI is breaking apprenticeship (arXiv 2507.16078), so use AI to scale it.

## API quick facts (for the build)
- Base URL `https://api.meta.ai/v1`, `Authorization: Bearer $MODEL_API_KEY`, OpenAI SDK (Responses API; Chat Completions also listed). An Anthropic Messages-compatible endpoint is also listed at `https://api.meta.ai`.
- Swap models by id: `muse-wonder-1.0`, `muse-spark-1.3`, `muse-image-1.0`, `sam-3.1`, `muse-voice-transcribe-1.0`.
- Playtest by video: Spark 1.3 accepts mp4 screen recordings (no audio needed). The playtester agent records itself playing each world, and Spark *watches the recording* to catch visual bugs and check that what's on screen matches the science. SAM 3.1 output is base85 raster masks + pixel boxes, decoded with Meta's client lib (`decodeMaskToRaster`), fine for sprite cutouts.
- Viral hook: "AI is making us dumber" is already a mainstream story (Gerlich 2025, n=666; Trends in Cognitive Sciences review; Singularity Hub Jul 2026). Post: *"Everyone says AI makes us dumber. So I built an AI that refuses to give you the answer."*

## Fact-check for the hook (22:08)
Shen & Tamkin RCT (Anthropic), n=52 junior engineers: AI group quiz 50% vs no-AI 67% → **17 percentage points lower** (d=0.74, p=0.01); biggest gap on debugging; time saved ~2 min, not significant. Patterns with cognitive engagement (generate-then-comprehend 86%, conceptual inquiry 65%) preserved learning; delegation 39%. Say "17 points lower", NOT "17% lower".
- Rival feasibility: Muse Glimmer has native image understanding (~1.8B vision encoder), is built for always-on agents with many sequential tool calls and recovers from failed calls, and serves on Fireworks serverless. It can see world screenshots and act through tool calls. Set reasoning effort in the system prompt (use high).
