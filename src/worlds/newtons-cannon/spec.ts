import type { WorldSpec } from "@/engine/spec";

export const newtonsCannonSpec: WorldSpec = {
  id: "newtons-cannon",
  version: 1,
  concept: "How do orbits work?",
  title: "Newton's Cannon",
  tagline: "Fire hard enough and the ball never comes down.",
  archetype: "bodies",
  science: {
    hiddenLaw:
      "An orbit is continuous free fall: with enough horizontal speed the planet's surface curves away as fast as the object falls (circular speed √(GM/r)); below it you land, above √2× it you escape.",
    plainStatement: "Orbiting is falling sideways fast enough to keep missing the ground.",
    misconceptions: ["There's no gravity in orbit.", "Satellites need engines to stay up.", "Heavier balls fall faster/orbit differently."],
    sources: [{ title: "Newton, A Treatise of the System of the World (1728) — the cannonball thought experiment", url: "https://en.wikipedia.org/wiki/Newton%27s_cannonball" }],
  },
  story: {
    setting: "A cannon on top of an impossibly tall mountain on a small round planet.",
    mystery: "Every shot lands further away. Is there a speed where it never lands?",
    goal: "Make the ball circle the planet — then explain why the astronauts on the ISS feel weightless.",
  },
  knobs: [{ id: "speed", label: "Launch speed", kind: "slider", min: 0.1, max: 1.6, step: 0.01, default: 0.5 }],
  observables: [
    { id: "altitude", label: "Altitude", display: "series" },
    { id: "laps", label: "Laps around the planet", display: "counter" },
    { id: "status", label: "Status", display: "text" },
  ],
  entities: [
    { id: "cannon", label: "Brass cannon", artPrompt: "an ornate brass cannon on a rocky peak, side view, vintage engraving style, plain flat dark navy background", segmentPrompt: "cannon" },
    { id: "planet", label: "Small planet", artPrompt: "a small round blue-green planet seen from space, vintage engraving style, plain flat dark navy background", segmentPrompt: "planet" },
  ],
  rules: { kind: "builtin", module: "newtons-cannon" },
  predictions: [
    {
      id: "faster",
      prompt: "You keep firing faster. What eventually happens?",
      options: ["It always lands, just further away", "It falls around the planet forever", "It flies off in a straight line"],
      answerKey: 1,
      tryWith: { speed: 1.0 },
    },
  ],
  transfer: {
    setup: "An astronaut floats inside the ISS, 400 km up, where gravity is still ~90% as strong as on the ground.",
    params: { speed: 1.0 },
    question: "Why does the astronaut float?",
    options: ["There's no gravity in space", "They and the station are falling together around Earth", "The station's engines cancel gravity"],
    answerKey: 1,
  },
  checks: [
    { id: "slow-lands", description: "A slow shot lands", params: { speed: 0.5 }, steps: 400, seeds: [1], assert: { observable: "status", op: "eq", value: "landed" } },
    { id: "circular-orbits", description: "Circular speed completes a lap without landing", params: { speed: 0.99 }, steps: 400, seeds: [1], assert: { observable: "laps", op: "gt", value: 1 } },
    { id: "escape", description: "Above escape speed the ball leaves", params: { speed: 1.5 }, steps: 3000, seeds: [1], assert: { observable: "status", op: "eq", value: "escaped" } },
  ],
  art: { style: "vintage scientific engraving, navy and brass, fine linework", background: "a deep navy starfield seen from space, fine engraved stars and faint nebula linework, empty centre, no planets, no moons, vintage scientific engraving style" },
};
