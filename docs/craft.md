# Craft

Wonderland should feel like a scientific instrument bound as a storybook. Not a dashboard, not a quiz, not a purple SaaS landing page.

## Materials

- Ink `#14110e`, parchment `#f3ead7`, brass `#a56b3c`, soot `#2a2622`.
- Each world sets its own accent from `spec.art.style` on a wrapper (`data-world`):
  - gatekeeper — oxblood and gold leaf on parchment
  - peppered-forest — moss, cream, soft paper
  - newtons-cannon — navy and brass, engraved lines
  - rumour-town — warm pastel, round, lamplight
  - firebreak — indigo night, moss, ember
- Type: Fraunces (titles) and the existing Geist (UI). Mono only for the scribe's spell and for numbers.
- Motion is slow and physical. Honour `prefers-reduced-motion`. No bounce easing on text.

## Landing

One screen, before the fold on a laptop: the sentence "The AI builds the world. You find the law." A single concept field. Under it, the hero worlds as places you can already enter — each card is a tiny moving scene (moths, an orbit, a scroll, a queue, a spark), not a bordered box with a title.

If `/api/status` says `models: "sample"`, a thin ribbon uses `notice` verbatim. It is a label, not an error.

## Play

The stage fills the room. The notebook sits beside it.

Phases, in order, and the knobs stay locked until the first prediction is answered:

`intro → predict → experiment → hypothesise → (warmer / colder) → transfer → receipt`

- Intro is the mystery, in the world's voice, two or three sentences.
- Predict is a choice made before any knob moves. Record whether it was right. The person is not told the right option.
- Experiment unlocks the knobs and the stage. Running is visible on the stage, not only in a JSON dump.
- Hypothesise is a sentence, typed or spoken. Spoken audio goes to `/api/transcribe`. A sample response with `text: null` means: show the typed field, and show the notice. Do not invent words.
- The judge reply is one breath. Show `source` when it is `sample`.
- Transfer is a new situation. Then the receipt: prediction accuracy before and after, and time to discovery. It should look like a card you could keep. Draw it to a canvas for the PNG. No new dependency unless you ask the lead.

## Stage

PixiJS v8, retina-aware, resizes, 60fps when the tab is visible. Placeholder shapes are allowed until sample art exists, but they are silhouettes in the world's palette — not debug rectangles.

- Population: sprites, tint, a little idle motion, positions interpolate between ticks. Speech bubbles for Rumour Town.
- Bodies: planet, brass cannon, glowing trail, a ghost of the next few seconds of flight.
- Pipeline: the scroll travels scroll → scribe → ledger → vault. The spell is typeset. The part of the input that breaks out of the quotes is marked.
- Field: the grid is the valley, seen from above. Flames read as fire, ash as ash, trees as trees. A continuous field (values that are not those four levels) uses a smooth ink-to-gold scale.

## Build montage

Stages arrive as SSE. The hidden law is never shown; the server already redacts it. Check events are counts (`passed` / `total`), not descriptions. Sample runs say so in the notice, then drop the person into the verified world they were matched to — or offer the list, if `choose` arrives.

## Rival

Ada's notebook is on the same page, a step behind or ahead. Her thoughts are short. If she is on the sample lane, the notebook says so. She still runs real experiments through the engine.

## Do not

Explain the law after a wrong guess. Use a chatbot layout. Ship a world whose checks fail. Show sample output without the notice.
