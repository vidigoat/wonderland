import type { Observation } from "@/engine/rules";
import type { Observable } from "@/engine/spec";

export type ChartSeries = { id: string; label: string; points: number[] };

function changes(points: number[]): boolean {
  const first = points[0];
  return points.some((point) => point !== first);
}

/** Up to three numeric readings. Ones that move during the run come first. */
export function chartSeries(observables: Observable[], history: Observation[]): ChartSeries[] {
  const built: ChartSeries[] = [];
  for (const item of observables) {
    if (item.id === "query" || item.display === "text") continue;
    const points: number[] = [];
    let numeric = true;
    for (const row of history) {
      const value = row[item.id];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        numeric = false;
        break;
      }
      points.push(value);
    }
    if (numeric && points.length > 0) built.push({ id: item.id, label: item.label, points });
  }
  const order = new Map(observables.map((item, index) => [item.id, index]));
  const kind = new Map(observables.map((item) => [item.id, item.display]));
  const rank = (series: ChartSeries) => (kind.get(series.id) === "counter" ? 0 : 100) + (order.get(series.id) ?? 0);
  const moving = built.filter((series) => changes(series.points)).sort((a, b) => rank(a) - rank(b));
  const still = built.filter((series) => !changes(series.points)).sort((a, b) => rank(a) - rank(b));
  return [...moving, ...still].slice(0, 3);
}

export type DrawnLine = { id: string; label: string; current: string; previous: string | null };

function extent(values: number[]): { min: number; max: number } {
  let min = values[0] ?? 0;
  let max = min;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (max - min < 1e-9) return { min: min - 1, max: max + 1 };
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function pathFor(
  points: number[],
  domain: { min: number; max: number },
  padX: number,
  padY: number,
  innerW: number,
  innerH: number,
): string {
  const span = domain.max - domain.min || 1;
  return points
    .map((value, index) => {
      const x = padX + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
      const y = padY + (1 - (value - domain.min) / span) * innerH;
      return `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`;
    })
    .join(" ");
}

/** Current run in front, previous run on the same scale so a change can be compared. */
export function chartLines(current: ChartSeries[], previous: ChartSeries[] | null, width: number, height: number): DrawnLine[] {
  const prior = new Map((previous ?? []).map((series) => [series.id, series.points]));
  const padX = 8;
  const padY = 10;
  const innerW = Math.max(1, width - padX * 2);
  const innerH = Math.max(1, height - padY * 2);
  return current.map((series) => {
    const before = prior.get(series.id) ?? null;
    const domain = extent([...(before ?? []), ...series.points]);
    return {
      id: series.id,
      label: series.label,
      current: pathFor(series.points, domain, padX, padY, innerW, innerH),
      previous: before && before.length > 1 ? pathFor(before, domain, padX, padY, innerW, innerH) : null,
    };
  });
}
