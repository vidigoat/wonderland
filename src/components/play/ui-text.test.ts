import { describe, expect, it } from "vitest";
import { genericRunVerb, UI_TEXT, worldLanguage } from "./ui-text";

describe("the frame's language", () => {
  it("frames a world asked in Hindi in Hindi, and everything else in English", () => {
    expect(worldLanguage({ title: "जमी हुई झील", concept: "पानी में बर्फ़ क्यों तैरती है?" })).toBe("hi");
    expect(worldLanguage({ title: "Frozen Harbor", concept: "Why does ice float on water?" })).toBe("en");
  });

  it("has every English phrase in Hindi too", () => {
    const en = UI_TEXT.en;
    const hi = UI_TEXT.hi;
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(hi.card).sort()).toEqual(Object.keys(en.card).sort());
    expect(hi.steps).toHaveLength(en.steps.length);
    expect(hi.mission).toHaveLength(en.mission.length);
    for (const [key, value] of Object.entries(hi)) {
      if (typeof value === "string" && key !== "lang") expect(value, key).not.toBe((en as Record<string, unknown>)[key]);
    }
  });

  it("never fires a cannon at a lake", () => {
    expect(genericRunVerb(UI_TEXT.hi, "bodies")).toBe(UI_TEXT.hi.runTime);
    expect(genericRunVerb(UI_TEXT.hi, "pipeline")).toBe(UI_TEXT.hi.runThrough);
  });
});
