import { describe, expect, it } from "vitest";
import { compileSandboxed } from "@/engine/sandbox.server";
import { WorldSpec, type WorldSpec as Spec } from "@/engine/spec";
import { lintPlayability } from "./playability";

const SOURCE = `
exports.init = (params) => ({ total: 0, label: String(params.label), mode: String(params.mode), boost: params.boost ? 1 : 0 });
exports.step = (state, params) => {
  const gain = Number(params.gain);
  const boost = params.boost ? 2 : 1;
  const mode = params.mode === "fast" ? 3 : 1;
  return { total: state.total + gain * boost * mode, label: String(params.label), mode: String(params.mode), boost: params.boost ? 1 : 0 };
};
exports.observe = (state) => ({ total: state.total, label: state.label, mode: state.mode, boost: state.boost });
exports.view = (state) => ({ kind: "field", grid: [state.total], w: 1, h: 1 });
`;

function world(overrides?: { knobs?: Spec["knobs"]; predictions?: Spec["predictions"]; source?: string; builtin?: boolean }): Spec {
  return WorldSpec.parse({
    id: "tiny",
    version: 1,
    concept: "test",
    title: "Tiny",
    tagline: "A dot that counts.",
    archetype: "field",
    science: {
      hiddenLaw: "SECRET_LAW_VALUE",
      plainStatement: "SECRET_PLAIN_VALUE",
      misconceptions: ["gain does nothing"],
      sources: [{ title: "Notes", url: "https://example.com/notes" }],
    },
    story: { setting: "A desk.", mystery: "What moves the total?", goal: "Change the total." },
    knobs: overrides?.knobs ?? [
      { id: "gain", label: "Gain", kind: "slider", min: 0, max: 4, step: 1, default: 1 },
      { id: "boost", label: "Boost", kind: "toggle", default: false },
      { id: "label", label: "Label", kind: "text", default: "a" },
      { id: "mode", label: "Mode", kind: "choice", options: ["slow", "fast"], default: "slow" },
    ],
    observables: [{ id: "total", label: "Total" }],
    entities: [{ id: "dot", label: "Dot", artPrompt: "a dot", segmentPrompt: "dot" }],
    rules: overrides?.builtin ? { kind: "builtin", module: "not-run" } : { kind: "js", source: overrides?.source ?? SOURCE },
    predictions: overrides?.predictions ?? [
      { id: "higher", prompt: "What if gain is higher?", options: ["same", "higher"], answerKey: 1, tryWith: { gain: 4 } },
      { id: "open", prompt: "What do you expect?", answerKey: "higher" },
    ],
    transfer: { setup: "Another desk.", params: { gain: 4 }, question: "What changes?", answerKey: "the total" },
    checks: [
      { id: "grows", description: "gain adds", params: { gain: 2 }, steps: 4, seeds: [1], assert: { observable: "total", op: "gt", value: 0 } },
      { id: "still", description: "zero gain stays", params: { gain: 0 }, steps: 4, seeds: [1], assert: { observable: "total", op: "eq", value: 0 } },
    ],
    art: { style: "flat", background: "white" },
  });
}

describe("playability lint", () => {
  it("accepts a small js world whose knobs and tryWith change observables", async () => {
    const spec = world();
    const issues = await lintPlayability(compileSandboxed(spec.rules.kind === "js" ? spec.rules.source : ""), spec);
    expect(issues).toEqual([]);
  });

  it("accepts a knob when any value across its range changes an observable", async () => {
    const source = `
      exports.init = () => ({ total: 0 });
      exports.step = (state, params) => ({ total: state.total + (Number(params.gain) >= 4 ? 1 : 0) });
      exports.observe = (state) => ({ total: state.total });
    `;
    const spec = world({
      source,
      knobs: [{ id: "gain", label: "Gain", kind: "slider", min: 0, max: 4, step: 1, default: 0 }],
      predictions: [{ id: "top", prompt: "What happens at the top?", options: ["same", "jumps"], answerKey: 1, tryWith: { gain: 4 } }],
    });
    const issues = await lintPlayability(compileSandboxed(source), spec);
    expect(issues).toEqual([]);
  });

  it("flags a knob that never changes an observable and a tryWith that matches defaults", async () => {
    const spec = world({
      knobs: [
        { id: "gain", label: "Gain", kind: "slider", min: 0, max: 4, step: 1, default: 1 },
        { id: "mute", label: "Mute", kind: "toggle", default: false },
      ],
      predictions: [{ id: "same", prompt: "Leave it?", options: ["yes", "no"], answerKey: 0, tryWith: { gain: 1 } }],
    });
    const issues = await lintPlayability(compileSandboxed(SOURCE), spec);
    expect(issues.map((issue) => issue.id).sort()).toEqual(["mute", "same"]);
    expect(JSON.stringify(issues)).not.toContain("SECRET_LAW_VALUE");
    expect(JSON.stringify(issues)).not.toContain("SECRET_PLAIN_VALUE");
  });

  it("skips builtin worlds instead of failing them", async () => {
    const spec = world({ builtin: true });
    const rules = {
      init() {
        throw new Error("builtin lint should not run");
      },
      step() {
        throw new Error("builtin lint should not run");
      },
      observe() {
        throw new Error("builtin lint should not run");
      },
    };
    await expect(lintPlayability(rules, spec)).resolves.toEqual([]);
  });
});
