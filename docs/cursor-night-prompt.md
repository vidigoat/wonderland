You are working overnight, alone, on Wonderland (`/Users/vidigoat/wonderland`), a solo entry in the Meta Global AI Developer Hackathon. Your goal: carry out `docs/plan-9.md`, workstreams W1 → W5 in that order, so the project scores 9+/10 against the judging rubric. Work until all five are done or you run out of time. Do not stop to ask questions: make a sensible call, write it down, and keep going.

## Read first, in this order
`AGENTS.md`, `docs/plan-9.md` (your task list, with acceptance criteria for each workstream), `docs/design.md`, `docs/architecture.md`, `README.md`. This is Next.js 16: read `node_modules/next/dist/docs/` before guessing any Next API (`params` is a Promise, cache components, `"use cache"`, `cacheTag`).

## Git rules (strict)
- Work directly on `main` in this checkout. **Do not create branches. Do not open pull requests. Do not make merge commits.** Never run `gh pr ...`, `git merge`, or anything that opens a PR. Pull requests email Vidit, and he does not want that.
- Small, descriptive commits, each one with `pnpm check` green (typecheck + lint + tests) before you commit. After committing, `git push origin main`. If a push is rejected, stop pushing, keep committing locally, and note it in the log. Never force-push and never merge.
- End every commit message with `Co-Authored-By: Cursor <noreply@cursor.com>`.

## Money rules (strict; the account has Vidit's real card on it)
- Every model call goes through `src/lib/ai/*`, whose guarded fetch enforces the caps in `.spend/ledger.json`. Never construct API clients elsewhere, never bypass the guard, never raise `SPEND_CAP_*`, never edit `.env.local`, never print or log keys.
- Budgets for this night, on top of what the ledger shows when you start (write the starting totals in your log):
  - W2 playtester: at most $0.60 Meta.
  - W3 eval: stop when the Baseten total reaches $4.30. Painting the new worlds: at most $1.00 Meta.
  - Everything else: no model calls, except a few single test calls (under $0.10 in total).
- Before any batch of live calls, read the ledger. If a budget would be crossed, stop that batch and write down what was left undone.

## Product rules
- The hidden law and answer keys never reach the browser: send `toPublic(spec)`, and run any model text that might contain the law through the existing scrub (see `src/app/api/judge/route.ts` and `src/agents/judge.ts`).
- Rules use the seeded `rng`; `Math.random` is forbidden in world rules.
- Do not change `src/engine/spec.ts`; store new data in side files as `plan-9.md` describes.
- **Never invent numbers.** The eval, study and play counts are real, or they say "not run yet". No seeded or simulated study responses.
- Banned topics: medical advice, politics or war, sports coaching.
- No new heavy dependencies. Charts are hand-made SVG.
- Keep the visual language of `src/app/night.css` and `src/app/land.css`. Copy is plain, short, sentence case, and tells the player what to do.

## Running and checking
- Vidit's audit server runs **`next start` on port 3126 from this folder**. `pnpm build` while it runs will crash it. Do your checking with `pnpm dev --port 3300`. When you need a production build, stop 3126 first (`lsof -ti:3126 | xargs kill -9`), run `pnpm build`, then bring it back with `nohup pnpm start --port 3126 > /tmp/wonderland-3126.log 2>&1 &`, and leave it running on the newest build at the end of the night.
- Do not touch the server on port 3124 (it serves `~/wonderland-audit`).
- Check visual work with real screenshots, not just tests. Playwright is available at `~/.claude/skills/gstack/node_modules/playwright`. Launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` so the PixiJS canvas renders. Take shots at 1440×900 and 390×844, look at them, and fix what looks wrong. Save shots in `docs/progress/night-1/` (small WebP or JPEG only).
- Add tests for new logic (number formatting, the chart data, the playtest scrub, the study storage and results maths, the suggested-question picker).

## Do not
- Deploy, make the repo public, post anywhere, or send any message.
- Rewrite working hero worlds or the landing page beyond what `plan-9.md` asks.
- Delete worlds, art, or ledger files.

## Log as you go
Keep `docs/progress/night-1.md` up to date after every workstream:
- what shipped (with commit hashes);
- what you checked and how;
- the ledger totals before and after each live batch;
- eval results;
- every judgement call you made;
- anything broken or left undone.

Vidit reads this first in the morning, so make it honest and skimmable. Finish by running `pnpm check` and `pnpm build` (with the 3126 dance above), committing, pushing to `main`, and leaving the server on 3126 running.
