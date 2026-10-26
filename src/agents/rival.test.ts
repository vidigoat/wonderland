import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/lib/ai/clients", () => ({ openWeights: vi.fn() }));

import { openWeights } from "@/lib/ai/clients";
import { loadRules } from "@/engine/load";
import { runHeadless } from "@/engine/runtime";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";
import { heroWorlds } from "@/worlds";
import { containsSlice } from "@/agents/judge";
import { POST } from "@/app/api/rival/route";
import { SAMPLE_HYPOTHESES, SAMPLE_HYPOTHESIS_FALLBACK, SAMPLE_THOUGHTS, resetRivalMemory, rivalTurn, sampleRunSteps } from "@/agents/rival";

const KEYS = ["MODEL_API_KEY", "FIREWORKS_API_KEY", "BASETEN_API_KEY", "OPEN_WEIGHTS_PROVIDER"] as const;
const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function expectNoLaw(text: string) {
  for (const hero of heroWorlds) {
    expect(text.includes(hero.science.hiddenLaw), hero.id).toBe(false);
    expect(text.includes(hero.science.plainStatement), hero.id).toBe(false);
    expect(containsSlice(text, hero.science.hiddenLaw), hero.id).toBe(false);
  }
}

beforeEach(() => {
  for (const key of KEYS) delete process.env[key];
  resetRivalMemory();
  vi.clearAllMocks();
});

afterEach(() => {
  for (const key of KEYS) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

describe("sample rival lines", () => {
  it("fixed thoughts and hypotheses contain no hero hidden law", () => {
    for (const thought of SAMPLE_THOUGHTS) {
      expect(thought.split(/\s+/).length).toBeLessThanOrEqual(25);
      expectNoLaw(thought);
    }
    expectNoLaw(SAMPLE_HYPOTHESIS_FALLBACK);
    for (const hero of heroWorlds) {
      const line = SAMPLE_HYPOTHESES[hero.id];
      expect(line).toBeTruthy();
      expect(line).not.toBe(hero.science.hiddenLaw);
      expect(line).not.toBe(hero.science.plainStatement);
      expectNoLaw(line);
    }
  });
});

describe("sample rival policy", () => {
  it.each(heroWorlds)("changes one knob, runs, observes, then guesses incompletely ($id)", async (spec) => {
    const seed = 11;
    const set = await rivalTurn(spec, seed, {}, 0);
    expect(set.source).toBe("sample");
    expect(set.notice).toBe(SAMPLE_NOTICE);
    expect(set.thought).toBe(SAMPLE_THOUGHTS[0]);
    expect(set.tool.name).toBe("set_knob");
    if (set.tool.name !== "set_knob") return;
    const moved = spec.knobs.filter((knob) => set.params[knob.id] !== knob.default).map((knob) => knob.id);
    expect(moved).toEqual([set.tool.id]);
    expect(set.params[set.tool.id]).toBe(set.tool.value);
    expect(set.observation).toBeUndefined();
    expectNoLaw(JSON.stringify(set));

    const run = await rivalTurn(spec, seed, set.params, 1);
    expect(run.thought).toBe(SAMPLE_THOUGHTS[1]);
    expect(run.tool).toEqual({ name: "run", steps: sampleRunSteps(spec.id) });
    const expected = await runHeadless(loadRules(spec), run.params, sampleRunSteps(spec.id), seed);
    expect(run.observation).toEqual(expected.final);
    expectNoLaw(JSON.stringify(run));

    const observed = await rivalTurn(spec, seed, run.params, 2);
    expect(observed.thought).toBe(SAMPLE_THOUGHTS[2]);
    expect(observed.tool).toEqual({ name: "observe" });
    const initial = await runHeadless(loadRules(spec), observed.params, 0, seed);
    expect(observed.observation).toEqual(initial.final);

    const guess = await rivalTurn(spec, seed, observed.params, 3);
    expect(guess.thought).toBe(SAMPLE_THOUGHTS[3]);
    expect(guess.tool).toEqual({ name: "hypothesise", statement: SAMPLE_HYPOTHESES[spec.id] });
    expect(guess.observation).toBeUndefined();
    expect(openWeights).not.toHaveBeenCalled();
  });

  it("advances a seed when the client does not send a turn", async () => {
    const first = await POST(new Request("http://local/api/rival", { method: "POST", body: JSON.stringify({ worldId: "rumour-town", seed: 7, params: {} }) }));
    const second = await POST(new Request("http://local/api/rival", { method: "POST", body: JSON.stringify({ worldId: "rumour-town", seed: 7, params: {} }) }));
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(firstBody.tool.name).toBe("set_knob");
    expect(secondBody.tool.name).toBe("run");
  });
});

describe("live rival", () => {
  it("returns 502 when the provider throws and does not invent a thought", async () => {
    process.env.FIREWORKS_API_KEY = "present";
    vi.mocked(openWeights).mockImplementation(() => {
      throw new Error("provider down");
    });
    const res = await POST(new Request("http://local/api/rival", { method: "POST", body: JSON.stringify({ worldId: "gatekeeper", seed: 3, params: {} }) }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ source: "live", message: "provider down" });
  });

  it("runs the engine and does not send the hidden law", async () => {
    process.env.FIREWORKS_API_KEY = "present";
    const spec = heroWorlds.find((world) => world.id === "gatekeeper");
    if (!spec) throw new Error("missing gatekeeper");
    const create = vi.fn(async () => ({
      choices: [{ message: { content: "Trying one short run.", tool_calls: [{ id: "call_1", type: "function", function: { name: "run", arguments: JSON.stringify({ steps: 1 }) } }] } }],
    }));
    vi.mocked(openWeights).mockReturnValue({ model: "test-model", client: { chat: { completions: { create } } } } as never);
    const res = await POST(new Request("http://local/api/rival", { method: "POST", body: JSON.stringify({ worldId: spec.id, seed: 5, params: { name: "traveller", pass: "", sealed: false } }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("live");
    expect(body.notice).toBeUndefined();
    expect(body.thought).toBe("Trying one short run.");
    expect(body.tool).toEqual({ name: "run", steps: 1 });
    const expected = await runHeadless(loadRules(spec), body.params, 1, 5);
    expect(body.observation).toEqual(expected.final);
    const sent = JSON.stringify((create.mock.calls as unknown[][])[0]?.[0]);
    expect(sent.includes(spec.science.hiddenLaw)).toBe(false);
    expect(containsSlice(sent, spec.science.hiddenLaw)).toBe(false);
    expectNoLaw(JSON.stringify(body));
  });

  it("scrubs a thought that quotes the law", async () => {
    process.env.FIREWORKS_API_KEY = "present";
    const spec = heroWorlds.find((world) => world.id === "newtons-cannon");
    if (!spec) throw new Error("missing cannon");
    const create = vi.fn(async () => ({
      choices: [{
        message: {
          content: spec.science.hiddenLaw,
          tool_calls: [{ id: "call_1", type: "function", function: { name: "hypothesise", arguments: JSON.stringify({ statement: spec.science.hiddenLaw }) } }],
        },
      }],
    }));
    vi.mocked(openWeights).mockReturnValue({ model: "test-model", client: { chat: { completions: { create } } } } as never);
    const body = await (await POST(new Request("http://local/api/rival", { method: "POST", body: JSON.stringify({ worldId: spec.id, seed: 9, params: { speed: 0.5 } }) }))).json();
    expect(body.thought).toBe("Part of that holds. What changes if you move only one thing?");
    expect(body.tool.statement).toBe(body.thought);
    expect(JSON.stringify(body).includes(spec.science.hiddenLaw)).toBe(false);
  });
});
