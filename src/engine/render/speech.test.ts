import { describe, expect, it } from "vitest";
import { spokenIds } from "./helpers";

describe("spoken lines", () => {
  it("keeps a spread of speakers and drops the ones standing on each other", () => {
    const agents = [
      { id: 1, x: 0.1, bubble: "Getting my money out!" },
      { id: 2, x: 0.12, bubble: "Getting my money out!" },
      { id: 3, x: 0.4, bubble: "People are queuing…" },
      { id: 4, x: 0.7, bubble: "Getting my money out!" },
      { id: 5, x: 0.72, bubble: "Getting my money out!" },
      { id: 6, x: 0.9, bubble: null },
    ];
    expect([...spokenIds(agents)]).toEqual(["1", "3", "4"]);
  });

  it("stops after a handful even when the square is wide", () => {
    const agents = Array.from({ length: 12 }, (_, index) => ({
      id: index,
      x: index / 12,
      bubble: "Getting my money out!",
    }));
    expect(spokenIds(agents).size).toBe(6);
  });

  it("keeps two lines when the speakers are stacked in the square", () => {
    const agents = [
      { id: "near", x: 0.4, y: 0.62, bubble: "Getting my money out!" },
      { id: "close", x: 0.45, y: 0.66, bubble: "Getting my money out!" },
      { id: "far", x: 0.42, y: 0.95, bubble: "People are queuing…" },
    ];
    expect([...spokenIds(agents)]).toEqual(["near", "far"]);
  });
});
