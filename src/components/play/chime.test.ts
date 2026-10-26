import { describe, expect, it } from "vitest";
import { CHIME } from "./chime";
import { witnessBeat } from "./witness";

describe("chime", () => {
  it("gives every stage beat a quiet pitched note", () => {
    const beats = ["vault", "halt", "orbit", "leave", "land", "bank", "ridge", "held", "moths"] as const;
    for (const beat of beats) {
      expect(witnessBeat("x")).toBeNull();
      expect(CHIME[beat].freq).toBeGreaterThan(40);
      expect(CHIME[beat].freq).toBeLessThan(2000);
      expect(CHIME[beat].ms).toBeGreaterThan(50);
      expect(CHIME[beat].ms).toBeLessThan(500);
    }
    expect(Object.keys(CHIME).sort()).toEqual([...beats].sort());
  });
});
