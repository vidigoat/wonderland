import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createRng } from "@/engine/rng";
import type { WorldSpec } from "@/engine/spec";
import { loadJsRules, loadRules } from "@/engine/load";
import { compileSandboxed, SANDBOX_TIMEOUT_MS } from "@/engine/sandbox.server";

const VALID = `
exports.init = (params, rng) => ({
  n: 0,
  roll: rng.int(0, 2),
  host: [typeof process, typeof require, typeof fetch, typeof global].join(","),
});
exports.step = (state) => ({ ...state, n: state.n + 1 });
exports.observe = (state) => ({ n: state.n, roll: state.roll, host: state.host });
exports.view = (state) => ({ kind: "field", grid: [state.n], w: 1, h: 1 });
`;

describe("sandbox", () => {
  it("runs a tiny valid source with rng and without host globals", async () => {
    const rules = compileSandboxed(VALID);
    const rng = createRng(1);
    const state = await rules.init({}, rng);
    const stepped = await rules.step(state, {}, rng);
    const observed = rules.observe(stepped, {});
    expect(observed.n).toBe(1);
    expect(observed.roll === 0 || observed.roll === 1).toBe(true);
    expect(observed.host).toBe("undefined,undefined,undefined,undefined");
    expect(rules.view?.(stepped, {})).toEqual({ kind: "field", grid: [1], w: 1, h: 1 });
    expect(SANDBOX_TIMEOUT_MS).toBe(1000);
  });

  it("throws when rules call Math.random", async () => {
    const rules = compileSandboxed(`
      exports.init = () => ({ n: Math.random() });
      exports.step = (state) => state;
      exports.observe = (state) => ({ n: state.n });
    `);
    expect(() => rules.init({}, createRng(1))).toThrow(/Math\.random|rng/);
  });

  it("times out a step that loops forever", () => {
    const rules = compileSandboxed(
      `
      exports.init = () => ({ n: 0 });
      exports.step = () => { while (true) {} };
      exports.observe = (state) => ({ n: state.n });
    `,
      { timeoutMs: 100 },
    );
    expect(() => rules.step({ n: 0 }, {}, createRng(1))).toThrow(/timed out/i);
  });

  it("sends js rules through the sandbox and leaves builtin loading synchronous", async () => {
    const source = readFileSync(new URL("../load.ts", import.meta.url), "utf8");
    expect(source).toContain('import("./sandbox.server")');
    expect(source).not.toContain("compileRules");

    const jsSpec = {
      rules: { kind: "js", source: VALID },
    } as WorldSpec;
    expect(() => loadRules(jsSpec)).toThrow(/loadJsRules/);

    const rules = await loadJsRules(jsSpec);
    const observed = rules.observe(await rules.step(await rules.init({}, createRng(2)), {}, createRng(2)), {});
    expect(observed.n).toBe(1);
    expect(observed.host).toBe("undefined,undefined,undefined,undefined");
  });

  it("rejects Math.random when the source is loaded as js rules", async () => {
    const rules = await loadJsRules({
      rules: {
        kind: "js",
        source: `
          exports.init = () => ({ n: 0 });
          exports.step = (state) => ({ n: Math.random() });
          exports.observe = (state) => ({ n: state.n });
        `,
      },
    } as WorldSpec);
    expect(() => rules.step({ n: 0 }, {}, createRng(1))).toThrow(/Math\.random|rng/);
  });
});
