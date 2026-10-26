<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Wonderland — rules for every agent

Start with `plan.md` (who owns what, hour by hour), then `docs/design.md` and `docs/architecture.md`.

- **Stay in your lane.** Only edit files your workstream owns (table in `plan.md`). Need something else? Add it to `docs/handoffs.md`.
- **The contract is `src/engine/spec.ts`.** Only the Lead changes it. Hidden law and `answerKey`s never reach the browser — always send `toPublic(spec)`.
- **Determinism.** Rules use the seeded `rng` only. `Math.random` is forbidden in world rules.
- **Science first.** A world ships only if `runAllChecks` passes on every seed. Add a check for every behaviour you rely on.
- **Meta models only** for intelligence. Use `src/lib/ai/meta.ts` / `clients.ts` — never construct API clients elsewhere, never import them into client components.
- **Green main.** Before every commit: `pnpm check` (typecheck + lint + tests). `pnpm build` before merging.
- **Next.js 16** (App Router, cache components, `params` is a Promise). Read `node_modules/next/dist/docs/` before guessing an API.
- **Secrets** live in `.env.local` only. Never log or commit keys.
- Banned topics (hackathon rules): medical advice, politics/war, sports coaching.
- Commit small, descriptive commits. Everything must be visibly built during the hackathon.
