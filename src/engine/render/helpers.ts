/**
 * Pure stage maths. Animation phase comes from the ticker clock plus {@link phaseOffset}.
 * Index ranges are half-open [start, end).
 */

export type IndexRange = { start: number; end: number };

export type Point2 = { x: number; y: number };

export type TrailSample = readonly [number, number] | { readonly x: number; readonly y: number };

/** Firebreak cell codes, as `rules.view()` emits them. */
export const FIREBREAK_EMPTY = 0;
export const FIREBREAK_ASH = 0.12;
export const FIREBREAK_TREE = 0.35;
export const FIREBREAK_FLAME = 1;

/** Categorical valley colours, and the ink → gold ramp for every other field. */
export const FIELD_COLORS = {
  /** Indigo night ground. */
  night: 0x1c1a3a,
  /** Cut wood. Lighter than the night, shorter than a sapling, so a burned valley still reads. */
  ash: 0x8a847c,
  /** Moss tree. */
  moss: 0x3e6b45,
  /** Ember flame. */
  ember: 0xe15a24,
  /** Storybook ink. */
  ink: 0x14110e,
  /** Gold leaf. */
  gold: 0xe0b15a,
} as const;

export type FieldScale = "firebreak" | "continuous";

const LEVEL_EPS = 1e-9;

/** Newton's cannon: GM = 1, four velocity-Verlet substeps of 0.01 per step. */
export const CANNON_GM = 1;
export const CANNON_SUBSTEP_DT = 0.01;
export const CANNON_SUBSTEPS = 4;
/** Time between consecutive trail samples when the world records every step. */
export const CANNON_STEP_DT = CANNON_SUBSTEP_DT * CANNON_SUBSTEPS;

const SEALED_MARK = "-- sealed";
const NAME_SLOT = "name = '";
const PASS_JOIN = " AND pass = ";

type Literal = {
  open: number;
  /** Index of the closing quote, or `query.length` when the literal runs off the end. */
  close: number;
  closed: boolean;
};

/** Keep a centered label inside the frame. */
export function clampCenter(center: number, width: number, frameWidth: number, margin = 8): number {
  const half = width / 2;
  const min = margin + half;
  const max = frameWidth - margin - half;
  if (max < min) return frameWidth / 2;
  return Math.min(max, Math.max(min, center));
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Rumour Town stands on the cobbles, just below the bank's doorstep.
 * 0 is the queue at the door. 1 is the front of the square.
 */
export function townFoot(y: number): number {
  return 0.62 + clamp01(y) * 0.34;
}

/**
 * A new generation appears somewhere else on the bark.
 * That is a landing, not a step, so colour should arrive with it.
 */
export function landedApart(fromX: number, fromY: number, toX: number, toY: number): boolean {
  return Math.hypot(toX - fromX, toY - fromY) > 0.15;
}

/**
 * A cleared lane: two or more neighbouring columns with nothing in them, top to bottom.
 * One empty column is a gap in the planting. A lane is the strip you can walk through.
 */
export function clearedStrip(grid: number[][]): { start: number; end: number } | null {
  const columns = grid[0]?.length ?? 0;
  const rows = grid.length;
  if (rows === 0 || columns === 0) return null;
  let run = -1;
  let best: { start: number; end: number } | null = null;
  for (let x = 0; x <= columns; x++) {
    const open =
      x < columns &&
      grid.every((row) => {
        const cell = row[x];
        return typeof cell !== "number" || !Number.isFinite(cell) || cell <= 0.01;
      });
    if (open && run < 0) run = x;
    if (!open && run >= 0) {
      if (x - run >= 2 && (best == null || x - run > best.end - best.start)) best = { start: run, end: x };
      run = -1;
    }
  }
  return best;
}

export function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(a: number, b: number, t: number): number {
  const u = clamp01(t);
  const channel = (shift: number) => {
    const from = (a >> shift) & 255;
    const to = (b >> shift) & 255;
    return Math.round(from + (to - from) * u);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export function cssHex(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
}

/** A sealed scroll stores the words after the spell, not inside it. */
export function splitSealedSpell(query: string): { spell: string; data: string | null } {
  const mark = " -- sealed:";
  const at = query.indexOf(mark);
  if (at < 0) return { spell: query, data: null };
  const data = query.slice(at + mark.length).trim();
  return { spell: query.slice(0, at).trim(), data: data || null };
}

/** The words the seal kept, spoken as data rather than as part of the command. */
export function sealedDataLine(data: string): string {
  try {
    const parsed = JSON.parse(data) as unknown;
    if (Array.isArray(parsed)) {
      const words = parsed.map((part) => String(part)).filter((part) => part.length > 0);
      if (words.length > 0) return `Sealed. Kept as data: ${words.join("  ·  ")}`;
    }
  } catch {
    // The note was not a list. Show it as it was written.
  }
  return `Sealed. Kept as data: ${data}`;
}

/** What the card says when the scribe cannot finish the spell. A broken quote is named in plain words. */
export function scribeStopLine(error: string): string {
  const text = error.replace(/\s+/g, " ").trim();
  if (/syntax error|near /i.test(text)) return "The scribe stopped. The quote closed too soon.";
  if (!text) return "The scribe stopped.";
  return `The scribe stopped. ${text.slice(0, 80)}`;
}

/** The spell was built and ran, and it did not open the vault. */
export function shutVaultNote(query: string, error: string | null, rowCount: number): string | null {
  if (!query || error || rowCount > 0) return null;
  return "The spell ran. The vault stayed shut.";
}

/** How many figures a shelf card draws. A flock is a sample, so each bird is large enough to show its heading. */
export function thumbCrowd(count: number, headed: boolean): number {
  if (count <= 0) return 0;
  if (!headed) return Math.min(400, count);
  return Math.min(64, count);
}

/** An even sample across the flock, so both sides of a spread murmuration are on the card. */
export function thumbSample<T>(agents: readonly T[], headed: boolean): T[] {
  const cap = thumbCrowd(agents.length, headed);
  if (cap >= agents.length) return agents.slice(0, cap);
  const picked: T[] = [];
  for (let i = 0; i < cap; i++) picked.push(agents[Math.floor((i + 0.5) * agents.length / cap)]!);
  return picked;
}

/**
 * How far a shelf card runs before it is drawn. The still uses seed 11.
 * The meadow's shared flash is at step 1000. The flock faces one way by step 400.
 * The valley's crash, when lynx outnumber hares, is at step 200. A jam needs 220.
 */
export function thumbSteps(worldId: string): number {
  if (worldId === "firefly-sync-kuramoto") return 1000;
  if (worldId === "murmuration-sky") return 400;
  if (worldId === "phantom-jam-ring-road") return 220;
  if (worldId === "predator-prey-valley") return 200;
  if (worldId === "hallway-lanes") return 160;
  return 40;
}

/** A body sprite: tall vehicles turn to drive along the lane, and a negative heading faces the other way. */
export function bodyFacing(speed: number | undefined, tall: boolean): { turn: number; flip: boolean } {
  return {
    turn: tall && typeof speed === "number" ? Math.PI / 2 : 0,
    flip: typeof speed === "number" && speed < 0,
  };
}

/** The starling painting points up. Pixi and the canvas both rotate clockwise, and the flock's +y runs down the stage. */
export function flockFacing(heading: number): number {
  return heading + Math.PI / 2;
}

/** A stopped car on the ring road is red, so the jam reads as a knot. Every other figure keeps its painting. */
export function figureTint(worldId: string, speed: number | undefined): number {
  if (worldId === "phantom-jam-ring-road" && typeof speed === "number" && speed < 0.5) return 0xff3344;
  return 0xffffff;
}

/** Shelf-card size in CSS pixels. A stopped car is large enough to read as the jam. */
export function thumbBodyPx(worldId: string, speed: number | undefined): number {
  return figureTint(worldId, speed) === 0xffffff ? 16 : 36;
}

/**
 * The part of a shelf card the title does not cover.
 * The gradient owns everything below this rectangle.
 */
export function thumbSky(width: number, height: number): { x: number; y: number; w: number; h: number } {
  return { x: width * 0.06, y: height * 0.04, w: width * 0.88, h: height * 0.44 };
}

/**
 * Where a shelf card puts a creature, as fractions of the card height.
 * Birds and fireflies use the open sky. Animals on foot sit on the slope, above the title.
 */
export function thumbPlace(airborne: boolean): { y0: number; y1: number } {
  return airborne ? { y0: 0.04, y1: 0.48 } : { y0: 0.36, y1: 0.62 };
}

/**
 * How big a painted creature is on a shelf card, in the same pixels as `skyMin`.
 * A flock stays large enough to show a wing, and small enough that the birds stay separate.
 */
export function thumbSpritePx(skyMin: number, count: number, headed: boolean): number {
  const gap = skyMin / Math.sqrt(Math.max(1, count));
  const floor = skyMin * 0.1;
  if (headed) return Math.max(floor, Math.min(skyMin * 0.2, gap * 1.15));
  return Math.max(skyMin * 0.12, Math.min(skyMin * 0.22, gap * 1.3));
}

/** A walker or a car on a shelf card, in the same pixels as `skyMin`. A stopped car is the knot. */
export function thumbFigurePx(skyMin: number, stopped: boolean): number {
  const moving = Math.max(skyMin * 0.1, Math.min(skyMin * 0.13, 48));
  return stopped ? moving * 1.8 : moving;
}

/**
 * Radius of the red mark behind a stopped car, in CSS pixels.
 * It has to reach past the painting, or the car covers the mark and the jam disappears.
 */
export function thumbJamHalo(worldId: string, speed: number | undefined): number {
  if (figureTint(worldId, speed) === 0xffffff) return 0;
  return thumbBodyPx(worldId, speed) * 0.78;
}

/** A stopped car is painted over in this dark red, so it sits in the bright mark instead of matching the moving cars. */
export function thumbJamInk(worldId: string, speed: number | undefined): string | null {
  if (figureTint(worldId, speed) === 0xffffff) return null;
  return "#6e1020";
}

/** A handful of lines, spread across the square, so one sentence is not stacked on itself. */
export function spokenIds(agents: { id: string | number; x: number; y?: number; bubble?: string | null }[], limit = 6): Set<string> {
  const voiced = agents.filter((agent) => agent.bubble?.trim() && /\p{L}/u.test(agent.bubble)).sort((a, b) => a.x - b.x || (a.y ?? 0) - (b.y ?? 0));
  const ids = new Set<string>();
  const chosen: { x: number; y: number }[] = [];
  for (const agent of voiced) {
    if (ids.size >= limit) break;
    const y = agent.y ?? 0;
    const crowded = chosen.some((other) => {
      const dx = Math.abs(agent.x - other.x);
      if (agent.y == null) return dx < 0.14;
      return Math.hypot(dx, Math.abs(y - other.y)) < 0.28;
    });
    if (crowded) continue;
    ids.add(String(agent.id));
    chosen.push({ x: agent.x, y });
  }
  return ids;
}

/** Stable 0–1 phase for idle bob. Same id, same phase. */
export function phaseOffset(id: string | number): number {
  const text = String(id);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export function readPoint(sample: TrailSample): Point2 {
  if (isPoint(sample)) return { x: sample.x, y: sample.y };
  return { x: sample[0], y: sample[1] };
}

function isPoint(sample: TrailSample): sample is { readonly x: number; readonly y: number } {
  return !Array.isArray(sample);
}

function near(value: number, level: number): boolean {
  return Math.abs(value - level) <= LEVEL_EPS;
}

export function isFirebreakLevel(value: number): boolean {
  return near(value, FIREBREAK_EMPTY) || near(value, FIREBREAK_ASH) || near(value, FIREBREAK_TREE) || near(value, FIREBREAK_FLAME);
}

/**
 * Firebreak (or a grid that only uses its four levels, including ash or tree)
 * is categorical. A smooth field, including one that happens to be all 0s and 1s,
 * stays on the ink-to-gold ramp.
 */
export function fieldScale(worldId: string, values: ArrayLike<number>): FieldScale {
  if (worldId === "firebreak") return "firebreak";
  let distinctive = false;
  for (let i = 0; i < values.length; i++) {
    const value = values[i] ?? 0;
    if (!isFirebreakLevel(value)) return "continuous";
    if (near(value, FIREBREAK_ASH) || near(value, FIREBREAK_TREE)) distinctive = true;
  }
  return distinctive ? "firebreak" : "continuous";
}

/**
 * Colour for one cell.
 * Firebreak levels are exactly 0 empty, 0.12 ash, 0.35 tree, 1 flame.
 * Anything else — and every cell of a continuous field — blends ink to gold.
 */
export function fieldColor(value: number, scale: FieldScale = "continuous"): number {
  if (scale === "firebreak") {
    if (near(value, FIREBREAK_EMPTY)) return FIELD_COLORS.night;
    if (near(value, FIREBREAK_ASH)) return FIELD_COLORS.ash;
    if (near(value, FIREBREAK_TREE)) return FIELD_COLORS.moss;
    if (near(value, FIREBREAK_FLAME)) return FIELD_COLORS.ember;
  }
  if (!Number.isFinite(value)) return FIELD_COLORS.ink;
  return lerpColor(FIELD_COLORS.ink, FIELD_COLORS.gold, clamp01(value));
}

function fieldCell(grid: number[][], y: number, x: number): number {
  const value = grid[y]?.[x];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Sample a grid at a fractional cell. Used to turn a coarse field into a smooth one. */
export function bilinearSample(grid: number[][], x: number, y: number): number {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return 0;
  const xClamped = Math.min(cols - 1, Math.max(0, x));
  const yClamped = Math.min(rows - 1, Math.max(0, y));
  const x0 = Math.floor(xClamped);
  const y0 = Math.floor(yClamped);
  const tx = xClamped - x0;
  const ty = yClamped - y0;
  const x1 = Math.min(x0 + 1, cols - 1);
  const y1 = Math.min(y0 + 1, rows - 1);
  const a = fieldCell(grid, y0, x0);
  const b = fieldCell(grid, y0, x1);
  const c = fieldCell(grid, y1, x0);
  const d = fieldCell(grid, y1, x1);
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}

/**
 * A taller copy of a continuous field. Each output cell is a bilinear sample, so a heat
 * spot fades instead of stepping from cell to cell.
 */
export function smoothField(grid: number[][], longest = 180): number[][] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return grid;
  const scale = Math.max(1, Math.min(4, Math.floor(longest / Math.max(rows, cols))));
  if (scale <= 1) return grid;
  const height = rows * scale;
  const width = cols * scale;
  const out: number[][] = [];
  for (let y = 0; y < height; y++) {
    const gy = rows === 1 ? 0 : (y / (height - 1)) * (rows - 1);
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const gx = cols === 1 ? 0 : (x / (width - 1)) * (cols - 1);
      row.push(bilinearSample(grid, gx, gy));
    }
    out.push(row);
  }
  return out;
}

/**
 * How high a dune column is drawn, as a fraction of the stage.
 * The grid stores a low ridge, so the picture lifts it until the windward slope and the slip face can be told apart.
 * A taller dune still draws taller, up to the sky.
 */
export function duneRise(fraction: number): number {
  if (!Number.isFinite(fraction) || fraction <= 0) return 0;
  return Math.min(0.9, fraction * 2.2);
}

/**
 * The columns that are the dune, plus a little flat sand on either side.
 * A shelf card can then draw the shape across the picture instead of a spike in a field of zeros.
 */
export function ridgeWindow(heights: readonly number[]): { start: number; end: number } {
  const last = heights.length - 1;
  if (last <= 0) return { start: 0, end: Math.max(0, last) };
  let start = 0;
  let end = last;
  while (start < end && (heights[start] ?? 0) < 0.02) start++;
  while (end > start && (heights[end] ?? 0) < 0.02) end--;
  const pad = Math.max(1, Math.round((end - start) * 0.12));
  return { start: Math.max(0, start - pad), end: Math.min(last, end + pad) };
}

/** A dune grid is only a few rows tall. Blur the ridge so the slope reads as sand, not stairs. The crest stays put. */
export function softenRidge(heights: number[], passes = 8): number[] {
  let current = heights.slice();
  for (let pass = 0; pass < passes; pass++) {
    const next = current.map((_, index) => {
      const left = current[Math.max(0, index - 1)] ?? 0;
      const mid = current[index] ?? 0;
      const right = current[Math.min(current.length - 1, index + 1)] ?? 0;
      return (left + 2 * mid + right) / 4;
    });
    current = next;
  }
  return current;
}

export type SpeechBox = { x: number; y: number; w: number; h: number };

/** Stack speech that would sit on top of itself, and leave a bubble that is already clear where it is. */
export function separateSpeech(boxes: readonly SpeechBox[], stageHeight: number): { x: number; y: number }[] {
  const placed: SpeechBox[] = [];
  return boxes.map((box) => {
    let y = box.y;
    for (let guard = 0; guard < 8; guard++) {
      const hit = placed.some((other) => {
        const overlapX = Math.abs(box.x - other.x) < Math.max(150, (box.w + other.w) / 2 - 4);
        const overlapY = Math.abs(y - other.y) < Math.max(48, (box.h + other.h) / 2);
        return overlapX && overlapY;
      });
      if (!hit) break;
      const lifted = y - box.h - 8;
      y = lifted > 12 ? lifted : box.y + box.h + 8;
      if (y > stageHeight - 12) y = Math.max(12, box.y - box.h - 8);
    }
    placed.push({ ...box, y });
    return { x: box.x, y };
  });
}

export type HeightSilhouette = { heights: number[] };

/**
 * A dune is a grid that is empty above a ridge and filled beneath it.
 * Returns the fill height of each column, from 0 to 1, or null when the grid is a real heat map.
 */
export function heightSilhouette(grid: number[][]): HeightSilhouette | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows < 4 || cols < 4) return null;
  const heights: number[] = [];
  let matched = 0;
  let shaped = false;
  for (let x = 0; x < cols; x++) {
    let filled = 0;
    for (let y = rows - 1; y >= 0; y--) {
      if (fieldCell(grid, y, x) >= 0.5) filled++;
      else break;
    }
    let ones = 0;
    for (let y = 0; y < rows; y++) if (fieldCell(grid, y, x) >= 0.5) ones++;
    if (ones === filled) matched++;
    const height = filled / rows;
    if (height > 0.05 && height < 0.95) shaped = true;
    heights.push(height);
  }
  if (!shaped || matched < cols * 0.85) return null;
  return { heights };
}

function scanLiterals(query: string): Literal[] {
  const literals: Literal[] = [];
  let i = 0;
  while (i < query.length) {
    if (query[i] !== "'") {
      i++;
      continue;
    }
    const open = i;
    i++;
    let closed = false;
    while (i < query.length) {
      if (query[i] === "'") {
        if (query[i + 1] === "'") {
          i += 2;
          continue;
        }
        literals.push({ open, close: i, closed: true });
        i++;
        closed = true;
        break;
      }
      i++;
    }
    if (!closed) literals.push({ open, close: query.length, closed: false });
  }
  return literals;
}

function isWellFormedSpell(query: string, literals: Literal[]): boolean {
  if (literals.length !== 2 || !literals[0]?.closed || !literals[1]?.closed) return false;
  const before = query.slice(0, literals[0].open);
  const mid = query.slice(literals[0].close + 1, literals[1].open);
  const after = query.slice(literals[1].close + 1);
  return before.endsWith("name = ") && mid === PASS_JOIN && after.trim() === "";
}

type Segment = { start: number; end: number; text: string };

function outsideSegments(query: string, literals: Literal[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const literal of literals) {
    if (cursor < literal.open) {
      segments.push({ start: cursor, end: literal.open, text: query.slice(cursor, literal.open) });
    }
    if (!literal.closed) return segments;
    cursor = literal.close + 1;
  }
  if (cursor < query.length) {
    segments.push({ start: cursor, end: query.length, text: query.slice(cursor) });
  }
  return segments;
}

function isTemplateSegment(text: string, index: number): boolean {
  if (text.trim() === "") return true;
  if (text === PASS_JOIN) return true;
  if (index === 0 && text.endsWith("name = ")) return true;
  return false;
}

function extendThroughPayloadLiteral(query: string, literals: Literal[], end: number): number {
  const next = literals.find((literal) => literal.open === end && literal.closed);
  if (!next) return end;
  const rest = query.slice(next.close + 1);
  // Stop before the closing quote. In the gatekeeper spell that quote is the
  // scribe's delimiter (`' AND pass = '`), not part of the broken-out text.
  if (rest === "" || rest.startsWith(PASS_JOIN)) return next.close;
  return end;
}

/**
 * Range of the scribe's spell that escaped the intended quotes.
 *
 * The unsealed spell is `name = '<name>' AND pass = '<pass>'`.
 * A sealed spell contains `-- sealed` and is not marked.
 * A well-formed spell is exactly two string literals joined by that template.
 * Otherwise the range covers the breakout: from the first character that
 * left a literal through the last, including the attacker's own quotes
 * (` OR '1'='1`) and, for O'Brien, the identifier that fell out (`Brien`).
 */
export function injectionHighlightRange(query: string): IndexRange | null {
  if (query.includes(SEALED_MARK)) return null;
  if (!query.includes(NAME_SLOT)) return null;
  const literals = scanLiterals(query);
  if (isWellFormedSpell(query, literals)) return null;
  const extras = outsideSegments(query, literals).filter((segment, index) => !isTemplateSegment(segment.text, index));
  if (extras.length === 0) return null;
  const start = extras[0]?.start ?? 0;
  const last = extras[extras.length - 1];
  if (!last || start >= last.end) return null;
  const end = extendThroughPayloadLiteral(query, literals, last.end);
  if (start >= end) return null;
  return { start, end };
}

/**
 * Ghost trajectory under GM = 1.
 * Velocity is the finite difference of the last two samples over `sampleDt`
 * (one cannon step, 0.04, when those samples are adjacent steps).
 * Each output point is one cannon step: four velocity-Verlet substeps of 0.01.
 * Stops at the surface (r < 1) or at escape (r > 12). Empty if fewer than two samples.
 */
/** A landed shot sits on the disk. Points already outside are left alone. The origin stays put. */
export function onSurface(x: number, y: number, radius = 1): Point2 {
  const r = Math.hypot(x, y);
  if (!(r > 0) || r >= radius) return { x, y };
  return { x: (x / r) * radius, y: (y / r) * radius };
}

/** A trail from the world replaces anything the stage still remembers. An empty trail keeps the memory. */
export function resolveShotPath(worldTrail: readonly Point2[], remembered: readonly Point2[]): Point2[] {
  if (worldTrail.length > 0) return worldTrail.map((point) => ({ x: point.x, y: point.y }));
  return remembered.map((point) => ({ x: point.x, y: point.y }));
}

/**
 * Where a cannon stage should look.
 * A short hop is framed on the peak, because the barrel is wider than that hop.
 * A flight that leaves the mountain frames the whole planet.
 */
export function cannonLook(points: readonly Point2[]): { aim: Point2; focus: number } {
  const wide = { aim: { x: 0, y: 0 }, focus: 1.72 };
  if (points.length === 0) return wide;
  const start = points[0]!;
  let far = start;
  let reach = 0;
  let maxR = 0;
  for (const point of points) {
    const along = Math.hypot(point.x - start.x, point.y - start.y);
    if (along > reach) {
      reach = along;
      far = point;
    }
    maxR = Math.max(maxR, Math.hypot(point.x, point.y));
  }
  if (reach < 0.55 && maxR < 1.5) {
    return {
      aim: { x: (start.x + far.x) / 2, y: (start.y + far.y) / 2 },
      focus: Math.max(0.16, reach * 0.82 + 0.08),
    };
  }
  return { aim: { x: 0, y: 0 }, focus: Math.min(10, Math.max(1.72, maxR * 1.18)) };
}

/** Ghost from the muzzle at a horizontal launch speed, before the shot has a trail. */
export function launchPreview(speed: number, steps = 100): Point2[] {
  const r = 1.02;
  const v = Number.isFinite(speed) ? Math.max(0, speed) : 0.5;
  const dt = CANNON_STEP_DT;
  return trailGhostPoints(
    [
      { x: -v * dt, y: r },
      { x: 0, y: r },
    ],
    steps,
    dt,
  );
}

export function trailGhostPoints(trail: readonly TrailSample[], steps = 40, sampleDt = CANNON_STEP_DT): Point2[] {
  if (trail.length < 2 || steps <= 0 || !(sampleDt > 0)) return [];
  const previous = readPoint(trail[trail.length - 2]!);
  const current = readPoint(trail[trail.length - 1]!);
  let x = current.x;
  let y = current.y;
  let vx = (current.x - previous.x) / sampleDt;
  let vy = (current.y - previous.y) / sampleDt;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(vx) || !Number.isFinite(vy)) return [];

  const points: Point2[] = [];
  for (let step = 0; step < steps; step++) {
    for (let sub = 0; sub < CANNON_SUBSTEPS; sub++) {
      const r2 = x * x + y * y;
      if (r2 < 1e-12) return points;
      const r3 = Math.pow(r2, 1.5);
      const ax = (-CANNON_GM * x) / r3;
      const ay = (-CANNON_GM * y) / r3;
      const dt = CANNON_SUBSTEP_DT;
      x += vx * dt + 0.5 * ax * dt * dt;
      y += vy * dt + 0.5 * ay * dt * dt;
      const r2b = x * x + y * y;
      if (r2b < 1e-12) return points;
      const r3b = Math.pow(r2b, 1.5);
      vx += 0.5 * (ax + (-CANNON_GM * x) / r3b) * dt;
      vy += 0.5 * (ay + (-CANNON_GM * y) / r3b) * dt;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) break;
    points.push({ x, y });
    const radius = Math.hypot(x, y);
    if (radius < 1 || radius > 12) break;
  }
  return points;
}

export function readNumber(params: Record<string, number | boolean | string>, key: string, fallback: number): number {
  const value = params[key];
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : fallback;
}

export function readBoolean(params: Record<string, number | boolean | string>, key: string, fallback = false): boolean {
  const value = params[key];
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

/** A sent scroll crosses the archive, then the play loop holds a short beat longer. */
export const SCROLL_TRIP_MS = 1500;
export const SCROLL_HOLD_MS = SCROLL_TRIP_MS + 200;

/** Where a spell comes to rest: the scribe if it broke, the vault if it opened, otherwise the ledger. */
export function scrollRest(stages: readonly string[], outcome: { error: boolean; open: boolean }): number {
  const count = stages.length;
  if (count <= 1) return 0;
  const span = count - 1;
  if (outcome.error) {
    const scribe = stages.findIndex((stage) => /scribe/i.test(stage));
    return (scribe < 0 ? 1 : scribe) / span;
  }
  if (outcome.open) return 1;
  const ledger = stages.findIndex((stage) => /ledger/i.test(stage));
  return (ledger < 0 ? Math.max(0, count - 2) : ledger) / span;
}

/** The scroll leaves the desk and eases to where this spell came to rest. */
export function scrollTravel(playing: boolean, reduced: boolean, elapsedMs: number, destination: number): number {
  if (reduced || !playing) return destination;
  const along = smoothstep(clamp01(elapsedMs / SCROLL_TRIP_MS));
  return destination * along;
}

export type ScrollTrip = { started: number | null; traveled: boolean };

/**
 * How many figures to draw, and how large.
 * A painted crowd shrinks so it reads as a crowd. On a phone the same formula
 * turns a hundred moths into specks, so the stage draws fewer and keeps each one big enough to see.
 */
function featuredSprite(sprite?: string): boolean {
  const key = (sprite ?? "").toLowerCase();
  return key === "bird" || /predator|lynx|fox|wolf/.test(key);
}

export function populationCrowd(input: { width: number; height: number; count: number; painted: boolean; rumour: boolean; hero: boolean }): { cap: number; scale: number } {
  const narrow = input.width < 520 && input.hero && !input.rumour;
  const phoneMeadow = input.width < 520 && !input.hero && !input.rumour && input.painted;
  let cap = Math.min(Math.max(0, input.count), narrow || phoneMeadow ? 36 : 600);
  const unit = Math.min(input.width, input.height);
  const shrink = input.painted && !input.rumour;
  const base = Math.max(0.85, Math.min(1.55, unit / 640));
  // A generated meadow can hold a hundred creatures. On a desk the old formula drew them at ~20px, so a lynx looked like another hare.
  if (shrink && !input.hero && !phoneMeadow && input.count > 1) {
    const divisor = 230;
    const need = (0.48 / base) * divisor;
    const fit = Math.max(8, Math.floor((input.width * input.height) / (need * need)));
    cap = Math.min(cap, fit);
  }
  const spacing = Math.sqrt((input.width * input.height) / Math.max(1, cap));
  const crowd = !shrink ? 1 : Math.min(1, spacing / (input.hero ? 150 : 230));
  let scale = base * crowd;
  if (narrow) scale = Math.max(scale, 0.52);
  else if (phoneMeadow) scale = Math.max(scale, 0.5);
  return { cap, scale };
}

/** How large one creature is drawn. On a phone a hare stays close to a lynx, so the herd is not hidden under the cats. */
export function figureBody(sprite: string, phase: number, narrow: boolean, figureScale: number): number {
  if (sprite === "bird") return figureScale * 2.05;
  if (/predator|lynx|fox|wolf/i.test(sprite)) return figureScale * (narrow ? 1.25 : 1.7);
  return figureScale * (narrow ? 1.05 : 0.86 + Math.max(0, Math.min(1, phase)) * 0.28);
}

/** Keep the bird, and every predator, when the stage draws only part of the crowd. */
export function crowdToDraw<T extends { sprite?: string }>(agents: readonly T[], cap: number): T[] {
  if (agents.length <= cap) return [...agents];
  const featured = agents.filter((agent) => featuredSprite(agent.sprite));
  const rest = agents.filter((agent) => !featuredSprite(agent.sprite));
  let featureRoom = featured.length;
  let restRoom = Math.max(0, cap - featureRoom);
  // A lynx-heavy moment must not spend the whole picture on lynx and leave the hares out.
  if (rest.length > 0 && restRoom < Math.ceil(cap * 0.4)) {
    restRoom = Math.min(rest.length, Math.ceil(cap * 0.6));
    featureRoom = Math.min(featured.length, Math.max(0, cap - restRoom));
  }
  return [...rest.slice(0, restRoom), ...featured.slice(0, featureRoom)];
}

/** One frame of the journey. A trip that has begun stays at its station after the send. */
export function stepScroll(trip: ScrollTrip, playing: boolean, reduced: boolean, now: number, destination: number): { trip: ScrollTrip; travel: number } {
  if (playing && !reduced) {
    const started = trip.started ?? now;
    const elapsed = now - started;
    return {
      trip: { started, traveled: trip.traveled || elapsed >= SCROLL_TRIP_MS },
      travel: scrollTravel(true, false, elapsed, destination),
    };
  }
  const traveled = trip.traveled || trip.started != null || (reduced && playing);
  return { trip: { started: null, traveled }, travel: traveled ? destination : 0 };
}
