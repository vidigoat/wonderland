import type { Params, RulesModule } from "@/engine/rules";
import type { PublicWorldSpec } from "@/engine/spec";
import { runHeadless, WorldSession } from "@/engine/runtime";
import { defaultParams, runSteps } from "./readings";

export type Shot = { dataUrl: string; caption: string };

/** Move the first slider to the other end of its range. Other knobs stay put. */
export function changedParams(spec: Pick<PublicWorldSpec, "knobs">, base: Params): Params {
  const knob = spec.knobs.find(
    (item) => item.kind === "slider" && typeof item.min === "number" && typeof item.max === "number" && item.max !== item.min,
  );
  if (!knob || typeof knob.min !== "number" || typeof knob.max !== "number") return { ...base };
  const current = base[knob.id];
  const next = current === knob.max ? knob.min : knob.max;
  return { ...base, [knob.id]: next };
}

/** Say which control moved and how, so the watcher judges the second run against the right expectation. */
export function movedLabel(spec: Pick<PublicWorldSpec, "knobs">, before: Params, after: Params): string {
  const knob = spec.knobs.find((item) => before[item.id] !== after[item.id]);
  if (!knob) return "One control moved";
  return `${knob.label} moved from ${String(before[knob.id])} to ${String(after[knob.id])}`;
}

/** How far apart two final readings are, scale-free, summed over every numeric reading. */
export function readingDistance(a: Record<string, unknown>, b: Record<string, unknown>): number {
  let total = 0;
  for (const key of Object.keys(a)) {
    const x = Number(a[key]);
    const y = Number(b[key]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    total += Math.abs(x - y) / Math.max(Math.abs(x), Math.abs(y), 1e-9);
  }
  return total;
}

/** Each control's far ends, and the other side of each toggle: the changes a curious player would try. */
export function candidateChanges(spec: Pick<PublicWorldSpec, "knobs">, base: Params): Params[] {
  const out: Params[] = [];
  for (const knob of spec.knobs) {
    if (knob.kind === "slider" && typeof knob.min === "number" && typeof knob.max === "number" && knob.max !== knob.min) {
      for (const value of [knob.min, knob.max]) if (value !== base[knob.id]) out.push({ ...base, [knob.id]: value });
    } else if (knob.kind === "toggle") {
      out.push({ ...base, [knob.id]: !base[knob.id] });
    }
  }
  return out.slice(0, 8);
}

/**
 * The change worth filming: the one, among each control's far ends, that moves the readings furthest from the
 * starting run. Moving the first slider blindly can pick a change that does nothing visible (more coupling on
 * fireflies that already sync), and then the watcher rightly says the two runs look the same.
 */
export async function tellingChange(spec: PublicWorldSpec, rules: RulesModule, seed: number): Promise<Params> {
  const base = defaultParams(spec);
  const steps = (params: Params) => Math.min(2000, runSteps(spec.archetype, spec.id, params));
  const start = (await runHeadless(rules, base, steps(base), seed)).final;
  let best = changedParams(spec, base);
  let bestScore = -1;
  for (const params of candidateChanges(spec, base)) {
    try {
      const score = readingDistance(start, (await runHeadless(rules, params, steps(params), seed)).final);
      if (score > bestScore) {
        bestScore = score;
        best = params;
      }
    } catch {
      continue;
    }
  }
  return best;
}

async function waitForCanvas(canvas: () => HTMLCanvasElement | null): Promise<HTMLCanvasElement> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const picture = canvas();
    if (picture && picture.width >= 2) return picture;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The stage was not ready to be watched.");
}

export function shotCaption(label: string, index: number): string {
  const moment = index === 0 ? "just started" : index === 1 ? "midway" : "at the end";
  return `${label}, ${moment}`;
}

/** Shrink a canvas to at most 768px on its long side and return a JPEG data URL. */
export function canvasJpeg(source: HTMLCanvasElement, max = 768): string {
  const long = Math.max(source.width, source.height, 1);
  const scale = Math.min(1, max / long);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("The playtest could not read the picture.");
  ctx.drawImage(source, 0, 0, width, height);
  return out.toDataURL("image/jpeg", 0.72);
}

/**
 * Two short runs: the starting controls, then one control moved.
 * Three frames from each. The caller supplies the live canvas.
 */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    else setTimeout(resolve, 32);
  });
}

const PAINT_GRACE_MS = 2500;
const SETTLE_MS = 400;

export async function collectShots(
  spec: PublicWorldSpec,
  rules: RulesModule,
  canvas: () => HTMLCanvasElement | null,
  seed: number,
  onView?: (view: unknown, params: Params) => void,
): Promise<Shot[]> {
  const shots: Shot[] = [];
  const start = defaultParams(spec);
  const changed = await tellingChange(spec, rules, seed);
  const runs: { params: Params; label: string }[] = [
    { params: start, label: "Starting controls" },
    { params: changed, label: movedLabel(spec, start, changed) },
  ];
  await waitForCanvas(canvas);
  // The painting arrives after the canvas; a frame taken before it shows the drawn stand-in, not the world.
  await new Promise((resolve) => window.setTimeout(resolve, PAINT_GRACE_MS));
  for (const run of runs) {
    const session = await new WorldSession(rules, { ...run.params }, seed).start();
    // Watch one whole run, as a player's press would play it: start, halfway, end.
    const half = Math.max(1, Math.ceil(runSteps(spec.archetype, spec.id, run.params) / 2));
    for (let index = 0; index < 3; index++) {
      if (index > 0) await session.tick(half);
      onView?.(session.view(), { ...session.params });
      await nextPaint();
      // Figures ease to their new place and brightness over ~260 ms; a frame taken sooner shows the old picture.
      await new Promise((resolve) => window.setTimeout(resolve, SETTLE_MS));
      await nextPaint();
      const picture = canvas();
      if (!picture || picture.width < 2) throw new Error("The stage was not ready to be watched.");
      shots.push({ dataUrl: canvasJpeg(picture), caption: shotCaption(run.label, index) });
    }
  }
  return shots;
}
