import { describe, expect, it } from "vitest";
import type { PublicWorldSpec } from "@/engine/spec";
import { changedParams, movedLabel, shotCaption } from "./capture";

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
});
