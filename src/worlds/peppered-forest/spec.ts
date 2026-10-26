import type { WorldSpec } from "@/engine/spec";

export const pepperedForestSpec: WorldSpec = {
  id: "peppered-forest",
  version: 1,
  concept: "How does natural selection produce camouflage?",
  title: "Peppered Forest",
  tagline: "The forest turned black. The moths followed. But not one of them changed.",
  archetype: "population",
  science: {
    hiddenLaw:
      "Individuals do not change colour. Heritable variation + differential survival (birds eat high-contrast moths) shifts the population's colour distribution across generations.",
    plainStatement: "Populations evolve because some variants survive and reproduce more than others — individuals don't adapt themselves.",
    misconceptions: [
      "Moths darken themselves to hide (Lamarckian / individual adaptation).",
      "Moths 'try' or 'want' to blend in.",
      "Mutations happen because they are needed.",
    ],
    sources: [
      { title: "Cook et al. 2012, Biology Letters — selective bird predation on the peppered moth", url: "https://royalsocietypublishing.org/doi/10.1098/rsbl.2011.1136" },
    ],
  },
  story: {
    setting: "An illustrated birch forest. Moths rest on the bark by day; birds hunt by sight.",
    mystery: "Factories upwind are about to cover the bark in soot. What will the moth population look like 30 generations later — and why?",
    goal: "Explain what changes the moths, then predict what happens on snowy tundra.",
  },
  knobs: [
    { id: "barkDarkness", label: "Soot on the bark", kind: "slider", min: 0, max: 1, step: 0.05, default: 0.2 },
    { id: "predation", label: "Bird hunger", kind: "slider", min: 0, max: 1, step: 0.05, default: 0.6 },
    { id: "mutation", label: "Variation between parents and offspring", kind: "slider", min: 0, max: 0.2, step: 0.01, default: 0.05 },
    { id: "birds", label: "Birds present", kind: "toggle", default: true },
    { id: "startDarkness", label: "Starting moth colour", kind: "slider", min: 0, max: 1, step: 0.05, default: 0.2 },
  ],
  observables: [
    { id: "meanDarkness", label: "Average moth darkness", display: "series" },
    { id: "darkShare", label: "Share of dark moths", display: "series" },
    { id: "eaten", label: "Moths eaten this generation", display: "counter" },
    { id: "generation", label: "Generation", display: "counter" },
  ],
  entities: [
    { id: "moth", label: "Peppered moth", artPrompt: "a single peppered moth, wings spread, top-down, storybook gouache illustration, plain flat cream background", segmentPrompt: "moth" },
    { id: "bird", label: "Songbird", artPrompt: "a small songbird mid-swoop, side view, storybook gouache illustration, plain flat cream background", segmentPrompt: "bird" },
  ],
  rules: { kind: "builtin", module: "peppered-forest" },
  predictions: [
    {
      id: "soot",
      prompt: "Soot covers the bark. After 30 generations, what's the most accurate description?",
      options: [
        "Each moth gradually darkens itself to hide",
        "Dark moths become common because light ones get eaten before reproducing",
        "Nothing changes — moths can't sense the bark colour",
      ],
      answerKey: 1,
      tryWith: { barkDarkness: 0.9 },
    },
    {
      id: "noBirds",
      prompt: "Same soot, but no birds. What happens to average moth colour?",
      options: ["Still darkens", "Stays roughly the same", "Gets lighter"],
      answerKey: 1,
      tryWith: { barkDarkness: 0.9, birds: false },
    },
  ],
  transfer: {
    setup: "Snowy tundra. Hares range from brown to white; foxes hunt by sight. The snow arrives earlier every year.",
    params: { barkDarkness: 0.05, startDarkness: 0.7 },
    question: "What happens to the hare population over many generations, and does any single hare turn white?",
    options: ["Individual hares whiten to match", "White hares become common; no individual changes", "Hares stay brown"],
    answerKey: 1,
  },
  checks: [
    { id: "soot-darkens", description: "With soot and birds, the population darkens", params: { barkDarkness: 0.9 }, steps: 40, seeds: [1, 2, 3], assert: { observable: "meanDarkness", op: "gt", value: 0.6 } },
    { id: "no-birds-flat", description: "Without birds, there's no directional change", params: { barkDarkness: 0.9, birds: false }, steps: 40, seeds: [1, 2, 3], assert: { observable: "meanDarkness", op: "lt", value: 0.4 } },
    { id: "clean-bark-light", description: "On clean bark the population stays light", params: { barkDarkness: 0.1 }, steps: 40, seeds: [1, 2, 3], assert: { observable: "meanDarkness", op: "lt", value: 0.35 } },
  ],
  art: {
    style: "storybook gouache, muted greens and creams, soft paper texture",
    background: "a close-up of birch tree bark filling the frame, storybook gouache illustration",
  },
};
