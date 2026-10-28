import { describe, expect, it } from "vitest";
import type { PublicWorldSpec } from "@/engine/spec";
import { candidateChanges, changedParams, countLines, movedLabel, readingDistance, shotCaption } from "./capture";

const spec = {
  knobs: [
    { id: "wind", label: "Wind", kind: "slider", min: 0, max: 8, step: 1, default: 2 },
    { id: "strip", label: "Strip", kind: "toggle", default: false },
  ],
} as Pick<PublicWorldSpec, "knobs">;

describe("playtest shots", () => {
  it("moves the first slider to the far end, and back if it is already there", () => {
    expect(changedParams(spec, { wind: 2, strip: false })).toEqual({ wind: 8, strip: false });
    expect(changedParams(spec, { wind: 8, strip: true })).toEqual({ wind: 0, strip: true });
  });

  it("names the moment without describing the law", () => {
    expect(shotCaption("Starting controls", 0)).toBe("Starting controls, just started");
    expect(shotCaption("One control moved", 2)).toBe("One control moved, at the end");
  });

  it("says which control moved, so the watcher knows what to expect", () => {
    expect(movedLabel(spec, { wind: 2, strip: false }, { wind: 8, strip: false })).toBe("Wind moved from 2 to 8");
    expect(movedLabel(spec, { wind: 2 }, { wind: 2 })).toBe("One control moved");
  });

  it("tries each control's far ends and flips each toggle", () => {
    expect(candidateChanges(spec, { wind: 2, strip: false })).toEqual([
      { wind: 0, strip: false },
      { wind: 8, strip: false },
      { wind: 2, strip: true },
    ]);
  });

  it("measures how far two runs ended apart, ignoring words", () => {
    expect(readingDistance({ a: 10, b: "x" }, { a: 10, b: "y" })).toBe(0);
    expect(readingDistance({ a: 10 }, { a: 5 })).toBeCloseTo(0.5);
  });

  it("reports SAM's count from the end of the starting run only", () => {
    const lines = countLines([
      { label: "Hare", caption: "Starting controls, at the end", drawn: 45, seen: 41 },
      { label: "Hare", caption: "Wind moved, at the end", drawn: 30, seen: 28 },
    ]);
    expect(lines).toEqual(["SAM 3.1 counted 41 in the picture where the stage drew 45 (hare)."]);
  });
});
