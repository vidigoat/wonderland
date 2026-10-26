import { describe, expect, it } from "vitest";
import { toClientPipelineEvent } from "@/engine/client-event";
import { toPublic } from "@/engine/spec";
import { heroWorlds } from "@/worlds";

describe("public worlds", () => {
  it.each(heroWorlds.map((w) => [w.id, w] as const))("%s hides the law, the answers, and the checks", (_id, spec) => {
    const pub = toPublic(spec);
    const blob = JSON.stringify(pub);
    expect(blob).not.toContain(spec.science.hiddenLaw);
    expect(blob).not.toContain("answerKey");
    expect(blob).not.toContain("hiddenLaw");
    expect("checks" in pub).toBe(false);
    expect("science" in pub).toBe(false);
    if (typeof spec.transfer.answerKey === "string") expect(blob).not.toContain(spec.transfer.answerKey);
    const event = toClientPipelineEvent({ type: "world", spec, source: "sample", notice: "sample" });
    expect(event.type).toBe("world");
    if (event.type === "world") expect(JSON.stringify(event.spec)).toBe(blob);
  });

  it("refuses to stream a story that repeats the hidden law", () => {
    const spec = structuredClone(heroWorlds[0]);
    spec.story.mystery = spec.science.hiddenLaw;
    expect(() => toClientPipelineEvent({ type: "world", spec })).toThrow(/hidden law/);
  });

  it("sends check marks without measured details", () => {
    const event = toClientPipelineEvent({
      type: "checks",
      results: [{ id: "dense-crosses", description: "secret outcome", passed: true, detail: "yes == yes" }],
      source: "sample",
    });
    expect(event).toEqual({
      type: "checks",
      results: [{ id: "dense-crosses", passed: true }],
      passed: 1,
      total: 1,
      source: "sample",
      notice: undefined,
    });
  });

  it("scrubs messages that name hidden fields", () => {
    const event = toClientPipelineEvent({ type: "error", message: "bad hiddenLaw: the whole mechanism" });
    expect(event).toMatchObject({ type: "error", message: "That detail stays on the server." });
  });
});
