"use client";

import { useEffect, useRef, useState } from "react";
import type { Observation, Params } from "@/engine/rules";
import { WorldSession } from "@/engine/runtime";
import type { PublicWorldSpec } from "@/engine/spec";
import { builtinRules } from "@/worlds";

/**
 * SCAFFOLD PLAYER — functional but plain. Proves the engine runs in the browser.
 * TODO(agent: renderer + play-loop): replace the JSON view with the PixiJS stage (src/engine/render/*),
 * and wrap it in the predict → experiment → hypothesise → transfer loop with the rival panel.
 */
export function Player({ spec }: { spec: PublicWorldSpec }) {
  const [params, setParams] = useState<Params>(() => Object.fromEntries(spec.knobs.map((k) => [k.id, k.default])));
  const [obs, setObs] = useState<Observation | null>(null);
  const [running, setRunning] = useState(false);
  const session = useRef<WorldSession | null>(null);

  async function reset(p = params) {
    if (spec.rules.kind !== "builtin") return;
    session.current = await new WorldSession(builtinRules[spec.rules.module], p, Date.now() % 100000).start();
    setObs(session.current.history[0]);
  }

  useEffect(() => {
    void reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(steps: number) {
    if (!session.current) return;
    setRunning(true);
    session.current.params = params;
    let last: Observation | null = null;
    for (let i = 0; i < steps; i++) last = await session.current.tick();
    setObs(last);
    setRunning(false);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        {spec.knobs.map((k) => (
          <label key={k.id} className="block text-sm">
            <span className="mb-1 block font-medium">{k.label}</span>
            {k.kind === "slider" && (
              <input type="range" min={k.min} max={k.max} step={k.step} value={Number(params[k.id])} onChange={(e) => setParams({ ...params, [k.id]: Number(e.target.value) })} className="w-full" />
            )}
            {k.kind === "toggle" && <input type="checkbox" checked={Boolean(params[k.id])} onChange={(e) => setParams({ ...params, [k.id]: e.target.checked })} />}
            {k.kind === "text" && (
              <input className="w-full rounded border px-2 py-1 font-mono" value={String(params[k.id])} onChange={(e) => setParams({ ...params, [k.id]: e.target.value })} />
            )}
          </label>
        ))}
        <div className="flex gap-2">
          <button disabled={running} onClick={() => run(spec.archetype === "pipeline" ? 1 : 30)} className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50">
            Run
          </button>
          <button onClick={() => reset()} className="rounded border px-3 py-1.5">Reset</button>
        </div>
      </aside>
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Observations</h2>
        <pre className="overflow-auto rounded bg-neutral-100 p-4 text-sm dark:bg-neutral-900">{JSON.stringify(obs, null, 2)}</pre>
        <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Predict first</h2>
        <ul className="list-disc pl-5 text-sm">
          {spec.predictions.map((p) => (
            <li key={p.id}>{p.prompt}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
