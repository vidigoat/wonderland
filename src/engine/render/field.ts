import { Container, Graphics, Sprite, Texture, BufferImageSource } from "pixi.js";
import { FIELD_COLORS, clearedStrip, fieldColor, fieldScale, phaseOffset, type FieldScale } from "./helpers";
import type { Frame, Scene } from "./scene";
import { createBackdrop } from "./backdrop";

export function createFieldScene(): Scene {
  const root = new Container();
  const ground = new Graphics();
  const painting = createBackdrop();
  const sprite = new Sprite(Texture.EMPTY);
  const trees = new Graphics();
  const frame = new Graphics();
  root.addChild(ground, painting.view, sprite, trees, frame);

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
    if (sig === signature) return;
    signature = sig;
    const box = valleyBox(next, columns, grid.length);
    strokeValley(frame, ground, next, box, scale);
    if (scale === "firebreak") {
      sprite.visible = false;
      trees.visible = true;
      drawValley(trees, grid, box);
      return;
    }
    trees.visible = false;
    trees.clear();
    sprite.visible = true;
    const texture = paintGrid(grid, scale);
    sprite.texture = texture;
    owned?.destroy(true);
    owned = texture;
    sprite.position.set(box.x, box.y);
    sprite.width = box.w;
    sprite.height = box.h;
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

type Box = { x: number; y: number; w: number; h: number };

function valleyBox(view: Frame, columns: number, rows: number): Box {
  const margin = Math.max(18, Math.min(view.width, view.height) * 0.06);
  const availW = Math.max(1, view.width - margin * 2);
  const availH = Math.max(1, view.height - margin * 2);
  const aspect = columns / Math.max(1, rows);
  let w = availW;
  let h = w / aspect;
  if (h > availH) {
    h = availH;
    w = h * aspect;
  }
  return { x: (view.width - w) / 2, y: (view.height - h) / 2, w, h };
}

function strokeValley(frame: Graphics, ground: Graphics, view: Frame, box: Box, scale: FieldScale): void {
  ground.clear();
  ground.rect(0, 0, view.width, view.height).fill({ color: scale === "firebreak" ? FIELD_COLORS.night : view.palette.ground });
  frame.clear();
  frame.roundRect(box.x - 8, box.y - 8, box.w + 16, box.h + 16, 18).stroke({ width: 2, color: view.palette.accent, alpha: 0.75 });
}

function drawValley(g: Graphics, grid: number[][], box: Box): void {
  g.clear();
  g.rect(box.x, box.y, box.w, box.h).fill({ color: FIELD_COLORS.night });
  const rows = grid.length;
  const columns = grid[0]?.length ?? 1;
  const cw = box.w / columns;
  const ch = box.h / rows;
  const size = Math.min(cw, ch);
  const strip = clearedStrip(grid);
  if (strip) {
    const x = box.x + strip.start * cw;
    const w = (strip.end - strip.start) * cw;
    const edge = Math.max(1.5, cw * 0.12);
    g.rect(x, box.y, w, box.h).fill({ color: 0xc6b48a });
    g.rect(x, box.y, edge, box.h).fill({ color: 0x8a7350 });
    g.rect(x + w - edge, box.y, edge, box.h).fill({ color: 0x8a7350 });
  }
  for (let row = 0; row < rows; row++) {
    const cells = grid[row] ?? [];
    for (let col = 0; col < columns; col++) {
      const value = cells[col] ?? 0;
      const x = box.x + col * cw + cw / 2;
      const y = box.y + row * ch + ch / 2;
      if (close(value, 1)) flame(g, x, y, size);
      else if (close(value, 0.35)) pine(g, x, y, size);
      else if (close(value, 0.12)) ash(g, x, y, size);
    }
  }
}

function close(value: number, level: number): boolean {
  return Math.abs(value - level) <= 1e-9;
}

function pine(g: Graphics, x: number, y: number, size: number): void {
  const h = size * 0.86;
  const w = size * 0.34;
  g.poly([x, y - h * 0.48, x + w, y + h * 0.28, x - w, y + h * 0.28]).fill({ color: FIELD_COLORS.moss });
  g.rect(x - size * 0.05, y + h * 0.22, size * 0.1, size * 0.16).fill({ color: 0x241910 });
}

function flame(g: Graphics, x: number, y: number, size: number): void {
  g.poly([
    x, y - size * 0.42,
    x + size * 0.2, y + size * 0.08,
    x, y - size * 0.02,
    x - size * 0.2, y + size * 0.08,
  ]).fill({ color: FIELD_COLORS.ember });
  g.circle(x, y - size * 0.08, size * 0.06).fill({ color: 0xf6e2a8 });
}

function ash(g: Graphics, x: number, y: number, size: number): void {
  const h = size * 0.62;
  g.poly([x, y - h * 0.15, x + size * 0.2, y + h * 0.32, x - size * 0.2, y + h * 0.32]).fill({ color: FIELD_COLORS.ash });
  g.rect(x - size * 0.045, y + h * 0.26, size * 0.09, size * 0.2).fill({ color: 0x241910 });
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
