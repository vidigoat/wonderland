import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runAllChecks } from "@/engine/checks";
import { compileRules } from "@/engine/rules";
import { runHeadless } from "@/engine/runtime";
import { WorldSpec } from "@/engine/spec";

function fireflies() {
  return WorldSpec.parse(JSON.parse(readFileSync("data/worlds/firefly-sync-kuramoto.json", "utf8")));
}

describe("firefly meadow readings", () => {
  it("names the swarm's own order, and does not copy the sliders onto the card", () => {
    const spec = fireflies();
    expect(spec.rules.kind).toBe("js");
    if (spec.rules.kind !== "js") return;
    expect(spec.rules.source).not.toContain("timeFactor");
    expect(spec.observables.map((item) => item.id)).toEqual(["order_parameter_r", "mean_flash_rate", "total_fireflies"]);
  });

  it("is already locking before a display ramp would have caught up, and blinks about once a cycle", async () => {
    const spec = fireflies();
    if (spec.rules.kind !== "js") throw new Error("expected js rules");
    const rules = compileRules(spec.rules.source);
    const params = Object.fromEntries(spec.knobs.map((knob) => [knob.id, knob.default]));
    const { history, final } = await runHeadless(rules, params, 2000, 1);
    // Step 200. The old ramp still held the reading near 0.18 here, while the swarm was already past 0.4.
    const early = history[20]?.order_parameter_r;
    expect(early).toBeGreaterThan(0.35);
    expect(final.order_parameter_r).toBeGreaterThan(0.7);
    expect(final.mean_flash_rate).toBeGreaterThan(0.12);
    expect(final.mean_flash_rate).toBeLessThan(0.2);
    expect(final.total_fireflies).toBe(100);
    const failed = (await runAllChecks(rules, spec)).filter((result) => !result.passed);
    expect(failed).toEqual([]);
  });
});
