import { describe, expect, it } from "vitest";
import { scrollDelta } from "./reveal";

describe("bringing a control into the notebook", () => {
  it("leaves a control that is already on the page", () => {
    expect(scrollDelta(40, 80, 0, 200)).toBe(0);
  });

  it("moves down just enough to show a control clipped by the fold", () => {
    expect(scrollDelta(180, 230, 0, 200)).toBe(42);
  });

  it("moves up when the control is above the page", () => {
    expect(scrollDelta(-40, 10, 0, 200)).toBe(-52);
  });
});
