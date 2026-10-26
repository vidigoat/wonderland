import { describe, expect, it } from "vitest";
import { gradeAnswer } from "@/engine/grade";
import { heroWorlds } from "@/worlds";

describe("gradeAnswer", () => {
  it("scores a prediction without returning the key", () => {
    const spec = heroWorlds.find((world) => world.id === "gatekeeper");
    if (!spec) throw new Error("missing gatekeeper");
    const right = gradeAnswer(spec, { kind: "prediction", predictionId: "apostrophe", choice: 1 });
    const wrong = gradeAnswer(spec, { kind: "prediction", predictionId: "apostrophe", choice: 0 });
    expect(right).toEqual({ correct: true });
    expect(wrong).toEqual({ correct: false });
    expect(Object.keys(right)).toEqual(["correct"]);
  });

  it("scores a written transfer answer without echoing it", () => {
    const spec = heroWorlds.find((world) => world.id === "firebreak");
    if (!spec) throw new Error("missing firebreak");
    const key = String(spec.transfer.answerKey);
    const result = gradeAnswer(spec, { kind: "transfer", statement: "Leave an unbroken empty gap wider than the fire can jump." });
    expect(result.correct).toBe(true);
    expect(JSON.stringify(result)).not.toContain(key);
    const miss = gradeAnswer(spec, { kind: "transfer", statement: "Use more water." });
    expect(miss.correct).toBe(false);
  });
});
