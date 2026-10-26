import { describe, expect, it } from "vitest";
import { createRng } from "@/engine/rng";
import { rumourTown } from "@/worlds/rumour-town/rules";

describe("rumour town brains", () => {
  it("applies one round of supplied decisions and ignores a bad payload", async () => {
    const params = { reserveRatio: 0.5, rumourSeeds: 0, insurance: false, queueVisible: true };
    const state = await rumourTown.init(params, createRng(1));
    const decisions = state.citizens.map((citizen) => ({
      id: citizen.id,
      worried: 0.2,
      withdraw: citizen.id === 3,
      says: citizen.id === 3 ? "I'm taking mine" : null,
    }));
    const heard = await rumourTown.step(state, { ...params, citizenDecisions: JSON.stringify(decisions) }, createRng(9));
    expect(heard.citizens[3]?.withdrawn).toBe(true);
    expect(heard.citizens[3]?.says).toBe("I'm taking mine");
    expect(heard.citizens.filter((citizen) => citizen.withdrawn)).toHaveLength(1);
    expect(heard.cash).toBeCloseTo(state.cash - 1);

    const plain = await rumourTown.step(state, params, createRng(4));
    const broken = await rumourTown.step(state, { ...params, citizenDecisions: "{no" }, createRng(4));
    expect(broken.citizens.map((citizen) => citizen.withdrawn)).toEqual(plain.citizens.map((citizen) => citizen.withdrawn));
    expect(broken.cash).toBe(plain.cash);
  });
});
