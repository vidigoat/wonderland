import type { WorldSpec } from "@/engine/spec";

export const firebreakSpec: WorldSpec = {
  id: "firebreak",
  version: 1,
  concept: "Why does one spark sometimes die in the trees and sometimes take the whole valley?",
  title: "The Firebreak",
  tagline: "A valley of saplings, a lightning strike, and a gap you can walk through.",
  archetype: "field",
  science: {
    hiddenLaw:
      "Fire spreads only between neighbouring trees. Below a critical planting density the clusters are finite, so a spark dies; above it a cluster spans the valley and the far ridge burns. An unbroken empty gap wider than one jump stops the fire even when the planting is dense.",
    plainStatement: "Connectivity, not the mere number of trees, decides whether a fire can cross.",
    misconceptions: [
      "A denser forest only burns a little more, in proportion.",
      "Any gap stops a fire, even a broken one.",
      "Wind is the only reason a fire travels.",
    ],
    sources: [
      { title: "Percolation theory — Wikipedia", url: "https://en.wikipedia.org/wiki/Percolation_theory" },
      { title: "Forest-fire model — Wikipedia", url: "https://en.wikipedia.org/wiki/Forest-fire_model" },
    ],
  },
  story: {
    setting: "A night valley of young trees, drawn like a woodcut. Lightning always strikes the western ridge.",
    mystery: "Last summer the fire reached the far ridge. The year before, it died within sight of the strike. The ranger swears the weather was the same.",
    goal: "Make the fire reach the far ridge. Then stop a denser planting from doing it.",
  },
  knobs: [
    { id: "density", label: "How closely the saplings are planted", kind: "slider", min: 0.05, max: 1, step: 0.05, default: 0.45 },
    { id: "firebreak", label: "Leave a clear strip through the middle", kind: "toggle", default: false },
    { id: "wind", label: "Wind toward the east", kind: "slider", min: 0, max: 1, step: 0.1, default: 0 },
  ],
  observables: [
    { id: "burnedShare", label: "Share of trees burned", display: "series" },
    { id: "crossing", label: "Far ridge", display: "text" },
    { id: "stillBurning", label: "Flames", display: "text" },
  ],
  entities: [
    { id: "tree", label: "Sapling", artPrompt: "a single young pine sapling, woodcut print, indigo and moss green, plain flat cream background", segmentPrompt: "tree" },
    { id: "flame", label: "Flame", artPrompt: "a single stylised flame, woodcut print, ember orange, plain flat cream background", segmentPrompt: "flame" },
  ],
  rules: { kind: "builtin", module: "firebreak" },
  predictions: [
    {
      id: "dense",
      prompt: "The ranger plants the valley densely, then lightning hits the western ridge. What happens?",
      options: ["The fire dies among the first trees", "The fire reaches the far ridge", "The fire burns a neat circle and stops"],
      answerKey: 1,
      tryWith: { density: 0.9, firebreak: false, wind: 0 },
    },
    {
      id: "gap",
      prompt: "Same dense planting, but an unbroken empty strip is left through the middle. Where does the fire stop?",
      options: ["It jumps the strip", "It stops at the strip", "It never starts"],
      answerKey: 1,
      tryWith: { density: 0.9, firebreak: true, wind: 1 },
    },
  ],
  transfer: {
    setup: "Market stalls stand in a grid of streets. A lantern falls at the western row.",
    params: { density: 0.9, firebreak: true, wind: 0 },
    question: "What single change to how the stalls are placed stops the fire from reaching the eastern gate, even if the stalls are packed close?",
    answerKey: "Leave one unbroken empty gap, wider than the fire can jump, all the way across the grid.",
  },
  checks: [
    {
      id: "sparse-dies",
      description: "A sparse planting does not carry the fire to the far ridge",
      params: { density: 0.2, firebreak: false, wind: 0 },
      steps: 80,
      seeds: [1, 2, 3],
      assert: { observable: "crossing", op: "eq", value: "no" },
    },
    {
      id: "sparse-share",
      description: "A sparse planting burns only a minority of the trees",
      params: { density: 0.2, firebreak: false, wind: 0 },
      steps: 80,
      seeds: [1, 2, 3],
      assert: { observable: "burnedShare", op: "lt", value: 0.45 },
    },
    {
      id: "dense-crosses",
      description: "A dense planting carries the fire to the far ridge",
      params: { density: 0.9, firebreak: false, wind: 0 },
      steps: 80,
      seeds: [1, 2, 3],
      assert: { observable: "crossing", op: "eq", value: "yes" },
    },
    {
      id: "dense-share",
      description: "A dense planting burns most of the trees",
      params: { density: 0.9, firebreak: false, wind: 0 },
      steps: 80,
      seeds: [1, 2, 3],
      assert: { observable: "burnedShare", op: "gt", value: 0.8 },
    },
    {
      id: "gap-holds",
      description: "An unbroken strip stops a dense, windy fire",
      params: { density: 0.9, firebreak: true, wind: 1 },
      steps: 80,
      seeds: [1, 2, 3],
      assert: { observable: "crossing", op: "eq", value: "no" },
    },
  ],
  art: {
    style: "nocturne woodcut, indigo ink, moss green, ember orange",
    background: "a dark valley of young pines seen from above, woodcut print, indigo night",
  },
};
