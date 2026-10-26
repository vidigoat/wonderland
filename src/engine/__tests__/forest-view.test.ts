import { describe, expect, it } from "vitest";
import { createRng } from "@/engine/rng";
import { pepperedForest } from "@/worlds/peppered-forest/rules";

describe("peppered forest view", () => {
  it("shows a hunter only while birds are present", async () => {
    const params = { birds: true, startDarkness: 0.2, barkDarkness: 0.2, predation: 0.6, mutation: 0.05 };
    const state = await pepperedForest.init(params, createRng(1));
    const hunting = pepperedForest.view?.(state, params) as { agents: { sprite: string }[] };
    const quiet = pepperedForest.view?.(state, { ...params, birds: false }) as { agents: { sprite: string }[] };
    expect(hunting.agents.some((agent) => agent.sprite === "bird")).toBe(true);
    expect(quiet.agents.some((agent) => agent.sprite === "bird")).toBe(false);
    expect(quiet.agents.every((agent) => agent.sprite === "moth")).toBe(true);
  });
});
