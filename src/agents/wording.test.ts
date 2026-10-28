import { describe, expect, it } from "vitest";
import { capitalFirst, sentenceLabel } from "./wording";

describe("control wording", () => {
  it("puts a label in sentence case and drops a bracketed unit", () => {
    expect(sentenceLabel("Wind Speed (m/s)")).toBe("Wind speed");
    expect(sentenceLabel("how grains cling together")).toBe("How grains cling together");
  });

  it("leaves acronyms alone", () => {
    expect(sentenceLabel("Amount of CO2")).toBe("Amount of CO2");
  });

  it("starts a hint with a capital", () => {
    expect(capitalFirst("how hard the wind blows.")).toBe("How hard the wind blows.");
  });
});
