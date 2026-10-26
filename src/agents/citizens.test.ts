import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/lib/ai/clients", () => ({ openWeights: vi.fn() }));

import { openWeights } from "@/lib/ai/clients";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";
import { heroWorlds } from "@/worlds";
import { containsSlice } from "@/agents/judge";
import { CITIZEN_SYSTEM, OPEN_WEIGHTS_FAILURE_NOTICE, decideCitizens } from "@/agents/citizens";
import { POST } from "@/app/api/citizens/route";

const KEYS = ["MODEL_API_KEY", "FIREWORKS_API_KEY", "BASETEN_API_KEY", "OPEN_WEIGHTS_PROVIDER"] as const;
const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
const rumour = heroWorlds.find((world) => world.id === "rumour-town");
if (!rumour) throw new Error("missing rumour-town");

const citizens = [
  { id: 0, x: 0.1, y: 0.1, worried: 0.2, says: "Fine morning." },
  { id: 1, x: 0.8, y: 0.8, worried: 0.9, says: "People are queuing." },
];

beforeEach(() => {
  for (const key of KEYS) delete process.env[key];
  vi.clearAllMocks();
});

afterEach(() => {
  for (const key of KEYS) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

function request(body: unknown) {
  return new Request("http://local/api/citizens", { method: "POST", body: JSON.stringify(body) });
}

describe("citizens", () => {
  it("sample citizens do not call the model", async () => {
    const result = await decideCitizens(rumour, citizens, { insurance: false });
    expect(result).toEqual({ source: "sample", notice: SAMPLE_NOTICE, decisions: null });
    expect(openWeights).not.toHaveBeenCalled();
    const res = await POST(request({ worldId: "rumour-town", citizens, params: { insurance: false } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ source: "sample", notice: SAMPLE_NOTICE, decisions: null });
    expect(containsSlice(CITIZEN_SYSTEM, rumour.science.hiddenLaw)).toBe(false);
    expect(CITIZEN_SYSTEM.includes(rumour.science.hiddenLaw)).toBe(false);
  });

  it("open-weights failure falls back with an honest notice", async () => {
    process.env.FIREWORKS_API_KEY = "present";
    vi.mocked(openWeights).mockReturnValue({
      model: "test-model",
      client: { chat: { completions: { create: vi.fn(async () => { throw new Error("glimmer down"); }) } } },
    } as never);
    const result = await decideCitizens(rumour, citizens, {});
    expect(result).toEqual({ source: "sample", notice: OPEN_WEIGHTS_FAILURE_NOTICE, decisions: null });
    expect(openWeights).toHaveBeenCalled();
  });

  it("live decisions scrub a line that quotes the law", async () => {
    process.env.FIREWORKS_API_KEY = "present";
    const create = vi.fn(async () => ({
      choices: [{ message: { content: JSON.stringify({ worried: 0.4, withdraw: false, says: rumour.science.hiddenLaw }) } }],
    }));
    vi.mocked(openWeights).mockReturnValue({ model: "test-model", client: { chat: { completions: { create } } } } as never);
    const result = await decideCitizens(rumour, citizens, { insurance: true });
    expect(result.source).toBe("live");
    expect(result.decisions).toEqual([
      { id: 0, worried: 0.4, withdraw: false, says: null },
      { id: 1, worried: 0.4, withdraw: false, says: null },
    ]);
    expect(create).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result).includes(rumour.science.hiddenLaw)).toBe(false);
    const sent = JSON.stringify(create.mock.calls);
    expect(sent.includes(rumour.science.hiddenLaw)).toBe(false);
  });

  it("rejects a world that is not rumour-town", async () => {
    const res = await POST(request({ worldId: "gatekeeper", citizens, params: {} }));
    expect(res.status).toBe(400);
    expect(openWeights).not.toHaveBeenCalled();
  });
});
