import type { Assertion, Check, WorldSpec } from "./spec";
import type { Observation, RulesModule } from "./rules";
import { runHeadless } from "./runtime";

export type CheckResult = {
  id: string;
  description: string;
  passed: boolean;
  detail: string;
};

function series(history: Observation[], key: string): number[] {
  return history.map((o) => Number(o[key])).filter((v) => Number.isFinite(v));
}

/** Least-squares slope, normalised by the series' mean magnitude so thresholds are scale-free. */
function normalisedSlope(ys: number[]): number {
  const n = ys.length;
  if (n < 3) return 0;
  const xm = (n - 1) / 2;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - xm) * (y - ym);
    den += (x - xm) ** 2;
  });
  const scale = Math.max(Math.abs(ym), 1e-9);
  return (num / den) * n / scale;
}

export function evaluate(assertion: Assertion, history: Observation[]): { passed: boolean; detail: string } {
  const final = history[history.length - 1]?.[assertion.observable];
  const tol = assertion.tolerance ?? 0.1;
  switch (assertion.op) {
    case "gt":
      return { passed: Number(final) > Number(assertion.value), detail: `${final} > ${assertion.value}` };
    case "lt":
      return { passed: Number(final) < Number(assertion.value), detail: `${final} < ${assertion.value}` };
    case "eq":
      return { passed: String(final) === String(assertion.value), detail: `${final} == ${assertion.value}` };
    case "approx": {
      const target = Number(assertion.value);
      const rel = Math.abs(Number(final) - target) / Math.max(Math.abs(target), 1e-9);
      return { passed: rel <= tol, detail: `${final} ≈ ${target} (rel err ${rel.toFixed(3)} ≤ ${tol})` };
    }
    case "trendUp":
    case "trendDown":
    case "flat": {
      const s = normalisedSlope(series(history, assertion.observable));
      const passed = assertion.op === "trendUp" ? s > tol : assertion.op === "trendDown" ? s < -tol : Math.abs(s) <= tol;
      return { passed, detail: `normalised slope ${s.toFixed(3)} (${assertion.op}, tol ${tol})` };
    }
  }
}

/** A check passes only if it passes on every seed — no lucky runs. */
export async function runCheck(rules: RulesModule, spec: WorldSpec, check: Check): Promise<CheckResult> {
  const defaults = Object.fromEntries(spec.knobs.map((k) => [k.id, k.default]));
  const details: string[] = [];
  for (const seed of check.seeds) {
    const { history } = await runHeadless(rules, { ...defaults, ...check.params }, check.steps, seed);
    const r = evaluate(check.assert, history);
    details.push(`seed ${seed}: ${r.detail}`);
    if (!r.passed) return { id: check.id, description: check.description, passed: false, detail: details.join("; ") };
  }
  return { id: check.id, description: check.description, passed: true, detail: details.join("; ") };
}

export async function runAllChecks(rules: RulesModule, spec: WorldSpec): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  for (const c of spec.checks) out.push(await runCheck(rules, spec, c));
  return out;
}
