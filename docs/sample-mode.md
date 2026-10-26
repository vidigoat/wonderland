# Sample mode

There are no API keys in this environment yet. The app must still be fully playable.

## Rule

Every place that would call a model:

1. Keep the real call (`think`, `paint`, `segment`, `transcribe`, `openWeights()`).
2. Branch on `metaSource()` or `openWeightsSource()` from `src/lib/ai/mode.ts`.
3. When the source is `"sample"`, do **not** call the network and do **not** invent a model transcript.
4. Return real engine results where the engine can run (science checks, rule steps, rival tool traces) and clearly marked stand-ins where only a model could have spoken.
5. Put `source: "live" | "sample"` on the response. When it is `"sample"`, include `notice: SAMPLE_NOTICE` from `src/lib/samples/mark.ts`. The UI must show that notice.

`"sample"` means "a key was missing." It never means "pretend Muse said this."

## What is already true

- `GET /api/status` reports `models` and `openWeights` without exposing keys. Client code reads this. It does not import `mode.ts`.
- `POST /api/session` mints a shared numeric seed locally. That is not a model call.
- `POST /api/generate` runs events through `toClientPipelineEvent` before they reach the browser. Hidden laws, answer keys, check descriptions, and measured check details are removed.
- `toPublic()` also removes `checks`. Do not pass a full `WorldSpec` into a client component.
- Browser code loads rules from `@/worlds/builtins`, never from `@/worlds` (that module imports the specs).

## Generation without a key

Match the typed concept to a hero world with obvious keywords (sql, moth, orbit, bank, fire, and the titles). Run `runAllChecks` for real and stream those pass/fail marks. The world you hand back is that hero world, with a notice that names both the sentence the person typed and the verified world they are about to enter.

If nothing matches, emit a `choose` event listing the hero worlds. Do not mint a fake law for their sentence.

## Judge, rival, voice, art

- Judge and rival: real prompts and tool loop. Sample lane uses a server-side rubric or a deterministic experiment policy whose **visible sentences are fixed and tested** so they do not contain `science.hiddenLaw`.
- Transcribe: without a key, return `{ source: "sample", text: null, notice }` and let the person type. Do not transcribe silence into made-up words.
- Art: without a key, serve files in `public/art/<worldId>/` and label them sample art. With a key, `paint` → `segment` → decode → store.

## Hero worlds

Gatekeeper, Peppered Forest, Newton's Cannon, Rumour Town, and The Firebreak all run with every API down. Their checks must keep passing on every seed.
