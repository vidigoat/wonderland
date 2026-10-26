import { createRng } from "./rng";
import type { Observation, Params, RulesModule } from "./rules";

export type RunResult = {
  history: Observation[];
  final: Observation;
};

/** Headless run — used by checks, the playtester and the AI rival's `run_experiment` tool. */
export async function runHeadless(
  rules: RulesModule,
  params: Params,
  steps: number,
  seed: number,
  sampleEvery = Math.max(1, Math.floor(steps / 200)),
): Promise<RunResult> {
  const rng = createRng(seed);
  let state = await rules.init(params, rng);
  const history: Observation[] = [rules.observe(state, params)];
  for (let i = 1; i <= steps; i++) {
    state = await rules.step(state, params, rng);
    if (i % sampleEvery === 0 || i === steps) history.push(rules.observe(state, params));
  }
  return { history, final: history[history.length - 1] };
}

/** Interactive session — used by the browser player. Keeps live state and lets knobs change mid-run. */
export class WorldSession<S = unknown> {
  private state!: S;
  private rng;
  readonly history: Observation[] = [];

  constructor(
    private rules: RulesModule<S>,
    public params: Params,
    seed: number,
  ) {
    this.rng = createRng(seed);
  }

  async start() {
    this.state = await this.rules.init(this.params, this.rng);
    this.history.push(this.rules.observe(this.state, this.params));
    return this;
  }

  async tick(n = 1) {
    for (let i = 0; i < n; i++) this.state = await this.rules.step(this.state, this.params, this.rng);
    const obs = this.rules.observe(this.state, this.params);
    this.history.push(obs);
    return obs;
  }

  setParam(id: string, value: Params[string]) {
    this.params = { ...this.params, [id]: value };
  }

  view() {
    return this.rules.view?.(this.state, this.params);
  }
}
