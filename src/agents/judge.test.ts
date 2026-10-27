import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/lib/ai/meta", () => ({ think: vi.fn(), transcribe: vi.fn() }));

import { connection } from "next/server";
import { think } from "@/lib/ai/meta";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";
import { heroWorlds } from "@/worlds";
import { POST } from "@/app/api/judge/route";
import { ModelCallError, SAMPLE_REPLIES, WARMER_REPLY, containsSlice, judgeStatement, loadAgentPrompt, sampleJudge, scrubReply } from "@/agents/judge";

const KEYS = ["MODEL_API_KEY", "FIREWORKS_API_KEY", "BASETEN_API_KEY", "OPEN_WEIGHTS_PROVIDER"] as const;
const previous = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function expectNoLaw(text: string) {
  for (const hero of heroWorlds) {
    expect(text.includes(hero.science.hiddenLaw), hero.id).toBe(false);
    expect(containsSlice(text, hero.science.hiddenLaw), hero.id).toBe(false);
  }
}

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

describe("scrubReply", () => {
  it.each(heroWorlds)("replaces a reply that is the hidden law ($id)", (spec) => {
    expect(spec.science.hiddenLaw.length).toBeGreaterThanOrEqual(24);
    const cleaned = scrubReply(spec.science.hiddenLaw, spec);
    expect(cleaned).toBe(WARMER_REPLY);
    expect(cleaned.includes(spec.science.hiddenLaw)).toBe(false);
    expect(containsSlice(cleaned, spec.science.hiddenLaw)).toBe(false);
    const slice = spec.science.hiddenLaw.slice(8, 32);
    expect(slice).toHaveLength(24);
    const partial = scrubReply(`I would say ${slice} and stop.`, spec);
    expect(partial).toBe(WARMER_REPLY);
    expect(partial.includes(slice)).toBe(false);
    expect(scrubReply(spec.science.hiddenLaw.toUpperCase(), spec)).toBe(WARMER_REPLY);
  });

  it("fixed sample replies contain no hero hidden law", () => {
    for (const reply of Object.values(SAMPLE_REPLIES)) {
      expectNoLaw(reply);
      for (const hero of heroWorlds) expect(scrubReply(reply, hero)).toBe(reply);
    }
  });

  it("judge and rival prompts contain no hero hidden law", async () => {
    expectNoLaw(await loadAgentPrompt("judge"));
    expectNoLaw(await loadAgentPrompt("rival"));
  });
});

describe("sample judge", () => {
  it.each(heroWorlds)("marks the hidden law discovered without returning it ($id)", async (spec) => {
    const result = sampleJudge(spec, spec.science.hiddenLaw);
    expect(result.verdict).toBe("discovered");
    expect(result.reply).toBe(SAMPLE_REPLIES.discovered);
    expect(result.source).toBe("sample");
    expect(result.notice).toBe(SAMPLE_NOTICE);
    expect(result.nextExperiment).toBeUndefined();
    const blob = JSON.stringify(result);
    expect(blob.includes(spec.science.hiddenLaw)).toBe(false);
    expect(blob.includes(spec.science.plainStatement)).toBe(false);
    expect(blob.includes("answerKey")).toBe(false);
    expect(blob.includes("hiddenLaw")).toBe(false);
    expect(think).not.toHaveBeenCalled();
    const routed = await POST(new Request("http://local/api/judge", { method: "POST", body: JSON.stringify({ worldId: spec.id, statement: spec.science.hiddenLaw }) }));
    expect(routed.status).toBe(200);
    const body = await routed.json();
    expect(body.reply).toBe(SAMPLE_REPLIES.discovered);
    expect(JSON.stringify(body).includes(spec.science.hiddenLaw)).toBe(false);
    expect(connection).toHaveBeenCalled();
  });

  it("accepts the spoken demo sentence and still withholds the law", () => {
    const spec = heroWorlds.find((world) => world.id === "gatekeeper");
    if (!spec) throw new Error("missing gatekeeper");
    const statement = "a quote ends the words, so the rest of the scroll is run as the spell";
    const result = sampleJudge(spec, statement);
    expect(result.verdict).toBe("discovered");
    expect(result.reply).toBe(SAMPLE_REPLIES.discovered);
    expect(result.nextExperiment).toBeUndefined();
    expectNoLaw(JSON.stringify(result));
    expect(sampleJudge(spec, "A quote makes the scribe choke.").verdict).toBe("warmer");
  });

  it("uses the fixed replies for warmer and colder", () => {
    const warmer = sampleJudge(heroWorlds[0], "The quote makes the scribe choke.");
    expect(warmer).toMatchObject({ verdict: "warmer", reply: SAMPLE_REPLIES.warmer, source: "sample", notice: SAMPLE_NOTICE, nextExperiment: { sealed: true } });
    const colder = sampleJudge(heroWorlds[0], "You need the password to get in.");
    expect(colder.verdict).toBe("colder");
    expect(colder.reply).toBe(SAMPLE_REPLIES.colder);
    expect(colder.nextExperiment).toEqual({ name: "O'Brien", sealed: false });
    expectNoLaw(JSON.stringify(warmer));
    expectNoLaw(JSON.stringify(colder));
  });

  it("accepts a plain discovery in each world", () => {
    const said: Record<string, string> = {
      gatekeeper: "a quote ends the words, so the rest of the scroll is run as the spell",
      "peppered-forest": "The birds eat the moths that stand out, and not one moth changes colour.",
      "newtons-cannon": "It is still falling, only sideways, so it misses the ground.",
      "rumour-town": "Fear makes withdrawing rational, because the bank keeps only a fraction of the cash. Insurance removes the reason.",
      firebreak: "The fire spreads to neighbouring trees, and a wide gap stops a dense planting from spanning the ridge.",
    };
    for (const hero of heroWorlds) {
      const result = sampleJudge(hero, said[hero.id] ?? "");
      expect(result.verdict, hero.id).toBe("discovered");
      expect(result.reply).toBe(SAMPLE_REPLIES.discovered);
      expectNoLaw(JSON.stringify(result));
    }
  });

  it("looks for a causal idea in each hero", () => {
    const cases: Record<string, { warmer: string; colder: string }> = {
      gatekeeper: { warmer: "A quote makes the scribe choke.", colder: "You need the password to get in." },
      "peppered-forest": { warmer: "Birds eat the moths that stand out.", colder: "Each moth darkens itself to match the bark." },
      "newtons-cannon": { warmer: "More speed sends it further, maybe into an orbit.", colder: "There is no gravity in orbit, so it stays up." },
      "rumour-town": { warmer: "Insurance might calm people down.", colder: "The bank only fails when its loans have gone bad." },
      firebreak: { warmer: "A gap in the middle might matter.", colder: "Wind is the only reason a fire travels." },
    };
    for (const hero of heroWorlds) {
      const probe = cases[hero.id];
      expect(sampleJudge(hero, probe.warmer).verdict, hero.id).toBe("warmer");
      expect(sampleJudge(hero, probe.colder).verdict, hero.id).toBe("colder");
      expect(sampleJudge(hero, "Hello.").verdict, hero.id).toBe("colder");
    }
  });
});

describe("live judge", () => {
  it("scrubs a reply that quotes the law and does not return it", async () => {
    process.env.MODEL_API_KEY = "present";
    const spec = heroWorlds.find((world) => world.id === "firebreak");
    if (!spec) throw new Error("missing firebreak");
    vi.mocked(think).mockResolvedValueOnce(JSON.stringify({ verdict: "discovered", reply: spec.science.hiddenLaw, nextExperiment: { density: spec.science.hiddenLaw } }));
    const result = await judgeStatement(spec, "a guess");
    expect(think).toHaveBeenCalledOnce();
    const call = vi.mocked(think).mock.calls[0][0];
    expect(call.jsonSchema?.name).toBe("JudgeVerdict");
    expect(String(call.input).includes(spec.science.hiddenLaw)).toBe(true);
    expect(result.verdict).toBe("discovered");
    expect(result.reply).toBe(WARMER_REPLY);
    expect(result.source).toBe("live");
    expect(result.notice).toBeUndefined();
    expect(JSON.stringify(result).includes(spec.science.hiddenLaw)).toBe(false);
    expect(JSON.stringify(result).includes(spec.science.plainStatement)).toBe(false);
  });

  it("returns 502 when the model throws and does not invent a reply", async () => {
    process.env.MODEL_API_KEY = "present";
    vi.mocked(think).mockRejectedValueOnce(new Error("spark down"));
    const res = await POST(new Request("http://local/api/judge", { method: "POST", body: JSON.stringify({ worldId: "gatekeeper", statement: "a guess" }) }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ source: "live", message: "spark down" });
  });

  it("wraps a thrown model error", async () => {
    process.env.MODEL_API_KEY = "present";
    vi.mocked(think).mockRejectedValueOnce(new Error("spark down"));
    const spec = heroWorlds[0];
    await expect(judgeStatement(spec, "a guess")).rejects.toBeInstanceOf(ModelCallError);
  });
});
