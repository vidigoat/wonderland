# Wonderland — Design

## Why
- **AI is eroding learning.** In an RCT with 52 engineers, the AI-assisted group scored 50% vs 67% on understanding (17 points lower, d = 0.74); full delegation was worst, engaged use preserved learning ([Shen & Tamkin 2026](https://arxiv.org/abs/2601.20245), [Anthropic write-up](https://www.anthropic.com/research/AI-assistance-coding-skills)).
- **AI is breaking apprenticeship.** Entry-level automation can lower growth by cutting novices off from tacit expertise ([arXiv 2507.16078](https://arxiv.org/abs/2507.16078)).
- **Discovery beats explanation.** Problem-solving before instruction ≈ 2× the effect of a year with a good teacher, up to 3× done well (Sinha & Kapur 2021, 53 studies). Lecture-only students are 1.5× more likely to fail (Freeman et al. 2014, PNAS).
- **Great simulations work but are scarce.** A PhET sim takes months and 10–20k LOC; ~150 exist.
- **Meta's mission fit.** Zuckerberg's "personal superintelligence" letter: not "automating all valuable work" but helping people "grow to become the person you aspire to be."

**Wonderland is AI that builds the world, not the answer.**

## The four moments (the demo is built around these)
1. **The build** — type a concept; watch agents work: law found (redacted ███), art painted, SAM 3.1 cutting sprites out with glowing masks, checks ticking ✅.
2. **The aha** — you predict, it fails, you poke, it clicks. The vault swings open because *you* figured it out.
3. **The race** — Ada, the AI rival on Meta open weights, thinks aloud a step behind you… then ahead.
4. **The proof** — new situation, same law, you pass. Receipt: predictions 30% → 90%.

## Goals
- Any concept that fits 4 archetypes (pipeline, population, bodies, field) → verified world in ~2 min.
- Hero worlds are gorgeous and work offline (no API needed).
- Every Meta model does load-bearing work (see table below).
- Measurable learning (receipt + a small user study).

## Non-goals
3D. Literally any topic. Chat interface. Accounts. Teacher dashboards. Mobile-native app (responsive web is enough).

## Anti-goals (failure even if it "works")
- The AI explains the answer. • Worlds look like cheap flash games. • Scientifically wrong mechanics. • A chatbot with a skin (hackathon anti-project). • Medical/political/war/sports topics.

## Model roles
| Model | Role | Why it's not decorative |
|---|---|---|
| Muse Wonder 1.0 | Designer / orchestrator | Long-horizon structured generation + repair loop |
| Muse Spark 1.3 | Scientist, judge, video QA of playtests | Grounded reasoning; watches mp4 screen recordings |
| Muse Image 1.0 | All art | Agentic grounding (web search) for accurate depictions |
| SAM 3.1 | Sprite cutouts | Muse Image can't output transparency — SAM turns paintings into game pieces |
| Muse Voice Transcribe | Spoken hypotheses | Think-aloud is part of the learning loop |
| Muse Glimmer / Spark Open | AI rival + 40 Rumour Town citizens | Open weights via Fireworks/Baseten → $10K bonus |

## Prize map
Indie track ($150K/100K/75K/50K/25K; rubric Impact 30 · Meta tooling 25 · Demo 25 · Tech 20) + Most Viral on X $20K + Best Open Weights $10K + Community Vote $10K + Best Agentic $5K + Best Creative (Muse Image/Wonder) $5K.
