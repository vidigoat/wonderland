import type { RulesModule } from "@/engine/rules";

/**
 * Peppered Forest — natural selection.
 * Hidden law: no moth changes colour; differential predation on heritable variation shifts the population.
 * Model: fixed-size population, each moth has a heritable darkness in [0,1].
 * Each generation birds eat moths with probability rising with |moth - bark| contrast; survivors reproduce with small mutation.
 */
type Moth = { x: number; y: number; darkness: number; alive: boolean };
export type ForestState = { generation: number; moths: Moth[]; eatenThisGen: number };

const POP = 120;

export const pepperedForest: RulesModule<ForestState> = {
  init(params, rng) {
    const start = Number(params.startDarkness ?? 0.2);
    return {
      generation: 0,
      eatenThisGen: 0,
      moths: Array.from({ length: POP }, () => ({
        x: rng.next(),
        y: rng.next(),
        darkness: Math.min(1, Math.max(0, rng.normal(start, 0.12))),
        alive: true,
      })),
    };
  },
  step(state, params, rng) {
    const bark = Number(params.barkDarkness ?? 0.2);
    const predation = Number(params.predation ?? 0.6);
    const mutation = Number(params.mutation ?? 0.05);
    const birds = params.birds !== false;
    let eaten = 0;
    const survivors = state.moths.filter((m) => {
      const contrast = Math.abs(m.darkness - bark);
      const pEaten = birds ? predation * Math.min(1, contrast * 1.6) : 0;
      const dies = rng.chance(pEaten);
      if (dies) eaten++;
      return !dies;
    });
    const parents = survivors.length > 0 ? survivors : state.moths;
    const moths: Moth[] = Array.from({ length: POP }, () => {
      const p = rng.pick(parents);
      return {
        x: rng.next(),
        y: rng.next(),
        darkness: Math.min(1, Math.max(0, p.darkness + rng.normal(0, mutation))),
        alive: true,
      };
    });
    return { generation: state.generation + 1, moths, eatenThisGen: eaten };
  },
  observe(state) {
    const mean = state.moths.reduce((a, m) => a + m.darkness, 0) / state.moths.length;
    const darkShare = state.moths.filter((m) => m.darkness > 0.5).length / state.moths.length;
    return {
      generation: state.generation,
      meanDarkness: Number(mean.toFixed(4)),
      darkShare: Number(darkShare.toFixed(4)),
      eaten: state.eatenThisGen,
    };
  },
  view(state) {
    return { kind: "population", agents: state.moths.map((m, i) => ({ id: i, x: m.x, y: m.y, tint: m.darkness, sprite: "moth" })) };
  },
};
