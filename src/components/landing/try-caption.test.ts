import { describe, expect, it } from "vitest";
import { heldCaption, runStopped } from "./try-caption";

describe("the thirty-second bank", () => {
  it("names a vault that lasted while people were still taking money", () => {
    expect(runStopped(0)).toBe(true);
    expect(runStopped(0.02)).toBe(true);
    expect(runStopped(0.425)).toBe(false);
    expect(heldCaption(0)).toBe("Twelve days later, the bank is still open.");
    expect(heldCaption(0.425)).toBe("43% took their money out. The doors stayed open.");
  });
});
