import { describe, expect, it } from "vitest";
import { compileSandboxed } from "@/engine/sandbox.server";
import { WorldSpec, type WorldSpec as Spec } from "@/engine/spec";
import { lintHonestReadings } from "./honesty";

function world(source: string, builtin = false): Spec {
  return WorldSpec.parse({
    id: "drift",
    version: 1,
    concept: "test",
    title: "Drift",
    tagline: "A dot that drifts.",
    archetype: "field",
    science: {
      hiddenLaw: "SECRET_LAW_VALUE",
      plainStatement: "SECRET_PLAIN_VALUE",
      misconceptions: ["wind does nothing"],
      sources: [{ title: "Notes", url: "https://example.com/notes" }],
    },
    story: { setting: "A desk.", mystery: "What moves the dot?", goal: "Move the dot." },
    knobs: [{ id: "wind", label: "Wind", kind: "slider", min: 0, max: 4, step: 1, default: 1 }],
    observables: [
      { id: "position", label: "Where the dot is" },
      { id: "speed", label: "How fast it moves" },
    ],
    entities: [{ id: "dot", label: "Dot", artPrompt: "a dot", segmentPrompt: "dot" }],
    rules: builtin ? { kind: "builtin", module: "not-run" } : { kind: "js", source },
    predictions: [{ id: "more", prompt: "More wind?", options: ["same", "further"], answerKey: 1, tryWith: { wind: 4 } }],
    transfer: { setup: "Another desk.", params: { wind: 4 }, question: "What changes?", answerKey: "further" },
    checks: [
      { id: "moves", description: "wind moves it", params: { wind: 2 }, steps: 4, seeds: [1], assert: { observable: "position", op: "gt", value: 0 } },
      { id: "still", description: "no wind, no drift", params: { wind: 0 }, steps: 4, seeds: [1], assert: { observable: "position", op: "eq", value: 0 } },
    ],
    art: { style: "flat", background: "white" },
  });
}

const MEASURED = `
exports.init = () => ({ x: 0, last: 0 });
exports.step = (state, params) => ({ x: state.x + Number(params.wind), last: Number(params.wind) });
exports.observe = (state) => ({ position: state.x, speed: state.last });
`;

const FAKED = `
exports.init = () => ({ x: 0 });
exports.step = (state, params) => ({ x: state.x + Number(params.wind) });
exports.observe = (state, params) => ({ position: state.x, speed: Number(params.wind) * 0.5 });
`;

/** Normalising a measured amount by a setting is fine: the world still decides the value. */
const NORMALISED = `
exports.init = () => ({ x: 0 });
exports.step = (state, params) => ({ x: state.x + Number(params.wind) });
exports.observe = (state, params) => ({ position: state.x, speed: state.x / Math.max(1, Number(params.wind)) });
`;

describe("honest-readings check", () => {
  it("accepts readings measured from the world", async () => {
    const spec = world(MEASURED);
    expect(await lintHonestReadings(compileSandboxed(MEASURED), spec)).toEqual([]);
  });

  it("flags a reading computed from a knob instead of the world", async () => {
    const spec = world(FAKED);
    const issues = await lintHonestReadings(compileSandboxed(FAKED), spec);
    expect(issues.map((issue) => [issue.id, issue.knob])).toEqual([["speed", "wind"]]);
    expect(issues[0]?.note).not.toContain("SECRET");
  });

  it("accepts a measured reading scaled by a setting", async () => {
    const spec = world(NORMALISED);
    expect(await lintHonestReadings(compileSandboxed(NORMALISED), spec)).toEqual([]);
  });

  it("leaves hand-built worlds alone", async () => {
    const spec = world(FAKED, true);
    expect(await lintHonestReadings(compileSandboxed(FAKED), spec)).toEqual([]);
  });
});
