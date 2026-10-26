import { describe, expect, it } from "vitest";
import { bindingView } from "./binding";
import type { MontageItem } from "./sse";

const sample: MontageItem[] = [
  { type: "stage", stage: "scientist", message: "The law stays ███.", notice: "Sample." },
  { type: "stage", stage: "designer", message: "Using the hand-built world." },
  { type: "stage", stage: "repair", message: "Fixing the room." },
  { type: "checks", passed: 4, total: 4 },
  { type: "world", id: "gatekeeper", title: "The Gatekeeper's Ledger", tagline: "The scribe copies.", concept: "SQL", href: "/w/gatekeeper" },
  { type: "stage", stage: "done", message: "World ready." },
];

describe("bindingView", () => {
  it("keeps one line per station and never repeats the notice", () => {
    const view = bindingView(sample);
    expect(view.notice).toBe("Sample.");
    expect(view.steps.find((step) => step.stage === "designer")?.message).toBe("Fixing the room.");
    expect(view.steps.find((step) => step.stage === "artist")?.on).toBe(false);
    expect(view.checks).toEqual({ passed: 4, total: 4 });
    expect(view.world?.title).toBe("The Gatekeeper's Ledger");
    expect(view.error).toBeNull();
    expect(JSON.stringify(view)).not.toContain("hiddenLaw");
  });
});
