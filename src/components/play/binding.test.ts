import { describe, expect, it } from "vitest";
import { bindingView } from "./binding";
import type { MontageItem } from "./sse";

const sample: MontageItem[] = [
  { type: "stage", stage: "scientist", message: "The law stays ███.", notice: "Sample." },
  { type: "stage", stage: "designer", message: "Using the hand-built world." },
  { type: "stage", stage: "repair", message: "Fixing the room." },
  { type: "checks", passed: 4, total: 4 },
  { type: "world", id: "gatekeeper", title: "The Gatekeeper's Ledger", tagline: "The scribe copies.", concept: "SQL", href: "/w/gatekeeper", playable: null },
  { type: "art", background: "/art/gatekeeper/background.webp" },
  { type: "art", sprite: { id: "scribe", url: "/art/gatekeeper/scribe.webp" } },
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
    expect(view.art.background).toBe("/art/gatekeeper/background.webp");
    expect(view.art.sprites.map((sprite) => sprite.id)).toEqual(["scribe"]);
    expect(view.error).toBeNull();
    expect(JSON.stringify(view)).not.toContain("hiddenLaw");
  });

  it("closes every station when the result is a choice of worlds", () => {
    const view = bindingView([
      { type: "stage", stage: "scientist", message: "The law is not shown." },
      { type: "choose", message: "Choose one of the five.", worlds: [], notice: "Sample." },
    ]);
    expect(view.choose?.message).toBe("Choose one of the five.");
    expect(view.steps.every((step) => step.on)).toBe(true);
    expect(view.steps.find((step) => step.stage === "checker")?.message).toBe("No checks were run.");
    expect(view.steps.find((step) => step.stage === "done")?.message).toBe("No new world was made.");
    expect(view.world).toBeNull();
  });
});
