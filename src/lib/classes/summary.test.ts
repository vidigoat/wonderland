import { describe, expect, it } from "vitest";
import { classSummary, readClassCode } from "./summary";

describe("class results", () => {
  it("accepts a short code and nothing that looks like a name or an email", () => {
    expect(readClassCode(" Room-7B ")).toBe("room-7b");
    expect(readClassCode("ms.smith@school.org")).toBeNull();
    expect(readClassCode("a")).toBeNull();
  });

  it("tallies one class's finished plays per world, ignoring other classes", () => {
    const plays = [
      { worldId: "peppered-forest", firstCorrect: false, verdict: "discovered", transferCorrect: true, minutes: 6, classCode: "7b" },
      { worldId: "peppered-forest", firstCorrect: true, verdict: "warmer", transferCorrect: false, minutes: 4, classCode: "7b" },
      { worldId: "peppered-forest", firstCorrect: true, verdict: "discovered", transferCorrect: true, minutes: 9, classCode: "8a" },
      { worldId: "rumour-town", firstCorrect: false, verdict: "discovered", transferCorrect: true, minutes: 5, classCode: "7b" },
    ];
    expect(classSummary(plays, "7b")).toEqual([
      { worldId: "peppered-forest", finished: 2, discovered: 1, firstRight: 1, newCaseRight: 1, learned: 1, medianMinutes: 5 },
      { worldId: "rumour-town", finished: 1, discovered: 1, firstRight: 0, newCaseRight: 1, learned: 1, medianMinutes: 5 },
    ]);
  });
});
