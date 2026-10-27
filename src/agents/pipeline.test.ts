import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const think = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/meta", () => ({
  think,
}));

import { generateWorld, type PipelineEvent } from "./pipeline";
import { ScientistBrief } from "./structured";
import { WorldSpec, type WorldSpec as Spec } from "@/engine/spec";
import { SAMPLE_NOTICE } from "@/lib/samples/mark";

const LAW = "SENTINEL_LAW_do_not_leak_9f3a";
const PLAIN = "SENTINEL_PLAIN_do_not_leak";

function passingWorld(): Spec {
  return WorldSpec.parse({
    id: "tiny-live",
    version: 1,
    concept: "Why does the counter grow?",
    title: "Tiny Counter",
    tagline: "A counter with a dial.",
    archetype: "field",
    science: {
      hiddenLaw: LAW,
      plainStatement: PLAIN,
      misconceptions: ["The dial does nothing."],
      sources: [{ title: "Notes", url: "https://example.com/notes" }],
    },
    story: { setting: "A desk.", mystery: "What does the dial do?", goal: "Move the total." },
    knobs: [{ id: "gain", label: "Gain", kind: "slider", min: 0, max: 4, step: 1, default: 1 }],
    observables: [{ id: "total", label: "Total" }],
    entities: [{ id: "dot", label: "Dot", artPrompt: "a dot", segmentPrompt: "dot" }],
    rules: {
      kind: "js",
      source: `
        exports.init = () => ({ total: 0 });
        exports.step = (state, params) => ({ total: state.total + Number(params.gain) });
        exports.observe = (state) => ({ total: state.total });
        exports.view = (state) => ({ kind: "field", grid: [state.total], w: 1, h: 1 });
      `,
    },
    predictions: [{ id: "higher", prompt: "Turn the dial up.", options: ["same", "higher"], answerKey: 1, tryWith: { gain: 4 } }],
    transfer: { setup: "Another dial.", params: { gain: 4 }, question: "What changes?", answerKey: "the total grows faster" },
    checks: [
      { id: "grows", description: "gain adds", params: { gain: 2 }, steps: 4, seeds: [1], assert: { observable: "total", op: "gt", value: 0 } },
      { id: "still", description: "zero stays", params: { gain: 0 }, steps: 4, seeds: [1], assert: { observable: "total", op: "eq", value: 0 } },
    ],
    art: { style: "flat", background: "white" },
  });
}

function brief() {
  return ScientistBrief.parse({
    law: LAW,
    plainStatement: PLAIN,
    misconceptions: ["The dial does nothing."],
    sources: [{ title: "Notes", url: "https://example.com/notes" }],
    archetype: "field",
    checks: passingWorld().checks,
    refuse: false,
    reason: "",
  });
}

async function collect(concept: string, maxRepairs?: number): Promise<PipelineEvent[]> {
  const events: PipelineEvent[] = [];
  for await (const event of generateWorld(concept, maxRepairs)) events.push(event);
  return events;
}

function visibleText(events: PipelineEvent[]): string {
  return events
    .map((event) => {
      if (event.type === "world") return "";
      if (event.type === "checks") return event.results.map((result) => result.id).join(" ");
      return `${event.message} ${"notice" in event ? event.notice ?? "" : ""}`;
    })
    .join("\n");
}

describe("generateWorld", () => {
  beforeEach(() => {
    think.mockReset();
    delete process.env.MODEL_API_KEY;
  });

  afterEach(async () => {
    await rm(path.join(process.cwd(), "data", "worlds", "tiny-live.json"), { force: true });
    await rm(path.join(process.cwd(), "public", "art", "tiny-live"), { recursive: true, force: true });
  });

  it("does not call the model in sample mode", async () => {
    think.mockImplementation(() => {
      throw new Error("think() must not be called");
    });
    const events = await collect("Why do traffic jams appear out of nowhere?");
    expect(think).not.toHaveBeenCalled();
    const choose = events.find((event) => event.type === "choose");
    expect(choose?.type).toBe("choose");
    if (choose?.type === "choose") {
      expect(choose.worlds).toHaveLength(5);
      expect(choose.notice.startsWith(SAMPLE_NOTICE)).toBe(true);
    }
    expect(events.some((event) => event.type === "world")).toBe(false);
  });

  it("streams a matched hero as a labeled sample, not a model world", async () => {
    think.mockImplementation(() => {
      throw new Error("think() must not be called");
    });
    const events = await collect("Why does SQL injection work?");
    expect(think).not.toHaveBeenCalled();
    const world = events.find((event) => event.type === "world");
    expect(world && world.type === "world" ? world.spec.id : "").toBe("gatekeeper");
    expect(world && "notice" in world ? world.notice : "").toContain(SAMPLE_NOTICE);
    expect(visibleText(events)).not.toContain("The scribe builds the command");
  });

  it("asks the model for schemas, hides the law, and reports a failed artist step", async () => {
    process.env.MODEL_API_KEY = "test-key";
    const spec = passingWorld();
    think.mockImplementation(async (opts: { jsonSchema?: { name: string }; input: string }) => {
      if (opts.jsonSchema?.name === "ScientistBrief") return JSON.stringify(brief());
      if (opts.jsonSchema?.name === "WorldSpec") return JSON.stringify(spec);
      throw new Error(`unexpected schema ${opts.jsonSchema?.name}`);
    });

    const events = await collect("Why does the counter grow?");
    expect(think).toHaveBeenCalledTimes(2);
    const scientistCall = think.mock.calls[0][0] as { jsonSchema: { schema: Record<string, unknown> } };
    const designerCall = think.mock.calls[1][0] as { jsonSchema: { schema: Record<string, unknown> }; input: string };
    expect(scientistCall.jsonSchema.schema.type).toBe("object");
    expect(designerCall.jsonSchema.schema.type).toBe("object");
    expect(JSON.stringify(designerCall.jsonSchema.schema)).not.toContain("~standard");
    expect(designerCall.input).toContain(LAW);

    expect(events.every((event) => event.source === "live")).toBe(true);
    expect(visibleText(events)).not.toContain(LAW);
    expect(visibleText(events)).not.toContain(PLAIN);
    expect(visibleText(events)).toContain("███");
    expect(visibleText(events)).not.toContain(SAMPLE_NOTICE);

    const world = events.find((event) => event.type === "world");
    expect(world && world.type === "world" ? world.spec.id : "").toBe("tiny-live");
    const checks = events.find((event) => event.type === "checks");
    expect(checks && checks.type === "checks" ? checks.results.every((result) => result.passed) : false).toBe(true);
    expect(events.some((event) => event.type === "stage" && event.stage === "artist" && /Artist step failed/.test(event.message))).toBe(true);
    expect(events.some((event) => event.type === "error" && /failed/i.test(event.message))).toBe(true);
    expect(events.some((event) => event.type === "stage" && event.stage === "done")).toBe(false);
  });

  it("refuses without designing a world", async () => {
    process.env.MODEL_API_KEY = "test-key";
    think.mockResolvedValue(JSON.stringify({ ...brief(), refuse: true, reason: "medical advice" }));
    const events = await collect("How do I treat this?");
    expect(think).toHaveBeenCalledTimes(1);
    expect(events.some((event) => event.type === "world")).toBe(false);
    expect(events.some((event) => event.type === "error" && event.message.includes("medical advice"))).toBe(true);
    expect(visibleText(events)).not.toContain(LAW);
  });

  it("sends playability failures back to the designer", async () => {
    process.env.MODEL_API_KEY = "test-key";
    const dead = passingWorld();
    dead.knobs.push({ id: "mute", label: "Mute", kind: "toggle", default: false });
    const fixed = passingWorld();
    const designed: string[] = [];
    think.mockImplementation(async (opts: { jsonSchema?: { name: string }; input: string }) => {
      if (opts.jsonSchema?.name === "ScientistBrief") return JSON.stringify(brief());
      designed.push(opts.input);
      if (designed.length === 1) return JSON.stringify(dead);
      return JSON.stringify(fixed);
    });

    const events = await collect("Why does the counter grow?");
    expect(designed).toHaveLength(2);
    expect(designed[1]).toContain("mute");
    expect(designed[1]).toContain("Playability lint failed");
    expect(events.some((event) => event.type === "stage" && event.stage === "repair" && event.message.includes("Playability"))).toBe(true);
    expect(visibleText(events)).not.toContain(LAW);
    const worlds = events.filter((event) => event.type === "world");
    expect(worlds).toHaveLength(1);
  });
});

describe("worldId", () => {
  it("turns model ids into storage-safe kebab-case", async () => {
    const { worldId } = await import("./pipeline");
    expect(worldId("counterflowCorridor", "x")).toBe("counterflow-corridor");
    expect(worldId("Ghost Jam Circuit!", "x")).toBe("ghost-jam-circuit");
    expect(worldId("", "The Meadow")).toBe("the-meadow");
  });
});
