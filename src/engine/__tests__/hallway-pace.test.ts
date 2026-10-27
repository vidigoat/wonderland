import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runAllChecks } from "@/engine/checks";
import { compileRules } from "@/engine/rules";
import { createRng } from "@/engine/rng";
import { WorldSpec } from "@/engine/spec";

function hallway() {
  return WorldSpec.parse(JSON.parse(readFileSync("data/worlds/hallway-lanes.json", "utf8")));
}

describe("hallway pace", () => {
  it("faces the two crowds opposite ways and walks at the pace they actually manage", async () => {
    const spec = hallway();
    if (spec.rules.kind !== "js") throw new Error("expected js rules");
    expect(spec.rules.source).not.toContain("headOnCollisionRate*0.6");
    const rules = compileRules(spec.rules.source);
    const params = Object.fromEntries(spec.knobs.map((knob) => [knob.id, knob.default]));
    const state = await rules.init(params, createRng(1));
    const view = rules.view?.(state, params) as { bodies: { id: string; vx?: number }[] } | undefined;
    const bodies = view?.bodies ?? [];
    expect(bodies.some((body) => body.id.startsWith("eastWalker") && body.vx === 1)).toBe(true);
    expect(bodies.some((body) => body.id.startsWith("westWalker") && body.vx === -1)).toBe(true);
    const failed = (await runAllChecks(rules, spec)).filter((result) => !result.passed);
    expect(failed).toEqual([]);
  });
});
