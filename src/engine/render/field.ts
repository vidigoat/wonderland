import { Container, Graphics, Sprite, Texture, BufferImageSource } from "pixi.js";
import { FIELD_COLORS, fieldColor, fieldScale, phaseOffset, type FieldScale } from "./helpers";
import type { Frame, Scene } from "./scene";
import { createBackdrop } from "./backdrop";

export function createFieldScene(): Scene {
  const root = new Container();
  const ground = new Graphics();
  const painting = createBackdrop();
  const sprite = new Sprite(Texture.EMPTY);
  const frame = new Graphics();
  root.addChild(ground, painting.view, sprite, frame);

  let signature = "";
  let owned: Texture | null = null;
  let alive = true;

  const update = (next: Frame) => {
    if (!alive) return;
    painting.show(next.worldId, next.width, next.height);
    const grid = next.view?.kind === "field" && next.view.grid.length > 0 ? next.view.grid : idleGrid(next.worldId);
    const scale = fieldScale(next.worldId, flat(grid));
    const columns = grid[0]?.length ?? 1;
    const sig = `${next.worldId}|${scale}|${next.width}x${next.height}|${hashGrid(grid)}`;
    if (sig !== signature) {
      signature = sig;
      const texture = paintGrid(grid, scale);
      sprite.texture = texture;
      owned?.destroy(true);
      owned = texture;
      place(sprite, frame, ground, next, columns, grid.length, scale);
    }
  };

  return {
    root,
    update,
    destroy() {
      alive = false;
      painting.destroy();
      sprite.texture = Texture.EMPTY;
      owned?.destroy(true);
      owned = null;
      root.destroy({ children: true });
    },
  };
}

function place(sprite: Sprite, frame: Graphics, ground: Graphics, view: Frame, columns: number, rows: number, scale: FieldScale): void {
  ground.clear();
  ground.rect(0, 0, view.width, view.height).fill({ color: scale === "firebreak" ? FIELD_COLORS.night : view.palette.ground });

  const margin = Math.max(18, Math.min(view.width, view.height) * 0.06);
  const availW = Math.max(1, view.width - margin * 2);
  const availH = Math.max(1, view.height - margin * 2);
  const aspect = columns / Math.max(1, rows);
  let drawW = availW;
  let drawH = drawW / aspect;
  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * aspect;
  }
  const x = (view.width - drawW) / 2;
  const y = (view.height - drawH) / 2;
  sprite.position.set(x, y);
  sprite.width = drawW;
  sprite.height = drawH;

  frame.clear();
  frame.roundRect(x - 8, y - 8, drawW + 16, drawH + 16, 18).stroke({ width: 2, color: view.palette.accent, alpha: 0.75 });
}

function paintGrid(grid: number[][], scale: FieldScale): Texture {
  const rows = grid.length;
  const columns = grid[0]?.length ?? 0;
  const data = new Uint8Array(Math.max(1, columns) * Math.max(1, rows) * 4);
  const width = Math.max(1, columns);
  const height = Math.max(1, rows);
  for (let y = 0; y < height; y++) {
    const row = grid[y] ?? [];
    for (let x = 0; x < width; x++) {
      const cell = row[x];
      const value = typeof cell === "number" && Number.isFinite(cell) ? cell : 0;
      const color = fieldColor(value, scale);
      const index = (y * width + x) * 4;
      data[index] = (color >> 16) & 255;
      data[index + 1] = (color >> 8) & 255;
      data[index + 2] = color & 255;
      data[index + 3] = 255;
    }
  }
  const source = new BufferImageSource({
    resource: data,
    width,
    height,
    format: "rgba8unorm",
    scaleMode: scale === "firebreak" ? "nearest" : "linear",
    alphaMode: "no-premultiply-alpha",
  });
  return new Texture({ source });
}

function flat(grid: number[][]): number[] {
  const values: number[] = [];
  for (const row of grid) {
    for (const cell of row) values.push(typeof cell === "number" ? cell : 0);
  }
  return values;
}

function hashGrid(grid: number[][]): number {
  let hash = 2166136261;
  for (const row of grid) {
    for (const cell of row) {
      const n = Math.round((typeof cell === "number" && Number.isFinite(cell) ? cell : 0) * 10000);
      hash ^= n;
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 0xff;
  }
  return hash >>> 0;
}

function idleGrid(worldId: string): number[][] {
  if (worldId === "firebreak") return idleFirebreak();
  return idleContinuous();
}

function idleFirebreak(): number[][] {
  const width = 40;
  const height = 30;
  const grid = Array.from({ length: height }, () => Array<number>(width).fill(0));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edge = Math.sin(x * 0.33) * 2.4 + Math.sin(y * 0.47) * 1.6;
      if (x > 2 && x < width - 2 && y > 6 + edge && y < height - 4) grid[y]![x] = 0.35;
    }
  }
  for (let y = 8; y < 15; y++) {
    for (let x = 3; x < 9; x++) grid[y]![x] = 0.12;
  }
  grid[11]![2] = 1;
  grid[12]![3] = 1;
  grid[10]![3] = 1;
  return grid;
}

function idleContinuous(): number[][] {
  const width = 36;
  const height = 24;
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const nx = x / (width - 1) - 0.5;
      const ny = y / (height - 1) - 0.45;
      const d = Math.hypot(nx * 1.15, ny);
      const ridge = 0.5 + 0.5 * Math.sin(x * 0.35 + phaseOffset("ridge") * 3);
      return Math.min(0.92, Math.max(0.06, 0.82 - d * 1.05 + ridge * 0.08));
    }),
  );
}
