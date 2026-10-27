import { describe, expect, it } from "vitest";
import { createRng } from "@/engine/rng";
import { rumourTown } from "@/worlds/rumour-town/rules";

describe("rumour town view", () => {
  it("boards the doors only after the run empties the cash", async () => {
    const openParams = { rumourSeeds: 3, reserveRatio: 0.1, insurance: true };
    let open = await rumourTown.init(openParams, createRng(2));
    for (let step = 0; step < 30; step++) open = await rumourTown.step(open, openParams, createRng(2 + step));
    expect(rumourTown.view?.(open, openParams)).toMatchObject({ kind: "population", doors: "open" });

    const runParams = { rumourSeeds: 3, reserveRatio: 0.1, insurance: false };
    let run = await rumourTown.init(runParams, createRng(2));
    for (let step = 0; step < 30; step++) run = await rumourTown.step(run, runParams, createRng(2 + step));
    expect(run.failed).toBe(true);
    expect(rumourTown.view?.(run, runParams)).toMatchObject({ kind: "population", doors: "shut" });
  });
});
