import { describe, expect, it } from "vitest";
import { runAllChecks } from "@/engine/checks";
import { loadRules } from "@/engine/load";
import { WorldSpec } from "@/engine/spec";
import { heroWorlds } from "@/worlds";

describe.each(heroWorlds.map((w) => [w.id, w] as const))("hero world %s", (_id, spec) => {
  it("is a valid WorldSpec", () => {
    expect(() => WorldSpec.parse(spec)).not.toThrow();
  });

  it("passes every science check", async () => {
    const results = await runAllChecks(loadRules(spec), spec);
    const failed = results.filter((r) => !r.passed);
    expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
  });
});
