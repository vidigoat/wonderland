import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const look = vi.fn();
vi.mock("@/lib/ai/meta", () => ({ look: (...args: unknown[]) => look(...args) }));

import type { WorldSpec } from "@/engine/spec";
import { playtestPrompt, readFrames, savePlaytest, scrubNotes, watchWorld } from "./playtest";

const LAW = "Prey peaks lead predator peaks because each population's growth depends on the other.";

function spec(): WorldSpec {
  return {
    id: "valley",
    version: 1,
    concept: "cycles",
    title: "The Valley",
    tagline: "Two herds",
    archetype: "population",
    science: {
      hiddenLaw: LAW,
      plainStatement: LAW,
      misconceptions: [],
      sources: [],
    },
    story: { setting: "A valley.", mystery: "Why the waves?", goal: "Find the rhythm." },
    knobs: [{ id: "hares", label: "Hares", kind: "slider", min: 0, max: 10, default: 4 }],
    observables: [{ id: "count", label: "Hares alive", display: "counter" }],
    entities: [{ id: "hare", label: "Hare", artPrompt: "hare", segmentPrompt: "hare" }],
    rules: { kind: "builtin", module: "peppered-forest" },
    predictions: [{ id: "p", prompt: "What happens?", options: ["A", "B"], answerKey: 0 }],
    transfer: { setup: "A new valley.", params: {}, question: "Again?", options: ["A", "B"], answerKey: 0 },
    checks: [],
    art: { style: "ink", background: "hills" },
  } as unknown as WorldSpec;
}

const frame = { dataUrl: "data:image/jpeg;base64,aGVsbG8=", caption: "Default run" };

describe("playtest frames", () => {
  it("accepts up to six jpeg frames and refuses anything else", () => {
    expect(readFrames([frame])).toEqual([frame]);
    expect(readFrames([])).toBeNull();
    expect(readFrames(Array.from({ length: 7 }, () => frame))).toBeNull();
    expect(readFrames([{ dataUrl: "data:image/png;base64,aGVsbG8=", caption: "Default run" }])).toBeNull();
    expect(readFrames([{ dataUrl: frame.dataUrl, caption: "  " }])).toBeNull();
  });
});

describe("playtest notes", () => {
  it("asks Spark to judge the frames without handing the law back", () => {
    const prompt = playtestPrompt(spec(), [frame]);
    expect(prompt).toContain(LAW);
    expect(prompt).toContain("Do not quote");
    expect(prompt).toContain("Default run");
  });

  it("strips a note that repeats the law", () => {
    const notes = scrubNotes([`I can see it: ${LAW}`, "The hares are on the meadow."], spec());
    expect(notes.join(" ")).not.toContain("Prey peaks lead");
    expect(notes).toContain("The hares are on the meadow.");
  });
});

describe("watchWorld", () => {
  beforeEach(() => {
    look.mockReset();
    delete process.env.MODEL_API_KEY;
  });

  it("does not call Spark when there is no key", async () => {
    const result = await watchWorld(spec(), [frame]);
    expect(look).not.toHaveBeenCalled();
    expect(result.source).toBe("sample");
    expect(result.verdict).toBe("concern");
    expect(result.notes.join(" ")).toContain("did not watch");
    expect(result.notice).toBeTruthy();
  });

  it("scrubs a live reply and stores it", async () => {
    process.env.MODEL_API_KEY = "test-key";
    look.mockResolvedValue(JSON.stringify({ verdict: "looks-right", notes: [`The law is ${LAW}`, "The herd grew."] }));
    const result = await watchWorld(spec(), [frame, { ...frame, caption: "More hares" }]);
    expect(look).toHaveBeenCalledOnce();
    const call = look.mock.calls[0]?.[0] as { images: string[] };
    expect(call.images).toHaveLength(2);
    expect(result.source).toBe("live");
    expect(result.verdict).toBe("looks-right");
    expect(result.notes.join(" ")).not.toContain("Prey peaks lead");
    expect(result.notes).toContain("The herd grew.");
    const dir = await mkdtemp(path.join(os.tmpdir(), "playtest-"));
    await savePlaytest("valley", result, dir);
    const saved = JSON.parse(await readFile(path.join(dir, "valley.json"), "utf8")) as { notes: string[] };
    expect(saved.notes.join(" ")).not.toContain("Prey peaks lead");
  });
});
