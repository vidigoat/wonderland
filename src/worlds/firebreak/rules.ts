import type { RulesModule } from "@/engine/rules";

/**
 * The Firebreak — fire spread on a grid (site percolation).
 * Science lives in the server-side spec. Checks always run this deterministic model.
 * Cell codes: 0 empty, 1 tree, 2 burning, 3 ash.
 */

const W = 40;
const H = 30;
const EMPTY = 0;
const TREE = 1;
const BURNING = 2;
const ASH = 3;

export type FireState = {
  cells: number[][];
  initialTrees: number;
  ash: number;
  burning: number;
  crossed: boolean;
};

function plant(params: { density?: number | boolean | string; firebreak?: number | boolean | string }, rng: { chance: (p: number) => boolean }): FireState {
  const density = Number(params.density ?? 0.45);
  const gap = Boolean(params.firebreak);
  const cells: number[][] = [];
  let initialTrees = 0;
  let burning = 0;
  for (let y = 0; y < H; y++) {
    const row: number[] = [];
    for (let x = 0; x < W; x++) {
      const inGap = gap && x >= 18 && x <= 20;
      let cell = EMPTY;
      if (!inGap && (x === 0 || rng.chance(density))) cell = TREE;
      if (x === 0 && cell === TREE) {
        cell = BURNING;
        burning++;
      }
      if (cell === TREE || cell === BURNING) initialTrees++;
      row.push(cell);
    }
    cells.push(row);
  }
  return { cells, initialTrees, ash: 0, burning, crossed: false };
}

export const firebreak: RulesModule<FireState> = {
  init(params, rng) {
    return plant(params, rng);
  },
  step(state, params) {
    const wind = Number(params.wind ?? 0);
    const reachEast = wind >= 0.5 ? 2 : 1;
    const next = state.cells.map((row) => row.slice());
    let ash = state.ash;
    let burning = 0;
    const fronts: [number, number][] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (state.cells[y][x] === BURNING) {
          next[y][x] = ASH;
          ash++;
          fronts.push([x, y]);
        }
      }
    }
    const tryIgnite = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      if (state.cells[y][x] === TREE && next[y][x] === TREE) {
        next[y][x] = BURNING;
        burning++;
      }
    };
    for (const [x, y] of fronts) {
      tryIgnite(x - 1, y);
      tryIgnite(x, y - 1);
      tryIgnite(x, y + 1);
      for (let d = 1; d <= reachEast; d++) tryIgnite(x + d, y);
    }
    let crossed = state.crossed;
    for (let y = 0; y < H; y++) {
      const edge = next[y][W - 1];
      if (edge === BURNING || edge === ASH) crossed = true;
    }
    return { cells: next, initialTrees: state.initialTrees, ash, burning, crossed };
  },
  observe(state) {
    const share = state.initialTrees === 0 ? 0 : state.ash / state.initialTrees;
    return {
      burnedShare: Number(share.toFixed(4)),
      crossing: state.crossed ? "yes" : "no",
      stillBurning: state.burning > 0 ? "yes" : "no",
    };
  },
  view(state) {
    const grid = state.cells.map((row) =>
      row.map((c) => (c === BURNING ? 1 : c === TREE ? 0.35 : c === ASH ? 0.12 : 0)),
    );
    return { kind: "field" as const, grid, w: W, h: H };
  },
};
