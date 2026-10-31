import { describe, expect, it } from "vitest";
import { subjectOf } from "./subjects";

describe("gallery shelves", () => {
  it("files known worlds by id and new ones by their question", () => {
    expect(subjectOf("peppered-forest", "")).toBe("Life science");
    expect(subjectOf("new-1", "Why do bees dance?")).toBe("Life science");
    expect(subjectOf("new-2", "Why do volcanoes erupt?")).toBe("Earth and space");
    expect(subjectOf("new-3", "Why do prices rise in a shortage?")).toBe("People and systems");
    expect(subjectOf("new-4", "Why does a candle go out under a jar?")).toBe("Physical science");
  });
});
