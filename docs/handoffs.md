# Handoffs

Requests between workstreams. Format: `- [ ] (from → to) what you need, which file, why`

## Grants for this push (Lead, 26 Oct 2026)

- [x] (Lead → B) `src/app/layout.tsx` for metadata and fonts only. `src/components/Player.tsx` may be replaced by the play loop. Keep importing rules from `@/worlds/builtins`.
- [x] (Lead → B) `src/app/gallery/**` for the public gallery.
- [x] (Lead → D) `public/art/**` for sample sprites and backgrounds. Comment each SVG `sample art: not Muse Image output`.
- [x] (Lead → C) `docs/spike-results.md` only, to record the spike. If there is no key, write that the spike did not run — do not invent a score.
- [x] (Lead → E) `src/app/api/citizens/route.ts` for Rumour Town's live brain.
- [x] (Lead → all) Read `docs/sample-mode.md`. Import `src/lib/ai/mode.ts`, `src/lib/samples/mark.ts`, `src/engine/view.ts`, `src/engine/client-event.ts`. Do not rewrite them.
- [x] (Lead → all) Do not edit `package.json`, `src/engine/spec.ts`, `src/engine/grade.ts`, `src/worlds/**`, or `src/app/api/{generate,status,session,grade}/route.ts`. Ask in your summary if you need a dependency.

## Open

- [ ] (Lead → C/D) After `saveWorld` exists, the generate route should persist full specs server-side and still stream only `toClientPipelineEvent`.
- [ ] (E → B) `readRival` in `src/components/play/http.ts` still expects `tool` to be a string. `POST /api/rival` now returns `tool` as an object: `{ name: "set_knob", id, value }` | `{ name: "run", steps }` | `{ name: "observe" }` | `{ name: "hypothesise", statement }`, with `thought`, `params`, and optional `observation` beside it. A display line can be `tool.name`. Until that parse lands, Ada's notebook treats a successful turn as unwired.
