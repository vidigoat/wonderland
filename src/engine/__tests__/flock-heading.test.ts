import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileRules } from "@/engine/rules";
import { createRng } from "@/engine/rng";
import { WorldSpec } from "@/engine/spec";

describe("murmuration headings", () => {
  it("points each starling along the way it is flying", async () => {
    const spec = WorldSpec.parse(JSON.parse(readFileSync("data/worlds/murmuration-sky.json", "utf8")));
    if (spec.rules.kind !== "js") throw new Error("expected js rules");
    const rules = compileRules(spec.rules.source);
    const params = Object.fromEntries(spec.knobs.map((knob) => [knob.id, knob.default]));
    const state = (await rules.init(params, createRng(1))) as { vxs: number[]; vys: number[] };
    const view = rules.view?.(state, params) as { agents: { heading?: number; tint: number; sprite: string }[] };
    expect(view.agents.length).toBeGreaterThan(10);
    expect(view.agents.every((agent) => agent.sprite === "starling" && agent.tint === view.agents[0]?.tint)).toBe(true);
    view.agents.forEach((agent, index) => {
      expect(agent.heading).toBeCloseTo(Math.atan2(state.vys[index]!, state.vxs[index]!));
    });
  });
});
