import { Container, Graphics, Sprite, Texture, BufferImageSource } from "pixi.js";
import { FIELD_COLORS, clearedStrip, duneRise, fieldColor, fieldScale, heightSilhouette, phaseOffset, smoothField, softenPlate, softenRidge, type FieldScale } from "./helpers";
import type { Frame, Scene } from "./scene";
import { createBackdrop } from "./backdrop";
import { isPaintedWorld } from "./sprites";

export function createFieldScene(): Scene {
  const root = new Container();
  const ground = new Graphics();
  const painting = createBackdrop();
  const sprite = new Sprite(Texture.EMPTY);
  const trees = new Graphics();
  const relief = new Graphics();
  const frame = new Graphics();
  root.addChild(ground, painting.view, sprite, trees, relief, frame);

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
    frame.alpha = isPaintedWorld(next.worldId) && scale !== "firebreak" ? 0 : isPaintedWorld(next.worldId) ? 0.35 : 1;
    if (scale === "firebreak") {
      sprite.visible = false;
      relief.visible = false;
      relief.clear();
      trees.visible = true;
      drawValley(trees, grid, box, isPaintedWorld(next.worldId));
      return;
    }
    trees.visible = false;
    trees.clear();
    const dune = heightSilhouette(grid);
    if (dune) {
      sprite.visible = false;
      relief.visible = true;
      frame.alpha = isPaintedWorld(next.worldId) ? 0 : 0.45;
      drawDune(relief, dune.heights, box, isPaintedWorld(next.worldId));
      return;
    }
    relief.visible = false;
    relief.clear();
    sprite.visible = true;
    // Over a Muse Image painting the field glows where it is strong and lets the painting show where it is empty.
    const texture = paintGrid(softenPlate(smoothField(grid)), scale, isPaintedWorld(next.worldId));
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

function drawValley(g: Graphics, grid: number[][], box: Box, painted = false): void {
  g.clear();
  // Over a Muse Image valley the night is a wash, so the painted ground shows between the trees.
  g.rect(box.x, box.y, box.w, box.h).fill({ color: FIELD_COLORS.night, alpha: painted ? 0.62 : 1 });
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

/** A sand ridge: one smooth fill, not a column of hard cells. */
function drawDune(g: Graphics, heights: number[], box: Box, painted: boolean): void {
  g.clear();
  const count = heights.length;
  if (count < 2) return;
  const smooth = softenRidge(heights);
  let start = 0;
  let end = count - 1;
  while (start < end && (smooth[start] ?? 0) < 0.02) start++;
  while (end > start && (smooth[end] ?? 0) < 0.02) end--;
  start = Math.max(0, start - 1);
  end = Math.min(count - 1, end + 1);
  const ridge: number[] = [];
  for (let index = start; index <= end; index++) {
    ridge.push(box.x + (index / (count - 1)) * box.w, box.y + box.h - duneRise(smooth[index] ?? 0) * box.h);
  }
  const bottom = box.y + box.h;
  const bands = 12;
  for (let band = 0; band < bands; band++) {
    const t0 = band / bands;
    const t1 = (band + 1) / bands;
    const alpha = (painted ? 0.9 : 0.95) * (1 - t0) * (1 - t0);
    if (alpha < 0.04) continue;
    const poly: number[] = [];
    for (let index = 0; index < ridge.length; index += 2) {
      const x = ridge[index] ?? box.x;
      const y = ridge[index + 1] ?? bottom;
      poly.push(x, y + (bottom - y) * t0);
    }
    for (let index = ridge.length - 2; index >= 0; index -= 2) {
      const x = ridge[index] ?? box.x;
      const y = ridge[index + 1] ?? bottom;
      poly.push(x, y + (bottom - y) * t1);
    }
    g.poly(poly).fill({ color: FIELD_COLORS.gold, alpha });
  }
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
  // A flat-topped stump, about a third as tall as a sapling. A speck disappears into the valley.
  const top = y - size * 0.06;
  g.rect(x - size * 0.07, top, size * 0.14, size * 0.36).fill({ color: 0x2c2824 });
  g.rect(x - size * 0.2, top - size * 0.02, size * 0.4, size * 0.1).fill({ color: FIELD_COLORS.ash });
}

function paintGrid(grid: number[][], scale: FieldScale, translucent = false): Texture {
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
      // Over a painting the level still reads absolutely (oxygen falling evenly in a jar is the law), but the
      // field fades out toward its edges so it sits in the picture instead of on it like a pasted box.
      const edge = translucent ? Math.min(1, (Math.min(x, width - 1 - x, y, height - 1 - y) + 1) / Math.max(2, Math.min(width, height) * 0.15)) : 1;
      data[index + 3] = translucent ? Math.round(Math.pow(Math.max(0, Math.min(1, value)), 0.7) * 235 * edge) : 255;
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
