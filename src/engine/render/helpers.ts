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
  /** Grey ash. */
  ash: 0x9a968f,
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

/** A handful of lines, spread across the square, so one sentence is not stacked on itself. */
export function spokenIds(agents: { id: string | number; x: number; y?: number; bubble?: string | null }[], limit = 6): Set<string> {
  const voiced = agents.filter((agent) => agent.bubble?.trim()).sort((a, b) => a.x - b.x || (a.y ?? 0) - (b.y ?? 0));
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
